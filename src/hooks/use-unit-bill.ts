import { getBuilding } from '@/db/repo/building';
import { getBill, resolvePrevReading, typicalUnits } from '@/db/repo/bills';
import { getUnit } from '@/db/repo/units';
import { effectiveRatePaise, effectiveRentPaise } from '@/domain/units';
import { useQuery } from '@/db/use-query';
import type { Bill, Building, Unit } from '@/db/schema';
import { deriveStatus, type BillStatus } from '@/domain/status';
import type { Period } from '@/lib/period';

export type UnitBillData = {
  unit: Unit;
  building: Building;
  bill: Bill | null;
  status: BillStatus;
  /**
   * Resolved previous reading. Comes from the last earlier bill, falling back
   * to the unit's one-time opening reading. Null means this unit has never
   * had an opening reading entered — the UI must ask for it once.
   */
  prevReading: number | null;
  /** Whether prevReading came from history (locked) vs needs first entry. */
  prevReadingIsDerived: boolean;
  /** Rent/rate in force now — snapshot onto the bill when saved. */
  rentPaise: number;
  ratePaisePerUnit: number;
  /** Median recent consumption, for the spike warning. */
  typical: number | null;
};

export function useUnitBill(unitId: string, period: Period) {
  return useQuery<UnitBillData | null>(async () => {
    const [unit, building] = await Promise.all([getUnit(unitId), getBuilding()]);
    if (!unit || !building) return null;

    const [bill, prevReading, typical] = await Promise.all([
      getBill(unitId, period),
      resolvePrevReading(unitId, period, unit.openingReading),
      typicalUnits(unitId, period),
    ]);

    return {
      unit,
      building,
      bill,
      status: deriveStatus(bill, period),
      // A saved bill keeps the previous reading it was created with, so
      // re-opening an old month shows what was actually billed.
      prevReading: bill?.prevReading ?? prevReading,
      prevReadingIsDerived: prevReading != null,
      rentPaise: bill?.rentPaise ?? effectiveRentPaise(unit, building),
      ratePaisePerUnit: bill?.ratePaisePerUnit ?? effectiveRatePaise(unit, building),
      typical,
    };
  }, [unitId, period]);
}
