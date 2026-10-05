import * as Crypto from 'expo-crypto';

import { resolveUnitLabel } from '@/domain/unit-labels';

import { notifyChange, nowMs } from '../client';
import { clone, liveRows, tables } from '../preview/store';
import type { Building } from '../schema';
import type { BuildingPatch, FloorWithUnits, NewBuilding } from './types';

/**
 * Browser-preview counterpart of `building.ts`, backed by the in-memory store.
 * Metro picks this file automatically for web. Keep the signatures identical —
 * the `satisfies` check at the bottom of the file enforces that.
 */

export const BUILDING_ID = 'building-main';

export async function getBuilding(): Promise<Building | null> {
  const found = tables.buildings.find((b) => b.id === BUILDING_ID && b.deletedAt == null);
  return found ? clone(found) : null;
}

export async function createBuilding(input: NewBuilding): Promise<void> {
  const timestamp = nowMs();

  tables.buildings = [
    {
      id: BUILDING_ID,
      name: input.name.trim(),
      type: input.type,
      currencySymbol: '₹',
      countryCode: '91',
      defaultRentPaise: input.defaultRentPaise,
      ratePaisePerUnit: input.ratePaisePerUnit,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    },
  ];
  tables.floors = [];
  tables.units = [];

  for (const plan of input.floors) {
    const floorId = Crypto.randomUUID();

    tables.floors.push({
      id: floorId,
      buildingId: BUILDING_ID,
      level: plan.level,
      label: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    });

    for (let position = 0; position < plan.unitCount; position++) {
      tables.units.push({
        id: Crypto.randomUUID(),
        floorId,
        label: resolveUnitLabel(plan, position, input.type, input.floors.length),
        position,
        tenantName: null,
        tenantPhone: null,
        rentPaise: null,
        ratePaisePerUnit: null,
        meterDigits: 5,
        openingReading: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      });
    }
  }

  notifyChange();
}

export async function updateBuilding(patch: BuildingPatch): Promise<void> {
  tables.buildings = tables.buildings.map((b) =>
    b.id === BUILDING_ID ? { ...b, ...patch, updatedAt: nowMs() } : b
  );
  notifyChange();
}

export async function getStructure(): Promise<FloorWithUnits[]> {
  const units = liveRows(tables.units);

  return liveRows(tables.floors)
    .filter((f) => f.buildingId === BUILDING_ID)
    .sort((a, b) => a.level - b.level)
    .map((f) => ({
      ...f,
      units: units.filter((u) => u.floorId === f.id).sort((a, b) => a.position - b.position),
    }));
}

// Compile-time guarantee that this preview module still matches the real one.
// Drop a function here and the web build stops typechecking rather than
// failing at runtime in the browser.
import type * as Sqlite from './building';
const _signatureCheck: {
  BUILDING_ID: typeof Sqlite.BUILDING_ID;
  getBuilding: typeof Sqlite.getBuilding;
  createBuilding: typeof Sqlite.createBuilding;
  updateBuilding: typeof Sqlite.updateBuilding;
  getStructure: typeof Sqlite.getStructure;
} = { BUILDING_ID, getBuilding, createBuilding, updateBuilding, getStructure };
void _signatureCheck;
