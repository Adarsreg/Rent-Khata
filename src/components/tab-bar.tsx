import Feather from '@expo/vector-icons/Feather';
// Re-exported by expo-router rather than taken from @react-navigation
// directly — expo-router vendors its own copy, and importing the standalone
// package would pull in a second, mismatched set of navigation types.
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/theme/tokens';

import { PressableScale } from './pressable-scale';
import { Text } from './text';

type IconName = ComponentProps<typeof Feather>['name'];

const ICONS: Record<string, IconName> = {
  home: 'home',
  history: 'clock',
  settings: 'sliders',
};

/**
 * Bottom navigation, in WhatsApp's shape: a solid full-width bar with a top
 * hairline, labels always visible, the active item in green.
 *
 * It replaced a floating pill. The pill looked smart in a screenshot and was
 * wrong in use — it hovered over the last row of the ledger, so the figure a
 * landlord most wants ("still owed") sat behind it. A solid bar occupies real
 * layout space instead of stealing it.
 *
 * Labels stay visible rather than appearing only when active: this app is
 * used by people of every age, and an unlabelled icon row is a guessing game.
 *
 * Custom rather than expo-router's `NativeTabs` because that uses SF Symbols
 * on iOS and app-local drawables on Android — two icon sets, two visual
 * languages, where the brief is one identical design on both.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute inset-x-0 bottom-0 flex-row border-t border-border bg-surface"
      style={{ paddingBottom: insets.bottom }}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : (options.title ?? route.name);

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
              if (!event.defaultPrevented) navigation.navigate(route.name, route.params);
            }}
          />
        );
      })}
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
  const tint = focused ? colors.brandText : colors.textSecondary;

  return (
    <PressableScale
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      scaleTo={0.94}
      onPress={onPress}
      className="flex-1 items-center justify-center gap-1 py-2.5">
      {/* A filled pill behind the active icon, as WhatsApp marks its tabs. */}
      <View
        className={`items-center justify-center rounded-full px-5 py-1 ${
          focused ? 'bg-paid-muted' : ''
        }`}>
        <Feather name={icon} size={20} color={tint} />
      </View>
      <Text
        variant="caption"
        weight={focused ? 'semibold' : 'regular'}
        style={{ color: tint }}
        numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}
