import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatPeriod, isFuturePeriod, nextPeriod, prevPeriod, type Period } from '@/lib/period';
import { useColors } from '@/theme/tokens';

import { PressableScale } from './pressable-scale';
import { Surface } from './surface';
import { Text } from './text';

/**
 * Pinned glass header carrying the month and its headline numbers. Pass this
 * to `GlassScreen`'s `overlay` slot — it positions itself absolutely.
 */
export function MonthHeader({
  period,
  onChangePeriod,
  primary,
  secondary,
  onHeight,
}: {
  period: Period;
  onChangePeriod: (next: Period) => void;
  /** Headline figure, e.g. the month's billed total. */
  primary?: string;
  /** Supporting line, e.g. "11 units · 3 unpaid". */
  secondary?: string;
  /** Measured height, so the screen below can pad its scroll view to match. */
  onHeight?: (height: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const canGoForward = !isFuturePeriod(nextPeriod(period));

  return (
    <Surface
      onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
      className="absolute inset-x-0 top-0 overflow-hidden rounded-b-xl border-b border-border"
      style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center justify-between px-4 pb-4">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text variant="kicker">{formatPeriod(period)}</Text>
          </View>
          {primary ? (
            <Text variant="display" numeric className="mt-0.5">
              {primary}
            </Text>
          ) : null}
          {secondary ? (
            <Text variant="caption" tone="secondary">
              {secondary}
            </Text>
          ) : null}
        </View>

        <View className="flex-row items-center gap-1">
          <PressableScale
            accessibilityLabel="Previous month"
            scaleTo={0.9}
            haptic="light"
            onPress={() => onChangePeriod(prevPeriod(period))}
            className="h-12 w-12 items-center justify-center rounded-full border border-border bg-surface2">
            <Feather name="chevron-left" size={18} color={colors.text} />
          </PressableScale>
          <PressableScale
            accessibilityLabel="Next month"
            disabled={!canGoForward}
            scaleTo={0.9}
            haptic="light"
            onPress={() => canGoForward && onChangePeriod(nextPeriod(period))}
            className={`h-12 w-12 items-center justify-center rounded-full border border-border bg-surface2 ${
              canGoForward ? '' : 'opacity-30'
            }`}>
            <Feather name="chevron-right" size={18} color={colors.text} />
          </PressableScale>
        </View>
      </View>
    </Surface>
  );
}
