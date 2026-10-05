import Feather from '@expo/vector-icons/Feather';
// Re-exported by expo-router rather than taken from @react-navigation
// directly — expo-router vendors its own copy, and importing the standalone
// package would pull in a second, mismatched set of navigation types.
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { motion, useColors } from '@/theme/tokens';

import { PressableScale } from './pressable-scale';
import { Surface } from './surface';
import { Text } from './text';

type IconName = ComponentProps<typeof Feather>['name'];

const ICONS: Record<string, IconName> = {
  home: 'grid',
  history: 'clock',
  settings: 'settings',
};

/**
 * Custom tab bar rather than expo-router's `NativeTabs`.
 *
 * NativeTabs would hand us a real iOS 26 Liquid Glass bar for free, but its
 * icons are SF Symbols on iOS and app-local drawables on Android — two icon
 * sets, two visual languages. Since the brief is one identical design on both
 * platforms, we build it ourselves on top of `Surface`, which still resolves
 * to a genuine GlassView on iOS 26 and a blur on Android 12+.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-0 items-center"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
      <Surface
        variant="regular"
        className="flex-row items-center gap-1 overflow-hidden rounded-full border border-border px-2 py-2">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name;

          return (
            <TabItem
              key={route.key}
              icon={ICONS[route.name] ?? 'circle'}
              label={label}
              focused={state.index === index}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
            />
          );
        })}
      </Surface>
    </View>
  );
}

function TabItem({
  icon,
  label,
  focused,
  onPress,
}: {
  icon: IconName;
  label: string;
  focused: boolean;
  onPress: () => void;
}) {
  const colors = useColors();

  // The worklet closes over `focused` and re-runs when it changes. Writing to
  // a shared value during render instead would mutate state mid-render, which
  // Reanimated does not guarantee to pick up.
  const pillStyle = useAnimatedStyle(() => {
    const active = focused ? 1 : 0;
    return {
      opacity: withSpring(active, motion.effect.default),
      transform: [{ scale: withSpring(0.8 + 0.2 * active, motion.spatial.default) }],
    };
  }, [focused]);

  return (
    <PressableScale
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      scaleTo={0.9}
      onPress={onPress}
      className="h-12 flex-row items-center justify-center overflow-hidden rounded-full px-4">
      <Animated.View
        pointerEvents="none"
        className="absolute inset-0 rounded-full bg-brand-muted"
        style={pillStyle}
      />
      <View className="flex-row items-center gap-2">
        <Feather name={icon} size={17} color={focused ? colors.brandText : colors.textSecondary} />
        {focused ? (
          <Text variant="label" className="font-semibold text-brand-text">
            {label}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}
