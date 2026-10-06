import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

import { STATUS_META } from '@/domain/status';
import type { UnitCell } from '@/hooks/use-building-month';
import { formatAmount } from '@/lib/money';
import { useLayout } from '@/theme/layout';
import { useColors } from '@/theme/tokens';

import { PressableScale } from './pressable-scale';
import { Text } from './text';

/**
 * One unit, drawn as a window in the building.
 *
 * A landlord already reads a building this way: walk up after dark and the
 * lit windows are the flats that are settled. So paid units glow brass and
 * everything else stays dark glass. The metaphor does the work a colour
 * legend would otherwise have to — but the label and icon are still there,
 * because colour alone is never the signal (see domain/status.ts).
 *
 * Only two states get colour. Overdue is the single alarm in the app; merely
 * unpaid is not a problem yet and stays quiet.
 */
export function UnitTile({ cell, onPress }: { cell: UnitCell; onPress: () => void }) {
  const colors = useColors();
  const { unitTileMinHeight, sizeClass } = useLayout();
  const compactPadding = sizeClass === 'small' || sizeClass === 'compact';
  const { unit, bill, status } = cell;

  const lit = status === 'paid';
  const alarm = status === 'overdue';
  /** Tenanted but no reading entered — work for the owner to do. */
  const awaitingReading = status === 'notBilled';
  /** No tenant. Nothing to do, so it recedes rather than asking for attention. */
  const vacant = status === 'vacant';

  return (
    <PressableScale
      accessibilityLabel={buildLabel(cell)}
      scaleTo={0.96}
      onPress={onPress}
      style={{ minHeight: unitTileMinHeight }}
      className={[
        'flex-1 justify-between overflow-hidden rounded-md border',
        compactPadding ? 'p-2.5' : 'p-3',
        lit && 'border-paid bg-paid-muted',
        alarm && 'border-overdue bg-overdue-muted',
        // Awaiting a reading: dashed, because it is an outline to fill in.
        awaitingReading && 'border-dashed border-border-strong bg-transparent',
        // Vacant: no tenant, nothing to do. It recedes instead of nagging.
        vacant && 'border-border bg-transparent opacity-60',
        !lit && !alarm && !awaitingReading && !vacant && 'border-border bg-surface',
      ]
        .filter(Boolean)
        .join(' ')}>
      <View className="flex-row items-start justify-between gap-1">
        <Text
          variant="caption"
          tone={lit ? 'paid' : alarm ? 'overdue' : 'secondary'}
          numberOfLines={1}
          className="flex-1">
          {unit.label}
        </Text>

        {lit ? <Feather name="check" size={14} color={colors.paid} /> : null}
        {alarm ? <Feather name="alert-circle" size={14} color={colors.overdue} /> : null}
      </View>

      {/* The amount is what the eye is actually hunting for, so it is the
          loudest thing on the tile; the unit number is the quieter line. */}
      {bill?.totalPaise != null ? (
        <Text
          variant="label"
          numeric
          weight="bold"
          numberOfLines={1}
          tone={lit ? 'paid' : alarm ? 'overdue' : 'default'}>
          {formatAmount(bill.totalPaise)}
        </Text>
      ) : vacant ? (
        <Text variant="caption" tone="tertiary">
          Empty
        </Text>
      ) : (
        <Text variant="label" tone="tertiary" weight="medium">
          —
        </Text>
      )}
    </PressableScale>
  );
}

/** One sentence a screen reader can read without the visual metaphor. */
function buildLabel({ unit, bill, status }: UnitCell): string {
  const amount = bill?.totalPaise != null ? `${formatAmount(bill.totalPaise)} rupees` : 'no bill yet';
  // STATUS_META already names every state; duplicating the list here is how
  // a new status ends up announced as "not billed".
  return `${unit.label}, ${STATUS_META[status].label.toLowerCase()}, ${amount}`;
}
