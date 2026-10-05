
import { useColorScheme } from '@/hooks/use-color-scheme';

import { palette } from './palette';

export type ColorName = keyof typeof palette.dark;
export type ThemeColors = Record<ColorName, string>;

const schemes: { light: ThemeColors; dark: ThemeColors } = palette;

/**
 * Raw color values, for the places a `className` cannot reach: Reanimated
 * worklets, NativeTabs, StatusBar, BlurView tint, native icon props.
 * Prefer `className` in markup.
 */
export function useColors(): ThemeColors {
  return schemes[useColorScheme() === 'light' ? 'light' : 'dark'];
}

/**
 * Spring presets, following Material 3 Expressive's motion-physics model:
 * `spatial` for anything that moves or resizes, `effect` for color and
 * opacity, `expressive` (deliberately underdamped) reserved for the one
 * celebratory moment — marking a unit paid.
 */
export const motion = {
  spatial: {
    fast: { stiffness: 380, damping: 28, mass: 1 },
    default: { stiffness: 260, damping: 26, mass: 1 },
    slow: { stiffness: 180, damping: 24, mass: 1 },
  },
  effect: {
    fast: { stiffness: 420, damping: 34, mass: 1 },
    default: { stiffness: 300, damping: 32, mass: 1 },
  },
  expressive: {
    default: { stiffness: 240, damping: 18, mass: 1 },
  },
} as const;

/** Stagger step for list/grid entrances. Keep the total under ~400ms. */
export const STAGGER_MS = 28;

/**
 * Tabular figures so currency columns align vertically down the building
 * view — proportional digits make a column of rupee amounts look ragged.
 */
export const tabularNums = { fontVariant: ['tabular-nums' as const] };

/**
 * Minimum touch target. Apple's floor is 44pt and Material's is 48dp; we take
 * the larger for both platforms rather than the minimum that passes, because
 * tap accuracy falls off with age and tremor and this app's primary actions
 * involve money.
 */
export const MIN_TOUCH = 48;

/**
 * Bottom padding a scroll view needs so its last row clears the floating tab
 * bar. The bar overlays content rather than the navigator reserving space,
 * so each screen pads itself.
 */
export const TAB_BAR_CLEARANCE = 96;
