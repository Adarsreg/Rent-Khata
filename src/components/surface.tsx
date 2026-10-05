import { BlurTargetView, BlurView, type BlurTint } from 'expo-blur';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import { createContext, useContext, useRef, type ReactNode } from 'react';
import { Platform, View, type View as RNView, type ViewProps } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useColors } from '@/theme/tokens';

/**
 * Which material this device can actually render. Resolved once at module
 * load — the answer cannot change at runtime, so no screen should branch on
 * Platform.OS itself.
 *
 * - `liquid` — iOS 26+: real UIGlassEffect, with refraction. The OS owns it.
 * - `blur`   — iOS < 26, and Android 31+: a genuine backdrop blur.
 *              Android additionally needs a <GlassScreen> ancestor to supply
 *              the view being blurred; without one it degrades to `solid`.
 * - `solid`  — everything else: an opaque token-colored View. Not a
 *              degraded experience, just a flatter one.
 */
const GLASS_MODE: 'liquid' | 'blur' | 'solid' = (() => {
  if (Platform.OS === 'ios') {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable() ? 'liquid' : 'blur';
  }
  if (Platform.OS === 'android' && Number(Platform.Version) >= 31) return 'blur';
  return 'solid';
})();

/**
 * Android's BlurView blurs a *specific* view rather than whatever is behind
 * it, so the target ref has to travel from the screen down to the chrome.
 * Context keeps that plumbing out of every screen's props.
 */
const BlurTargetContext = createContext<React.RefObject<RNView | null> | null>(null);

/**
 * Screen shell: scrolling content underneath, translucent chrome on top.
 *
 * `overlay` is a separate prop rather than just more children because a
 * BlurView cannot live inside the view it blurs — it would recurse. Taking
 * the chrome as its own slot makes that mistake unrepresentable, and hands
 * the chrome the blur target via context so no screen touches the ref.
 */
export function GlassScreen({
  children,
  overlay,
  ...rest
}: ViewProps & { children: ReactNode; overlay?: ReactNode }) {
  const targetRef = useRef<RNView | null>(null);
  const needsTarget = Platform.OS === 'android' && GLASS_MODE === 'blur';

  const content = needsTarget ? (
    <BlurTargetView ref={targetRef} style={{ flex: 1 }}>
      {children}
    </BlurTargetView>
  ) : (
    <View style={{ flex: 1 }}>{children}</View>
  );

  return (
    <BlurTargetContext.Provider value={needsTarget ? targetRef : null}>
      <View style={{ flex: 1 }} {...rest}>
        {content}
        {overlay}
      </View>
    </BlurTargetContext.Provider>
  );
}

export type SurfaceProps = ViewProps & {
  children?: ReactNode;
  /** `regular` = frosted (default). `clear` = barely-there, for over imagery. */
  variant?: 'regular' | 'clear';
  /** Blur strength, 1–100. Ignored in `liquid` mode — iOS 26 decides. */
  intensity?: number;
  /**
   * Reacts to touch with a subtle warp. iOS 26 only. Use on pressable chrome
   * (a FAB), never on a static header.
   */
  interactive?: boolean;
};

/**
 * Translucent chrome: headers, tab bars, sheets, floating buttons.
 *
 * Per Apple's own guidance, translucency belongs on temporary, layered,
 * secondary surfaces — NOT on content. Keep cards holding rupee amounts
 * opaque (`<Card>`), or the numbers lose contrast against whatever scrolls
 * underneath.
 */
export function Surface({
  children,
  variant = 'regular',
  intensity = 60,
  interactive = false,
  style,
  ...rest
}: SurfaceProps) {
  const colors = useColors();
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const blurTarget = useContext(BlurTargetContext);

  if (GLASS_MODE === 'liquid') {
    return (
      <GlassView
        glassEffectStyle={variant}
        isInteractive={interactive}
        colorScheme={scheme}
        style={style}
        {...rest}>
        {children}
      </GlassView>
    );
  }

  // Android reports `blur` by SDK level, but real blur still needs a target view.
  const canBlur = GLASS_MODE === 'blur' && (Platform.OS === 'ios' || !!blurTarget);

  if (canBlur) {
    const tint: BlurTint =
      scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight';
    return (
      <BlurView
        tint={tint}
        // Static value only. Animating `intensity` re-renders the blur kernel
        // every frame; cross-fade the whole Surface's opacity instead.
        intensity={variant === 'clear' ? Math.round(intensity * 0.5) : intensity}
        blurMethod="dimezisBlurViewSdk31Plus"
        blurTarget={blurTarget ?? undefined}
        style={style}
        {...rest}>
        {children}
      </BlurView>
    );
  }

  return (
    <View style={[{ backgroundColor: colors.glassSolid }, style]} {...rest}>
      {children}
    </View>
  );
}
