import { BlurTargetView, BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import { cssInterop } from 'nativewind';
import Animated from 'react-native-reanimated';

/**
 * Registers third-party components with NativeWind.
 *
 * This is NOT optional boilerplate. NativeWind v4's JSX transform only
 * rewrites `className` for components present in its interop registry:
 *
 *     type = interopComponents.get(type) ?? type
 *
 * Anything unregistered receives a literal `className` string prop, quietly
 * ignores it, and renders unstyled. It fails silently — no warning, no error,
 * just a header with no border sitting in the wrong place. The registry ships
 * with the core React Native components and SafeAreaView; everything else is
 * on us.
 *
 * Imported for its side effects by the root layout, before any screen renders.
 */

// Glass/blur chrome — without this, Surface loses its radius, border and
// absolute positioning.
cssInterop(GlassView, { className: 'style' });
cssInterop(BlurView, { className: 'style' });
cssInterop(BlurTargetView, { className: 'style' });

// Reanimated wrappers are fresh component identities, so they are not covered
// by the View/Pressable registrations either.
cssInterop(Animated.View, { className: 'style' });
cssInterop(Animated.Text, { className: 'style' });
cssInterop(Animated.ScrollView, {
  className: 'style',
  contentContainerClassName: 'contentContainerStyle',
});

export {};
