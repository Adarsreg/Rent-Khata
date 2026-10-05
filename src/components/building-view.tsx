import { View } from 'react-native';

import type { FloorRow } from '@/hooks/use-building-month';

import { Text } from './text';
import { UnitTile } from './unit-tile';

/**
 * The 2D building elevation.
 *
 * Plain flexbox Views — no SVG, no Skia, no canvas. A building is rows of
 * boxes, which is precisely what flexbox already draws, and staying in the
 * view tree means each unit keeps real accessibility labels and hit targets
 * that a canvas would throw away.
 *
 * Floors render top-down (highest level first) so floor 1 sits at the bottom,
 * the way an elevation drawing reads.
 */
export function BuildingView({
  floors,
  onPressUnit,
}: {
  floors: FloorRow[];
  onPressUnit: (unitId: string) => void;
}) {
  const descending = [...floors].reverse();

  // Widest floor sets the column count, so narrower floors leave a gap on the
  // right rather than stretching — the silhouette then matches the real
  // building instead of squaring itself off.
  const columns = Math.max(1, ...floors.map((f) => f.cells.length));

  let tileIndex = 0;

  return (
    <View className="gap-2">
      {descending.map((row) => {
        const cells = row.cells;
        const filler = columns - cells.length;

        return (
          <View key={row.floor.id} className="flex-row items-stretch gap-2">
            <View className="w-7 items-center justify-center">
              <Text variant="caption" tone="tertiary" numeric className="font-semibold">
                {row.floor.level}
              </Text>
            </View>

            <View className="flex-1 flex-row gap-2">
              {cells.map((cell) => (
                <UnitTile
                  key={cell.unit.id}
                  cell={cell}
                  index={tileIndex++}
                  onPress={() => onPressUnit(cell.unit.id)}
                />
              ))}
              {/* Keeps tile widths equal across floors with differing counts. */}
              {Array.from({ length: filler }, (_, i) => (
                <View key={`filler-${i}`} className="flex-1" />
              ))}
            </View>
          </View>
        );
      })}

      <View className="mt-1 flex-row items-center gap-2">
        <View className="w-7" />
        <View className="h-1 flex-1 rounded-full bg-border-strong" />
      </View>
    </View>
  );
}
