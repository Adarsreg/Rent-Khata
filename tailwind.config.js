const { palette } = require('./src/theme/palette');

/**
 * Colors are exposed as CSS variables (set in global.css) so a single
 * `className` resolves correctly in both schemes without `dark:` on every
 * element. Raw hex from ./src/theme/palette.js feeds those variables.
 */
const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const colorKeys = Object.keys(palette.dark).filter((k) => palette.dark[k].startsWith('#'));

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  /**
   * Set to 'class' to work around a bug in react-native-css-interop 0.2.7 on
   * web: its MutationObserver reads the darkMode flag as "media" and then
   * immediately calls `colorScheme.set()`, which throws *because* the mode is
   * "media" — crashing the app before first paint in the browser.
   *
   * This is safe here because we use no `dark:` variants at all. Scheme
   * switching comes from the `@media (prefers-color-scheme: dark)` block in
   * global.css, which browsers honour directly and which NativeWind compiles
   * into its native light/dark variable registry either way.
   */
  darkMode: 'class',
  theme: {
    extend: {
      // e.g. `bg-surface2`, `text-text-secondary`, `border-border-strong`.
      colors: Object.fromEntries(
        colorKeys.map((k) => [kebab(k), `rgb(var(--c-${kebab(k)}) / <alpha-value>)`])
      ),
      borderRadius: {
        sm: '10px',
        md: '14px',
        lg: '20px',
        xl: '28px',
        '2xl': '36px',
      },
      fontSize: {
        // [size, lineHeight] — fixed line heights keep money columns aligned.
        //
        // The floor is 14px, not the usual 12px. This app is used by
        // landlords of every age, frequently outdoors, to read amounts of
        // money. 12px secondary text is the single most common reason an
        // otherwise clean interface is unusable past about 45, and there is
        // nothing here important enough to justify it.
        caption: ['14px', '20px'],
        label: ['15px', '20px'],
        body: ['17px', '25px'],
        heading: ['21px', '27px'],
        title: ['27px', '32px'],
        // The month total. Big and tight, with -1.4 tracking from text.tsx —
        // it is the one figure allowed to carry a screen.
        display: ['44px', '46px'],
      },
      spacing: {
        0.5: '2px',
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        16: '64px',
      },
    },
  },
  plugins: [],
};
