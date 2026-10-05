import type { Building, BuildingType, Unit } from '@/db/schema';

/**
 * Rules about units that involve no storage.
 *
 * These lived in `db/repo/building.ts`, which meant a screen had to import
 * from the persistence layer just to name a flat. Naming conventions and rate
 * resolution are domain rules, so they belong here — the repos are now only
 * about reading and writing rows.
 */

/** `'Flat 203'`, `'Room 3'`, `'Shop 2'` — vocabulary follows the building type. */
export function unitLabelFor(
  type: BuildingType,
  level: number,
  position: number,
  totalFloors: number
): string {
  const ordinal = position + 1;

  switch (type) {
    case 'pg':
      return `Room ${ordinal}`;
    case 'independent':
      return totalFloors > 1 ? `Floor ${level} · ${ordinal}` : `Unit ${ordinal}`;
    case 'mixed':
      // Ground floor of a mixed building is shops; flats start above it.
      return level === 1 ? `Shop ${ordinal}` : apartmentNumber(level, ordinal);
    case 'apartment':
      return apartmentNumber(level, ordinal);
  }
}

/** Indian convention: floor number then a two-digit unit, e.g. 2 + 3 -> '203'. */
function apartmentNumber(level: number, ordinal: number): string {
  return `${level}${String(ordinal).padStart(2, '0')}`;
}

/**
 * The rent and rate actually in force for a unit: its own override, else the
 * building default. Resolve through these before writing a bill, so the
 * figure gets snapshot onto the bill row rather than read through later.
 */
export function effectiveRentPaise(unit: Unit, building: Building): number {
  return unit.rentPaise ?? building.defaultRentPaise;
}

export function effectiveRatePaise(unit: Unit, building: Building): number {
  return unit.ratePaisePerUnit ?? building.ratePaisePerUnit;
}
