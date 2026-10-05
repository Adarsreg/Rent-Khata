import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

import { useColors } from '@/theme/tokens';

import { PressableScale } from './pressable-scale';
import { Text } from './text';

/**
 * Plus/minus counter. The onboarding wizard asks for floor counts and
 * units-per-floor, and both are small numbers a landlord knows by heart —
 * tapping twice beats summoning a keyboard.
 */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  const colors = useColors();
  const canDec = value > min;
  const canInc = value < max;

  return (
    <View className="flex-row items-center gap-3">
      <PressableScale
        accessibilityLabel={`Decrease${label ? ` ${label}` : ''}`}
        disabled={!canDec}
        haptic="light"
        scaleTo={0.88}
        onPress={() => canDec && onChange(value - 1)}
        className={`h-12 w-12 items-center justify-center rounded-full border border-border bg-surface2 ${
          canDec ? '' : 'opacity-30'
        }`}>
        <Feather name="minus" size={18} color={colors.text} />
      </PressableScale>

      <Text variant="heading" numeric className="min-w-10 text-center">
        {value}
      </Text>

      <PressableScale
        accessibilityLabel={`Increase${label ? ` ${label}` : ''}`}
        disabled={!canInc}
        haptic="light"
        scaleTo={0.88}
        onPress={() => canInc && onChange(value + 1)}
        className={`h-12 w-12 items-center justify-center rounded-full border border-border bg-surface2 ${
          canInc ? '' : 'opacity-30'
        }`}>
        <Feather name="plus" size={18} color={colors.text} />
      </PressableScale>
    </View>
  );
}
