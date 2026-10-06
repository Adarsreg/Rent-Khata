import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatPeriod, isFuturePeriod, nextPeriod, prevPeriod, type Period } from '@/lib/period';
import { useLayout } from '@/theme/layout';
import { useColors } from '@/theme/tokens';

import { PressableScale } from './pressable-scale';
import { Surface } from './surface';
import { Text } from './text';

/** What the month adds up to, for the headline figure. */
export type MonthState =
  | { kind: 'owing'; amount: string }
  | { kind: 'collected' }
  | { kind: 'nothingBilled' };

/**
 * Pinned header: which month, and how much of it is still owed.
 *
 * The headline figure is **outstanding**, not billed. Billed is a number the
 * landlord already knows; what they opened the app to find out is how much is
 * still to come in. When nothing is owed the figure is replaced by a plain
 * sentence, because a prominent ₹0 reads as an error rather than as good news.
 *
 * Pass this to `GlassScreen`'s `overlay` slot — it positions itself.
 */
export function MonthHeader({
  period,
  onChangePeriod,
  state,
  summary,
  onHeight,
}: {
  period: Period;
  onChangePeriod: (next: Period) => void;
  /**
   * Three states, not two. A month where nothing was ever billed also has
   * zero outstanding, and collapsing that into "all collected" congratulates
   * the owner for a month they have not started.
   */
  state: MonthState;
  /** One short sentence under the figure. Never a list joined by dots. */
  summary: string;
  onHeight?: (height: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const { gutter, dashboardMaxWidth } = useLayout();
  const canGoForward = !isFuturePeriod(nextPeriod(period));

  return (
    <Surface
      onLayout={(event) => onHeight?.(event.nativeEvent.layout.height)}
      className="absolute inset-x-0 top-0 items-center border-b border-border"
      style={{ paddingTop: insets.top + 10 }}>
      <View
        style={{ width: '100%', maxWidth: dashboardMaxWidth, paddingHorizontal: gutter }}
        className="pb-4">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text variant="kicker" tone="secondary">
              {formatPeriod(period)}
            </Text>

            {state.kind === 'owing' ? (
              <Text variant="display" numeric className="mt-1">
                {state.amount}
              </Text>
            ) : state.kind === 'collected' ? (
              <Text variant="title" tone="paid" className="mt-1">
                All collected
              </Text>
            ) : (
              <Text variant="title" tone="secondary" className="mt-1">
                Nothing billed yet
              </Text>
            )}

            <Text variant="caption" tone="secondary" className="mt-0.5">
              {summary}
            </Text>
          </View>

          <View className="flex-row items-center gap-1.5 pt-1">
            <StepButton
              icon="chevron-left"
              label="Previous month"
              onPress={() => onChangePeriod(prevPeriod(period))}
            />
            <StepButton
              icon="chevron-right"
              label="Next month"
              disabled={!canGoForward}
              onPress={() => canGoForward && onChangePeriod(nextPeriod(period))}
            />
          </View>
        </View>
      </View>
    </Surface>
  );
}

function StepButton({
  icon,
  label,
  disabled = false,
  onPress,
}: {
  icon: 'chevron-left' | 'chevron-right';
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();

  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      scaleTo={0.9}
      haptic="light"
      onPress={onPress}
      className={`h-12 w-12 items-center justify-center rounded-full border border-border bg-surface2 ${
        disabled ? 'opacity-30' : ''
      }`}>
      <Feather name={icon} size={18} color={colors.text} />
    </PressableScale>
  );
}
