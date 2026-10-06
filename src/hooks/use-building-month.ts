import { getBuilding, getStructure } from '@/db/repo/building';
import { listBillsForPeriod } from '@/db/repo/bills';
import type { FloorWithUnits } from '@/db/repo/types';
import type { Bill, Building, Unit } from '@/db/schema';
import { useQuery } from '@/db/use-query';
import { summarise, type PeriodTotals } from '@/domain/bill';
import { deriveStatus, type BillStatus } from '@/domain/status';
import type { Period } from '@/lib/period';

export type UnitCell = {
  unit: Unit;
  bill: Bill | null;
  status: BillStatus;
};

export type FloorRow = {
  floor: FloorWithUnits;
  cells: UnitCell[];
};

export type BuildingMonth = {
  building: Building | null;
  /** Ground floor first. The elevation renders this reversed. */
  floors: FloorRow[];
  totals: PeriodTotals;
  /** Every unit, including empty ones. */
  unitCount: number;
  /**
   * Units with a tenant. This, not `unitCount`, is the denominator for
   * "everything billed": an empty flat will never produce a bill, so counting
   * it as outstanding work means the month can never read as finished.
   */
  tenantedUnitCount: number;
};

/**
 * One read for everything the home screen needs: structure, this month's
 * bills, and each unit's derived status. Re-runs automatically on any write
 * via the storage change feed.
 */
export function useBuildingMonth(period: Period) {
  return useQuery<BuildingMonth>(async () => {
    const [building, structure, bills] = await Promise.all([
      getBuilding(),
      getStructure(),
      listBillsForPeriod(period),
    ]);

    const byUnit = new Map(bills.map((bill) => [bill.unitId, bill]));

    const floors: FloorRow[] = structure.map((floor) => ({
      floor,
      cells: floor.units.map((unit) => {
        const bill = byUnit.get(unit.id) ?? null;
        return {
          unit,
          bill,
          status: deriveStatus({ hasTenant: Boolean(unit.tenantName), bill }, period),
        };
      }),
    }));

    const allCells = floors.flatMap((floor) => floor.cells);

    return {
      building,
      floors,
      totals: summarise(bills),
      unitCount: allCells.length,
      tenantedUnitCount: allCells.filter((cell) => cell.unit.tenantName).length,
    };
  }, [period]);
}
