import * as Crypto from 'expo-crypto';

import { computeBill, medianUnits } from '@/domain/bill';
import type { Period } from '@/lib/period';

import { notifyChange, nowMs } from '../client';
import { clone, liveRows, tables } from '../preview/store';
import type { Bill } from '../schema';
import type { SaveBillInput } from './types';

/**
 * Browser-preview counterpart of `bills.ts`. See `preview/store.ts`.
 *
 * The billing arithmetic is NOT duplicated here — `computeBill` and
 * `medianUnits` are the same pure functions the device uses, so the numbers
 * shown in a preview are the real ones.
 */

const live = () => liveRows(tables.bills);

export async function getBill(unitId: string, period: Period): Promise<Bill | null> {
  const found = tables.bills.find(
    (b) => b.unitId === unitId && b.period === period && b.deletedAt == null
  );
  return found ? clone(found) : null;
}

export async function listBillsForPeriod(period: Period): Promise<Bill[]> {
  return live().filter((b) => b.period === period);
}

export async function resolvePrevReading(
  unitId: string,
  period: Period,
  openingReading: number | null
): Promise<number | null> {
  const [mostRecentEarlier] = live()
    .filter((b) => b.unitId === unitId && b.period < period && b.newReading != null)
    .sort((a, b) => b.period.localeCompare(a.period));

  return mostRecentEarlier?.newReading ?? openingReading;
}

export async function typicalUnits(unitId: string, period: Period): Promise<number | null> {
  const recent = live()
    .filter((b) => b.unitId === unitId && b.period < period && (b.unitsConsumed ?? 0) > 0)
    .sort((a, b) => b.period.localeCompare(a.period))
    .slice(0, 6)
    .map((b) => b.unitsConsumed!);

  return medianUnits(recent);
}

export async function saveBill(input: SaveBillInput): Promise<void> {
  const timestamp = nowMs();
  const computed = computeBill(input);

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
    updatedAt: timestamp,
    deletedAt: null,
  };

  const existing = tables.bills.findIndex(
    (b) => b.unitId === input.unitId && b.period === input.period
  );

  if (existing >= 0) {
    tables.bills[existing] = { ...tables.bills[existing], ...values };
  } else {
    tables.bills.push({
      id: Crypto.randomUUID(),
      unitId: input.unitId,
      period: input.period,
      isPaid: false,
      paidAt: null,
      createdAt: timestamp,
      ...values,
    });
  }

  notifyChange();
}

export async function setPaid(unitId: string, period: Period, isPaid: boolean): Promise<void> {
  const timestamp = nowMs();
  tables.bills = tables.bills.map((b) =>
    b.unitId === unitId && b.period === period
      ? { ...b, isPaid, paidAt: isPaid ? timestamp : null, updatedAt: timestamp }
      : b
  );
  notifyChange();
}

import type * as Sqlite from './bills';
const _signatureCheck: {
  getBill: typeof Sqlite.getBill;
  listBillsForPeriod: typeof Sqlite.listBillsForPeriod;
  resolvePrevReading: typeof Sqlite.resolvePrevReading;
  typicalUnits: typeof Sqlite.typicalUnits;
  saveBill: typeof Sqlite.saveBill;
  setPaid: typeof Sqlite.setPaid;
} = { getBill, listBillsForPeriod, resolvePrevReading, typicalUnits, saveBill, setPaid };
void _signatureCheck;
