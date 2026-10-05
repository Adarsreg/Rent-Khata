import { and, asc, eq, isNull } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

import { resolveUnitLabel } from '@/domain/unit-labels';

import { getDb, notifyChange, nowMs } from '../client';
import { building, floor, unit, type Building } from '../schema';
import type { BuildingPatch, FloorWithUnits, NewBuilding } from './types';

/**
 * The app manages one building, so its row has a fixed id. Keeping a real id
 * column rather than assuming a singleton everywhere means supporting several
 * buildings later is a UI change, not a schema migration.
 */
export const BUILDING_ID = 'building-main';

export async function getBuilding(): Promise<Building | null> {
  const rows = await getDb()
    .select()
    .from(building)
    .where(and(eq(building.id, BUILDING_ID), isNull(building.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Writes the whole structure the setup wizard collected, in one transaction.
 * A half-created building — floors but no units — would leave the home screen
 * in a state no screen knows how to render.
 */
export async function createBuilding(input: NewBuilding): Promise<void> {
  const timestamp = nowMs();
  const name = input.name.trim();

  await getDb().transaction(async (tx) => {
    await tx
      .insert(building)
      .values({
        id: BUILDING_ID,
        name,
        type: input.type,
        defaultRentPaise: input.defaultRentPaise,
        ratePaisePerUnit: input.ratePaisePerUnit,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      // Re-running setup replaces the building rather than failing.
      .onConflictDoUpdate({
        target: building.id,
        set: {
          name,
          type: input.type,
          defaultRentPaise: input.defaultRentPaise,
          ratePaisePerUnit: input.ratePaisePerUnit,
          updatedAt: timestamp,
          deletedAt: null,
        },
      });

    for (const plan of input.floors) {
      const floorId = Crypto.randomUUID();

      await tx.insert(floor).values({
        id: floorId,
        buildingId: BUILDING_ID,
        level: plan.level,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      for (let position = 0; position < plan.unitCount; position++) {
        await tx.insert(unit).values({
          id: Crypto.randomUUID(),
          floorId,
          label: resolveUnitLabel(plan, position, input.type, input.floors.length),
          position,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }
  });

  notifyChange();
}

export async function updateBuilding(patch: BuildingPatch): Promise<void> {
  await getDb()
    .update(building)
    .set({ ...patch, updatedAt: nowMs() })
    .where(eq(building.id, BUILDING_ID));

  notifyChange();
}

/**
 * The building's floors with their units, ground floor first. The home screen
 * reverses this so floor 1 sits at the bottom, the way an elevation reads.
 */
export async function getStructure(): Promise<FloorWithUnits[]> {
  const db = getDb();

  const floors = await db
    .select()
    .from(floor)
    .where(and(eq(floor.buildingId, BUILDING_ID), isNull(floor.deletedAt)))
    .orderBy(asc(floor.level));

  const units = await db
    .select()
    .from(unit)
    .where(isNull(unit.deletedAt))
    .orderBy(asc(unit.position));

  return floors.map((f) => ({ ...f, units: units.filter((u) => u.floorId === f.id) }));
}
