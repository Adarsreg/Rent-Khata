import { Platform, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { tabularNums } from '@/theme/tokens';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'kicker';
type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

/**
 * Typography on the platform's own font — San Francisco on iOS, Roboto on
 * Android — which is also what WhatsApp uses.
 *
 * A bundled webfont was tried and removed. Instrument Sans ships 343
 * codepoints with **no ₹ (U+20B9) and no Devanagari**, so every rupee amount
 * rendered its symbol in a fallback face while the digits used the webfont,
 * and a tenant named in Hindi would have done the same. A ledger that cannot
 * draw its own currency is not a typographic trade-off worth making — and the
 * system faces cover both, load instantly, and add nothing to the bundle.
 */
const WEIGHTS: Record<Weight, RNTextProps['style']> = {
  regular: { fontWeight: '400' },
  medium: { fontWeight: '500' },
  semibold: { fontWeight: '600' },
  bold: { fontWeight: '700' },
};

/**
 * Tracking tightens as size grows — the spacing that reads well at 15px looks
 * loose and unset at 40px. This is most of the difference between type that
 * looks considered and type that looks defaulted.
 *
 * The floor is 14px. There is no 12px tier: this is read by landlords of every
 * age, often outdoors, and nothing here is unimportant enough to justify one.
 */
const VARIANTS: Record<Variant, { className: string; letterSpacing: number; weight: Weight }> = {
  display: { className: 'text-display', letterSpacing: -1.2, weight: 'bold' },
  title: { className: 'text-title', letterSpacing: -0.5, weight: 'semibold' },
  heading: { className: 'text-heading', letterSpacing: -0.3, weight: 'semibold' },
  body: { className: 'text-body', letterSpacing: -0.1, weight: 'regular' },
  label: { className: 'text-label', letterSpacing: -0.05, weight: 'medium' },
  caption: { className: 'text-caption', letterSpacing: 0, weight: 'regular' },
  /** Quiet line introducing the block below it. Sentence case, never caps. */
  kicker: { className: 'text-label', letterSpacing: -0.05, weight: 'medium' },
};

const TONES = {
  default: 'text-text',
  secondary: 'text-text-secondary',
  tertiary: 'text-text-tertiary',
  brand: 'text-brand-text',
  paid: 'text-paid',
  overdue: 'text-overdue',
} as const;

/** Default colour per variant, so `tone` is only needed to deviate. */
const DEFAULT_TONE: Record<Variant, keyof typeof TONES> = {
  display: 'default',
  title: 'default',
  heading: 'default',
  body: 'default',
  label: 'default',
  caption: 'secondary',
  kicker: 'secondary',
};

/**
 * OS font scaling stays on — someone who set large text in Settings needs it
 * here most. Capped per variant so a 2x setting cannot collapse the building
 * elevation; looser for body copy than for display figures, which start large.
 */
const MAX_SCALE: Record<Variant, number> = {
  display: 1.3,
  title: 1.4,
  heading: 1.5,
  body: 1.8,
  label: 1.8,
  caption: 1.8,
  kicker: 1.8,
};

export type TextProps = RNTextProps & {
  variant?: Variant;
  /** Overrides the variant default. */
  tone?: keyof typeof TONES;
  /** Overrides the weight without changing the size. */
  weight?: Weight;
  /**
   * Tabular figures. Set on every currency and meter value so digits line up
   * in a column — proportional digits make a stack of rupee amounts ragged.
   */
  numeric?: boolean;
};

export function Text({
  variant = 'body',
  tone,
  weight,
  numeric = false,
  className,
  style,
  ...rest
}: TextProps) {
  const spec = VARIANTS[variant];

  return (
    <RNText
      maxFontSizeMultiplier={MAX_SCALE[variant]}
      className={[spec.className, TONES[tone ?? DEFAULT_TONE[variant]], className]
        .filter(Boolean)
        .join(' ')}
      style={[
        // `fontFamily` is deliberately unset: React Native then uses the
        // platform UI font, which carries ₹ and Devanagari.
        WEIGHTS[weight ?? spec.weight],
        { letterSpacing: spec.letterSpacing },
        // Android renders a lighter face for 500/600 unless told otherwise;
        // without this, medium and semibold look identical to regular.
        Platform.OS === 'android' ? { includeFontPadding: false } : null,
        numeric && tabularNums,
        style,
      ]}
      {...rest}
    />
  );
}
