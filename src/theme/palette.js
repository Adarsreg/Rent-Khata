/**
 * Single source of truth for colour.
 *
 * Plain CJS so `tailwind.config.js` can `require()` it while `tokens.ts`
 * imports it for raw values. One copy means a className and a style prop
 * cannot drift apart.
 *
 * ── WhatsApp-derived ────────────────────────────────────────────────────
 * Surfaces, greens and greys follow WhatsApp, because that is where this
 * app's users already live and a bill that looks like the app they send it
 * from needs no explaining.
 *
 * Two deliberate departures, both for legibility:
 *
 * 1. WhatsApp's signature greens (#25D366, #00A884) carry white text at
 *    about 2.5:1 and 3.0:1 — well under the 4.5:1 floor. Filled buttons use
 *    a darker green of the same hue instead; the bright greens stay for
 *    accents and indicators, where contrast is not load-bearing.
 * 2. Text greens are darkened for the same reason. A rupee figure has to be
 *    readable outdoors, which is not something a chat app has to care about.
 *
 * Paid still "lights up" the unit, as in the building-at-dusk idea — only now
 * in WhatsApp's outgoing-bubble green rather than brass.
 *
 * ACCESSIBILITY: every text colour clears WCAG AA (4.5:1) against the
 * worst-case surface it can land on. Enforced by `npm test`.
 */
const palette = {
  light: {
    // WhatsApp light: white chat list on a warm grey chrome.
    canvas: '#F0F2F5',
    surface: '#FFFFFF',
    surface2: '#F7F8FA',
    surface3: '#E9EDEF',
    border: '#E1E4E8',
    borderStrong: '#C3CBD1',

    text: '#111B21',
    textSecondary: '#53636F',
    textTertiary: '#5C6B77',
    textInverse: '#FFFFFF',

    /** Filled buttons. Darker than WhatsApp's #008069 so white clears AA. */
    brand: '#00674F',
    brandHover: '#00543F',
    brandMuted: '#E7F5EF',
    brandText: '#00604A',
    onBrand: '#FFFFFF',

    /** Paid — the outgoing-message green, as a lit unit. */
    paid: '#046B4E',
    paidMuted: '#D9FDD3',
    /** Due — colourless on purpose. Not yet done is not a problem. */
    due: '#53636F',
    dueMuted: '#F0F2F5',
    /** Overdue — the single alarm in the whole interface. */
    overdue: '#A8261B',
    overdueMuted: '#FDEAE7',
    neutral: '#5C6B77',
    neutralMuted: '#F0F2F5',

    glassTint: 'rgba(255, 255, 255, 0.76)',
    glassSolid: '#FFFFFF',
    scrim: 'rgba(17, 27, 33, 0.45)',
  },

  dark: {
    // WhatsApp dark: near-black teal, with lifted panels.
    canvas: '#0B141A',
    surface: '#111B21',
    surface2: '#1C2A33',
    surface3: '#24353F',
    border: '#2A3942',
    borderStrong: '#3E5259',

    text: '#E9EDEF',
    textSecondary: '#A7B4BC',
    textTertiary: '#98A6AF',
    textInverse: '#0B141A',

    /** Dark mode can use the real WhatsApp teal: dark text sits on it. */
    brand: '#00A884',
    brandHover: '#06CF9C',
    brandMuted: '#1C2A33',
    brandText: '#53BDAC',
    onBrand: '#0B141A',

    paid: '#5BC98F',
    paidMuted: '#103629',
    due: '#A7B4BC',
    dueMuted: '#1C2A33',
    overdue: '#F0877A',
    overdueMuted: '#3B1F1C',
    neutral: '#98A6AF',
    neutralMuted: '#18242B',

    glassTint: 'rgba(17, 27, 33, 0.72)',
    glassSolid: '#111B21',
    scrim: 'rgba(0, 0, 0, 0.6)',
  },
};

module.exports = { palette };
