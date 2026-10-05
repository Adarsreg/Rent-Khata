import { and, eq, isNull } from 'drizzle-orm';

import { getDb, notifyChange, nowMs } from '../client';
import { unit, type Unit } from '../schema';
import type { UnitPatch } from './types';

export async function getUnit(id: string): Promise<Unit | null> {
  const rows = await getDb()
    .select()
    .from(unit)
    .where(and(eq(unit.id, id), isNull(unit.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateUnit(id: string, patch: UnitPatch): Promise<void> {
  await getDb()
    .update(unit)
    .set({ ...patch, updatedAt: nowMs() })
    .where(eq(unit.id, id));

  notifyChange();
}
