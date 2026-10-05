import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { tabularNums } from '@/theme/tokens';

type Variant =
  | 'hero'
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'label'
  | 'caption'
  | 'kicker';

const VARIANTS: Record<Variant, string> = {
  hero: 'text-hero font-bold tracking-tighter text-text',
  display: 'text-display font-bold tracking-tight text-text',
  title: 'text-title font-semibold tracking-tight text-text',
  heading: 'text-heading font-semibold text-text',
  body: 'text-body text-text',
  label: 'text-label font-medium text-text',
  caption: 'text-caption text-text-secondary',
  /**
   * Short line introducing the block below it (e.g. the month above a total).
   * Sentence case, not uppercase: all-caps costs legibility by removing word
   * shape, and is one of the most recognisable tells of a templated layout.
   */
  kicker: 'text-label font-semibold text-text-secondary',
};

export type TextProps = RNTextProps & {
  variant?: Variant;
  /** Dims to the secondary/tertiary ramp without restating the variant. */
  tone?: 'default' | 'secondary' | 'tertiary' | 'brand';
  /**
   * Tabular figures. Set this on every currency and meter-reading value so
   * digits line up in a column — proportional digits make a stack of rupee
   * amounts look visibly ragged.
   */
  numeric?: boolean;
};

const TONES = {
  default: '',
  secondary: 'text-text-secondary',
  tertiary: 'text-text-tertiary',
  brand: 'text-brand-text',
} as const;

/**
 * OS-level font scaling stays ON — a landlord who has set large text in
 * Settings needs it here most of all. It is capped so a 2x setting cannot
 * collapse the building elevation, and the cap is looser for body copy than
 * for the big display numbers, which already start large.
 */
const MAX_SCALE: Record<Variant, number> = {
  hero: 1.2,
  display: 1.3,
  title: 1.4,
  heading: 1.5,
  body: 1.8,
  label: 1.8,
  caption: 1.8,
  kicker: 1.8,
};

export function Text({
  variant = 'body',
  tone = 'default',
  numeric = false,
  className,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={MAX_SCALE[variant]}
      className={[VARIANTS[variant], TONES[tone], className].filter(Boolean).join(' ')}
      style={[numeric && tabularNums, style]}
      {...rest}
    />
  );
}
