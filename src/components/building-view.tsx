import { View } from 'react-native';

import type { FloorRow } from '@/hooks/use-building-month';
import { maxUnitsPerRow, useLayout } from '@/theme/layout';

import { Text } from './text';
import { UnitTile } from './unit-tile';

/**
 * The building, drawn as an elevation.
 *
 * This is the one bold thing in the app and everything else is deliberately
 * quiet around it. A landlord thinks in floors and doors, not in a list of
 * records, so the home screen shows the building and lets them point at it.
 *
 * Plain flexbox — no SVG, no canvas. A building is rows of boxes, which is
 * what flexbox already draws, and staying in the view tree means every unit
 * keeps a real accessibility label and a real hit target that a canvas would
 * throw away.
 *
 * Floors render highest-first so floor 1 sits at the bottom, the way an
 * elevation drawing reads.
 */
export function BuildingView({
  floors,
  onPressUnit,
}: {
  floors: FloorRow[];
  onPressUnit: (unitId: string) => void;
}) {
  const { sizeClass } = useLayout();
  const descending = [...floors].reverse();

  /*
   * The widest floor sets the column count, capped at what the window can
   * show legibly. Driving it from the cap alone would render a two-unit
   * building as two quarter-width tiles beside an empty half; driving it from
   * the widest floor alone would shrink a wide building to slivers.
   *
   * Narrower floors then leave a gap on the right, so the silhouette matches
   * the real building instead of squaring itself off.
   */
  const widestFloor = Math.max(1, ...floors.map((f) => f.cells.length));
  const columns = Math.min(maxUnitsPerRow(sizeClass), widestFloor);

  return (
    <View>
      <View className="gap-2.5">
        {descending.map((row) => (
          <Floor key={row.floor.id} row={row} columns={columns} onPressUnit={onPressUnit} />
        ))}
      </View>

      <GroundLine />
    </View>
  );
}

function GroundLine() {
  return (
    <View className="mt-2.5 flex-row items-center">
      <View className="w-8" />
      <View className="h-0.5 flex-1 rounded-full bg-border-strong" />
    </View>
  );
}

function Floor({
  row,
  columns,
  onPressUnit,
}: {
  row: FloorRow;
  columns: number;
  onPressUnit: (unitId: string) => void;
}) {
  // A floor wider than the window wraps instead of shrinking every unit to an
  // illegible sliver. Short floors are padded so columns stay aligned down
  // the building rather than each floor centring its own units.
  const rows = chunk(row.cells, columns);

  return (
    <View className="flex-row items-stretch gap-2.5">
      <View className="w-8 items-center justify-center">
        <Text variant="caption" tone="tertiary" numeric weight="semibold">
          {row.floor.level}
        </Text>
      </View>

      <View className="flex-1 gap-2.5">
        {rows.map((cellsInRow, rowIndex) => (
          <View key={rowIndex} className="flex-row gap-2.5">
            {cellsInRow.map((cell) => (
              <UnitTile
                key={cell.unit.id}
                cell={cell}
                onPress={() => onPressUnit(cell.unit.id)}
              />
            ))}
            {Array.from({ length: columns - cellsInRow.length }, (_, i) => (
              <View key={`gap-${i}`} className="flex-1" />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
