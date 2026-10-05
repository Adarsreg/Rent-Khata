import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { STATUS_META } from '@/domain/status';
import type { UnitCell } from '@/hooks/use-building-month';
import { formatAmount } from '@/lib/money';
import { STAGGER_MS, useColors } from '@/theme/tokens';

import { PressableScale } from './pressable-scale';
import { Text } from './text';

const ICON_TOKEN = {
  paid: 'paid',
  due: 'due',
  overdue: 'overdue',
  notBilled: 'neutral',
} as const;

/**
 * One apartment in the building elevation. Carries three signals at a glance:
 * the label, the amount, and status as icon + border color (never color
 * alone — see domain/status.ts).
 */
export function UnitTile({
  cell,
  index,
  onPress,
}: {
  cell: UnitCell;
  /** Position in the overall stagger sequence, not within the floor. */
  index: number;
  onPress: () => void;
}) {
  const colors = useColors();
  const meta = STATUS_META[cell.status];
  const { unit, bill, status } = cell;

  return (
    <Animated.View entering={FadeIn.delay(index * STAGGER_MS).duration(220)} className="flex-1">
      <PressableScale
        accessibilityLabel={`${unit.label}. ${meta.label}. ${
          bill?.totalPaise != null ? formatAmount(bill.totalPaise) + ' rupees' : 'No bill yet'
        }`}
        scaleTo={0.95}
        onPress={onPress}
        className={`min-h-24 justify-between rounded-md border-2 bg-surface p-3 ${meta.border} ${
          status === 'notBilled' ? 'border-dashed' : ''
        }`}>
        <View className="flex-row items-start justify-between gap-1">
          <Text variant="caption" tone="secondary" numberOfLines={1} className="flex-1">
            {unit.label}
          </Text>
          <Feather name={meta.icon} size={15} color={colors[ICON_TOKEN[status]]} />
        </View>

        {/*
          The amount, not the unit number, is what people scan a building for,
          so it gets the larger type. The label above it is the quieter line.
        */}
        {bill?.totalPaise != null ? (
          <Text variant="label" numeric className="font-bold text-text" numberOfLines={1}>
            {formatAmount(bill.totalPaise)}
          </Text>
        ) : (
          <Text variant="caption" tone="tertiary" numberOfLines={1}>
            {unit.tenantName ? 'Add reading' : 'Set up'}
          </Text>
        )}
      </PressableScale>
    </Animated.View>
  );
}
