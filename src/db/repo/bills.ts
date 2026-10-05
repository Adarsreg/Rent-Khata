import * as Crypto from 'expo-crypto';
import { and, desc, eq, isNull, isNotNull, lt } from 'drizzle-orm';

import { computeBill, medianUnits } from '@/domain/bill';
import type { Period } from '@/lib/period';

import type { SaveBillInput } from './types';

import { getDb, notifyChange, nowMs } from '../client';
import { bill, type Bill } from '../schema';

export async function getBill(unitId: string, period: Period): Promise<Bill | null> {
  const rows = await getDb()
    .select()
    .from(bill)
    .where(and(eq(bill.unitId, unitId), eq(bill.period, period), isNull(bill.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

/** Every bill in a month, for the building elevation and month totals. */
export async function listBillsForPeriod(period: Period): Promise<Bill[]> {
  return getDb()
    .select()
    .from(bill)
    .where(and(eq(bill.period, period), isNull(bill.deletedAt)));
}

/**
 * **The central rule of the app.** The previous reading is typed exactly once
 * per unit, ever.
 *
 * Resolution order:
 *  1. The most recent *earlier* bill that has a `newReading`. Deliberately
 *     "most recent earlier" rather than "last month" — owners skip months,
 *     and a gap must not reset the meter to the opening value.
 *  2. Failing that, the unit's one-time `openingReading` from setup.
 *
 * Returns null only when a unit has no opening reading yet, which is what
 * makes the UI ask for it the first time.
 */
export async function resolvePrevReading(
  unitId: string,
  period: Period,
  openingReading: number | null
): Promise<number | null> {
  const rows = await getDb()
    .select({ newReading: bill.newReading })
    .from(bill)
    .where(
      and(
        eq(bill.unitId, unitId),
        lt(bill.period, period),
        isNotNull(bill.newReading),
        isNull(bill.deletedAt)
      )
    )
    .orderBy(desc(bill.period))
    .limit(1);

  return rows[0]?.newReading ?? openingReading;
}

/** Median consumption from recent history, for the spike warning. */
export async function typicalUnits(unitId: string, period: Period): Promise<number | null> {
  const rows = await getDb()
    .select({ unitsConsumed: bill.unitsConsumed })
    .from(bill)
    .where(
      and(
        eq(bill.unitId, unitId),
        lt(bill.period, period),
        isNotNull(bill.unitsConsumed),
        isNull(bill.deletedAt)
      )
    )
    .orderBy(desc(bill.period))
    .limit(6);

  return medianUnits(rows.map((r) => r.unitsConsumed!).filter((n) => n > 0));
}

/**
 * Create-or-update the single bill for a unit-month. Totals are recomputed
 * here rather than trusted from the caller, so the stored row can never
 * disagree with the arithmetic.
 */
export async function saveBill(input: SaveBillInput): Promise<void> {
  const ts = nowMs();
  const computed = computeBill({
    rentPaise: input.rentPaise,
    ratePaisePerUnit: input.ratePaisePerUnit,
    prevReading: input.prevReading,
    newReading: input.newReading,
  });

  const values = {
    rentPaise: input.rentPaise,
    ratePaisePerUnit: input.ratePaisePerUnit,
    prevReading: input.prevReading,
    newReading: input.newReading,
    unitsConsumed: computed.unitsConsumed,
    electricityPaise: computed.electricityPaise,
    totalPaise: computed.totalPaise,
    note: input.note ?? null,
    photoUri: input.photoUri ?? null,
    updatedAt: ts,
    deletedAt: null,
  };

  await getDb()
    .insert(bill)
    .values({
      id: Crypto.randomUUID(),
      unitId: input.unitId,
      period: input.period,
      createdAt: ts,
      ...values,
    })
    // Relies on the unique (unit_id, period) index — this is what enforces
    // one bill per unit per month under concurrent saves.
    .onConflictDoUpdate({ target: [bill.unitId, bill.period], set: values });

  notifyChange();
}

export async function setPaid(unitId: string, period: Period, isPaid: boolean): Promise<void> {
  const ts = nowMs();
  await getDb()
    .update(bill)
    .set({ isPaid, paidAt: isPaid ? ts : null, updatedAt: ts })
    .where(and(eq(bill.unitId, unitId), eq(bill.period, period)));

  notifyChange();
}
