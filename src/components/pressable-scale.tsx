import * as Haptics from 'expo-haptics';
import { cssInterop } from 'nativewind';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { MIN_TOUCH, motion } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// A fresh component identity, so NativeWind's Pressable registration does not
// cover it — without this every button renders unstyled. See theme/css-interop.ts.
cssInterop(AnimatedPressable, { className: 'style' });

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** How far to compress on press. Smaller for large surfaces, more for chips. */
  scaleTo?: number;
  /**
   * Off by default on purpose — haptics on every row press gets noisy fast.
   * Opt in for moments that confirm something, like marking a unit paid.
   */
  haptic?: false | 'light' | 'medium' | 'success';
};

/**
 * The app's single press affordance. Spring-driven rather than timing-driven,
 * so an interrupted press retargets smoothly instead of snapping.
 */
export function PressableScale({
  scaleTo = 0.97,
  haptic = false,
  onPressIn,
  style,
  ...rest
}: PressableScaleProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1 - (1 - scaleTo) * pressed.value, motion.spatial.fast) }],
    opacity: withSpring(1 - 0.12 * pressed.value, motion.effect.fast),
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      hitSlop={8}
      onPressIn={(e) => {
        pressed.value = 1;
        if (haptic === 'light') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        else if (haptic === 'medium') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else if (haptic === 'success')
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onPressIn?.(e);
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      style={[{ minHeight: MIN_TOUCH, justifyContent: 'center' }, style, animatedStyle]}
      {...rest}
    />
  );
}
