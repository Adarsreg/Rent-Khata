import { notifyChange, nowMs } from '../client';
import { clone, tables } from '../preview/store';
import type { Unit } from '../schema';
import type { UnitPatch } from './types';

/**
 * Browser-preview counterpart of `units.ts`. See `preview/store.ts`.
 */

export async function getUnit(id: string): Promise<Unit | null> {
  const found = tables.units.find((u) => u.id === id && u.deletedAt == null);
  return found ? clone(found) : null;
}

export async function updateUnit(id: string, patch: UnitPatch): Promise<void> {
  tables.units = tables.units.map((u) =>
    u.id === id ? { ...u, ...patch, updatedAt: nowMs() } : u
  );
  notifyChange();
}

import type * as Sqlite from './units';
const _signatureCheck: {
  getUnit: typeof Sqlite.getUnit;
  updateUnit: typeof Sqlite.updateUnit;
} = { getUnit, updateUnit };
void _signatureCheck;
