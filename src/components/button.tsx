import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useColors } from '@/theme/tokens';

import { PressableScale, type PressableScaleProps } from './pressable-scale';
import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'success';

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-brand',
  secondary: 'bg-surface2 border border-border',
  ghost: 'bg-transparent',
  success: 'bg-paid-muted border border-paid',
};

/**
 * Label colour is applied as an inline style, not a class. A class would be
 * competing with the one the Text variant already sets, and inline style is
 * the only form guaranteed to win that.
 */
const LABEL_TOKEN: Record<Variant, 'onBrand' | 'text' | 'brandText' | 'paid'> = {
  primary: 'onBrand',
  secondary: 'text',
  ghost: 'brandText',
  success: 'paid',
};

const ICON_TOKEN: Record<Variant, 'onBrand' | 'text' | 'brandText' | 'paid'> = {
  primary: 'onBrand',
  secondary: 'text',
  // brandText, not brand: a glyph on the canvas needs more contrast than a
  // fill does. See palette.js.
  ghost: 'brandText',
  success: 'paid',
};

export type ButtonProps = Omit<PressableScaleProps, 'children'> & {
  label: string;
  variant?: Variant;
  icon?: ComponentProps<typeof Feather>['name'];
  size?: 'md' | 'lg';
  loading?: boolean;
  /** Stretch to fill the parent's cross axis. */
  block?: boolean;
};

export function Button({
  label,
  variant = 'primary',
  icon,
  size = 'md',
  loading = false,
  block = false,
  disabled,
  className,
  ...rest
}: ButtonProps) {
  const colors = useColors();
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      scaleTo={0.96}
      className={[
        'flex-row items-center justify-center rounded-md',
        size === 'lg' ? 'gap-2 px-6 py-4' : 'gap-2 px-4 py-3',
        CONTAINER[variant],
        block && 'self-stretch',
        isDisabled && 'opacity-40',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}>
      {loading ? (
        <ActivityIndicator size="small" color={colors[ICON_TOKEN[variant]]} />
      ) : (
        <>
          {icon ? (
            <Feather name={icon} size={size === 'lg' ? 18 : 16} color={colors[ICON_TOKEN[variant]]} />
          ) : null}
          <Text
            variant={size === 'lg' ? 'body' : 'label'}
            weight="semibold"
            style={{ color: colors[LABEL_TOKEN[variant]] }}>
            {label}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

/** Square icon-only button, for headers and toolbars. */
export function IconButton({
  icon,
  label,
  variant = 'secondary',
  className,
  ...rest
}: Omit<ButtonProps, 'icon' | 'label' | 'block' | 'size'> & {
  icon: ComponentProps<typeof Feather>['name'];
  label: string;
}) {
  const colors = useColors();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      scaleTo={0.92}
      className={[
        'h-12 w-12 items-center justify-center rounded-full',
        CONTAINER[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}>
      <View>
        <Feather name={icon} size={18} color={colors[ICON_TOKEN[variant]]} />
      </View>
    </PressableScale>
  );
}
