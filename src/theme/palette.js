/**
 * Single source of truth for brand color.
 *
 * Plain CJS so `tailwind.config.js` can `require()` it while `tokens.ts`
 * imports it for raw values (Reanimated, StatusBar, icon color props).
 * Keeping one copy means a className and a style prop cannot drift apart.
 *
 * Design intent: deep slate canvas rather than pure black — glass and blur
 * read as dead flat gray over #000. Brand is violet specifically so it never
 * collides with the paid/due/overdue status colors.
 *
 * ACCESSIBILITY: every text color here clears WCAG AA (4.5:1) against the
 * *worst-case* surface it can land on — surface3 in dark, surface3 in light,
 * not just the base surface. The app is for landlords of every age reading
 * money on a phone, often outdoors. Verified by `npm run check:contrast`;
 * re-run it after touching any value below.
 */
const palette = {
  dark: {
    canvas: '#0B0F14',
    surface: '#141A21',
    surface2: '#1C242D',
    surface3: '#253039',
    border: '#2B3642',
    borderStrong: '#3C4956',

    text: '#F2F5F7',
    textSecondary: '#A3AFBB',
    textTertiary: '#949EA8',
    textInverse: '#0B0F14',

    /** Fill only. White sits on this, so it cannot be any lighter. */
    brand: '#7959F8',
    brandHover: '#8E72FF',
    brandMuted: '#241E4D',
    /** Brand as *text* — lighter, because a fill and a glyph need different contrast. */
    brandText: '#9B82FF',
    onBrand: '#FFFFFF',

    paid: '#34D399',
    paidMuted: '#0E2E25',
    due: '#FBBF24',
    dueMuted: '#33270A',
    overdue: '#F87171',
    overdueMuted: '#3A1A1A',
    neutral: '#949EA8',
    neutralMuted: '#1A2128',

    /** Tint laid over native glass/blur so it reads as *our* material. */
    glassTint: 'rgba(20, 26, 33, 0.55)',
    /** Fallback when neither Liquid Glass nor Android blur is available. */
    glassSolid: '#141A21',
    scrim: 'rgba(0, 0, 0, 0.6)',
  },

  light: {
    canvas: '#F4F6F8',
    surface: '#FFFFFF',
    surface2: '#F0F2F5',
    surface3: '#E6EAEF',
    border: '#DCE1E7',
    borderStrong: '#B9C2CC',

    text: '#0B0F14',
    textSecondary: '#4A5560',
    textTertiary: '#5C666F',
    textInverse: '#FFFFFF',

    brand: '#6246EA',
    brandHover: '#4E36C9',
    brandMuted: '#EEEAFE',
    brandText: '#5A3FD6',
    onBrand: '#FFFFFF',

    paid: '#046B4E',
    paidMuted: '#DEF7EC',
    due: '#9A4708',
    dueMuted: '#FEF3C7',
    overdue: '#B91C1C',
    overdueMuted: '#FEE2E2',
    neutral: '#5C666F',
    neutralMuted: '#F0F2F5',

    glassTint: 'rgba(255, 255, 255, 0.6)',
    glassSolid: '#FFFFFF',
    scrim: 'rgba(11, 15, 20, 0.4)',
  },
};

module.exports = { palette };
