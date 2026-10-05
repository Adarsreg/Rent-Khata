import type { Building, Floor, Unit } from '../schema';
import type { Period } from '@/lib/period';

/**
 * The repository interface: every type crossing the storage seam.
 *
 * Kept in a platform-neutral file on purpose. The SQLite and preview
 * implementations both import from here, so neither has to import the other —
 * on web, `from './bills'` would resolve straight back to `bills.web.ts` and
 * form a cycle.
 */

/** How many units sit on one floor, as collected by the setup wizard. */
export type FloorPlan = {
  /** 1-based, ground floor first. */
  level: number;
  unitCount: number;
};

export type NewBuilding = {
  name: string;
  type: Building['type'];
  floors: FloorPlan[];
  defaultRentPaise: number;
  ratePaisePerUnit: number;
};

export type BuildingPatch = Partial<
  Pick<
    Building,
    'name' | 'type' | 'currencySymbol' | 'countryCode' | 'defaultRentPaise' | 'ratePaisePerUnit'
  >
>;

export type FloorWithUnits = Floor & { units: Unit[] };

/** Fields a user can edit on a unit. Structural fields are not among them. */
export type UnitPatch = Partial<
  Pick<
    Unit,
    | 'label'
    | 'tenantName'
    | 'tenantPhone'
    | 'rentPaise'
    | 'ratePaisePerUnit'
    | 'meterDigits'
    | 'openingReading'
  >
>;

export type SaveBillInput = {
  unitId: string;
  period: Period;
  /** Already resolved against the unit/building, and snapshot onto the row. */
  rentPaise: number;
  ratePaisePerUnit: number;
  prevReading: number | null;
  newReading: number | null;
  note?: string | null;
  photoUri?: string | null;
};
