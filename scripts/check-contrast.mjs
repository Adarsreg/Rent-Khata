/**
 * Fails the build if any text color in src/theme/palette.js drops below
 * WCAG AA (4.5:1) against the worst-case surface it can be rendered on.
 *
 * This exists because contrast regressions are invisible in review — a hex
 * tweak that looks nicer on the designer's monitor can quietly make rupee
 * amounts unreadable for an older landlord in daylight. Run it after any
 * palette change:
 *
 *   npm run check:contrast
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { palette } = require('../src/theme/palette.js');

const AA = 4.5;

const channel = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

const parse = (hex) => {
  const m = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16));
};

const luminance = (hex) => {
  const [r, g, b] = parse(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

/** Colors used for text, and every surface they can land on. */
const TEXT_TOKENS = [
  'text',
  'textSecondary',
  'textTertiary',
  'brandText',
  'paid',
  'due',
  'overdue',
  'neutral',
];

const SURFACES = ['canvas', 'surface', 'surface2', 'surface3'];

/** Text-on-fill pairs, where the fill is the background. */
const ON_FILL = [
  ['onBrand', 'brand'],
  ['paid', 'paidMuted'],
  ['due', 'dueMuted'],
  ['overdue', 'overdueMuted'],
  ['neutral', 'neutralMuted'],
];

let failures = 0;

for (const scheme of ['dark', 'light']) {
  const p = palette[scheme];
  console.log(`\n${scheme.toUpperCase()}`);

  for (const token of TEXT_TOKENS) {
    const ratios = SURFACES.map((s) => contrast(p[token], p[s]));
    const min = Math.min(...ratios);
    const worst = SURFACES[ratios.indexOf(min)];
    const ok = min >= AA;
    if (!ok) failures++;
    console.log(
      `  ${token.padEnd(15)} ${p[token]}  min ${min.toFixed(2)}:1 on ${worst.padEnd(9)} ${
        ok ? 'AA' : '** FAIL **'
      }`
    );
  }

  for (const [fg, bg] of ON_FILL) {
    const ratio = contrast(p[fg], p[bg]);
    const ok = ratio >= AA;
    if (!ok) failures++;
    console.log(
      `  ${`${fg} on ${bg}`.padEnd(26)} ${ratio.toFixed(2)}:1  ${ok ? 'AA' : '** FAIL **'}`
    );
  }
}

if (failures > 0) {
  console.error(`\n${failures} contrast failure(s). Fix the palette before shipping.`);
  process.exit(1);
}
console.log('\nAll color pairs meet WCAG AA (4.5:1).');
