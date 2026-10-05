import { getBuilding, getStructure } from '@/db/repo/building';
import type { FloorWithUnits } from '@/db/repo/types';
import { listBillsForPeriod } from '@/db/repo/bills';
import { summarise, type PeriodTotals } from '@/domain/bill';
import { useQuery } from '@/db/use-query';
import { deriveStatus, type BillStatus } from '@/domain/status';
import type { Bill, Building, Unit } from '@/db/schema';
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
  unitCount: number;
};

/**
 * One read for everything the home screen needs: structure, this month's
 * bills, and each unit's derived status. Re-runs automatically on any write
 * via the SQLite change feed.
 */
export function useBuildingMonth(period: Period) {
  return useQuery<BuildingMonth>(async () => {
    const [building, structure, bills] = await Promise.all([
      getBuilding(),
      getStructure(),
      listBillsForPeriod(period),
    ]);

    const byUnit = new Map(bills.map((b) => [b.unitId, b]));

    const floors: FloorRow[] = structure.map((floor) => ({
      floor,
      cells: floor.units.map((unit) => {
        const bill = byUnit.get(unit.id) ?? null;
        return { unit, bill, status: deriveStatus(bill, period) };
      }),
    }));

    return {
      building,
      floors,
      totals: summarise(bills),
      unitCount: floors.reduce((n, f) => n + f.cells.length, 0),
    };
  }, [period]);
}
