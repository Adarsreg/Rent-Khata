This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

---

# Rent Khata — project conventions

A single-user, offline, owner-only rent + electricity ledger. No login, no
backend, no payment gateway. The person holding the phone is the landlord.

## Commands

```bash
npm run typecheck   # tsc --noEmit
npm test            # pure domain logic, node:test + native type stripping
npm run db:generate   # after editing src/db/schema.ts
npm run check:contrast # WCAG AA guard on the palette
npm run web           # browser preview (mobile app; preview only)
```

Run all three before declaring a task done.

## Traps that fail silently

**NativeWind only styles registered components.** Its JSX transform does
`interopComponents.get(type) ?? type`, so a component that is not registered
receives a literal `className` string, ignores it, and renders unstyled — no
warning. The registry covers core React Native plus SafeAreaView; everything
else is registered in `src/theme/css-interop.ts`. **Any new third-party or
`Animated.createAnimatedComponent` component needs a `cssInterop(...)` call
there**, or its styling will vanish for no visible reason.

**NativeWind must stay on v4.** v5 is a release candidate and drops the
`className` pass-through props that components here rely on. Do not upgrade.

**`react-native-worklets/plugin` must not be added to babel.config.js.**
`babel-preset-expo` adds it automatically when the package is installed;
listing it applies it twice.

**Run `migrate()` before querying.** `useMigrations` in the root layout gates
all rendering on `success`; querying earlier throws `no such table`.

## Layers

```
app/        routes only — layout and wiring, no business rules
components/ presentational UI; no storage imports
hooks/      compose repositories into what one screen needs
domain/     pure rules: billing maths, status, naming, rates. No I/O.
lib/        pure utilities: money, periods, WhatsApp message building
db/         storage seam (see below)
theme/      design tokens
```

**Pure rules go in `domain/`, never in `db/repo/`.** A repository reads and
writes rows; deciding *what* to charge or *what* to call a flat is a domain
rule. Anything pure is directly unit-testable in `src/domain/domain.test.ts`
with no database — that file is the reason this split exists.

## Data layer

`src/db/` is the **only** place allowed to import a Drizzle driver. Screens
call `src/db/repo/*`, which exposes plain `async` functions — never Drizzle
query builders. That boundary is what lets Turso/PowerSync/Supabase slot in
later; a cloud-backed repository returns a promise, not a builder. It is also
why screens use `useQuery` from `src/db/use-query.ts` rather than Drizzle's
`useLiveQuery`.

**The storage seam has two adapters**, chosen by Metro's platform resolution:

| | device (`*.ts`) | browser (`*.web.ts`) |
|---|---|---|
| driver | `driver.ts` — expo-sqlite | `driver.web.ts` — no SQL at all |
| repositories | `repo/*.ts` — Drizzle | `repo/*.web.ts` — `preview/store.ts` arrays |

Web is **preview only**; this is a mobile app. Don't try to run SQLite in the
browser — expo-sqlite's web build busy-waits the main thread on `Atomics` and
wedges the tab (Drizzle's expo driver is sync-only), and sql.js's asm build
hangs compiling. `preview/store.ts` documents this in full.

Rules for the seam:

- **Every repository write must end with `notifyChange()`** from `client.ts`.
  That is what refreshes screens. It replaces expo-sqlite's native change
  listener so both platforms behave identically.
- **A `.web.ts` repository must mirror its `.ts` sibling.** Each one ends with
  a `_signatureCheck` block that fails typecheck if they drift. Keep it.
- **Shared repository types live in `repo/types.ts`**, never in an
  implementation — on web, `from './bills'` resolves back to `bills.web.ts`
  and forms a cycle.
- Reaching `getDb()` on web throws a pointed error: it means a repository is
  missing its `.web.ts` counterpart.

Every table carries `id` (client UUID), `updatedAt`, `deletedAt`. Deletes are
soft — a hard delete cannot be synced.

**Money is integer paise, never a float, never rupees.** Convert only at the
UI edge via `src/lib/money.ts`. Billing periods are `'YYYY-MM'` strings, not
Dates, so a month label cannot shift across timezones.

Rent and rate are **snapshot onto each bill row**. Raising the rate must never
rewrite an earlier month's bill.

## Design system

- Tokens: `src/theme/palette.js` is the single source of truth for color,
  `require`d by `tailwind.config.js` and imported by `src/theme/tokens.ts`.
  Values reach components as CSS variables declared in `src/global.css`.
  Edit the palette, then update the variables in `global.css` to match.
- Prefer `className` in markup; use `useColors()` only where a className
  cannot reach (Reanimated worklets, icon `color` props, StatusBar).
- **Glass goes on chrome, never on content.** `<Surface>` for headers, tab
  bars, sheets, FABs; `<Card>` (opaque) for anything holding a number.
- Motion uses the spring presets in `tokens.motion` — never durations/easings.
  `motion.expressive` is reserved for marking a unit paid.
- Status must always render **color + icon + label** (`src/domain/status.ts`),
  never color alone.
- Currency and meter values get `<Text numeric>` for tabular figures.

## Legibility rules (non-negotiable)

The audience is landlords of every age reading money on a phone, often
outdoors. These are requirements, not preferences:

- **Minimum font size is 14px.** There is no `text-xs`/12px tier and nothing
  here justifies adding one. Go through `<Text variant>`; don't set raw sizes.
- **Every text color clears WCAG AA 4.5:1** against the worst-case surface it
  can land on — not just the base surface. `npm run check:contrast` enforces
  this and exits non-zero on a regression. **Run it after any palette edit.**
- **`brand` is a fill; `brandText` is a glyph.** A violet that passes with
  white on top of it is too dark to read *as* text on the canvas, so there are
  two tokens. Using `text-brand` instead of `text-brand-text` fails contrast.
- **Minimum touch target is 48dp** (`MIN_TOUCH`), the larger of Apple's 44pt
  and Material's 48dp.
- **Never disable OS font scaling.** `<Text>` sets `maxFontSizeMultiplier` per
  variant so large-text settings work without breaking the building
  elevation. Don't pass `allowFontScaling={false}`.
- **No all-caps labels.** Uppercase removes word shape and costs legibility;
  it is also a recognisable tell of a templated layout. Use `variant="kicker"`
  (sentence case) where an eyebrow line is genuinely needed.
- Status is always **color + icon + word**. Never color alone.

## Phases still open
History ledger, settings editing, SQLCipher + biometric app lock, JSON
backup/restore, and meter-photo OCR (`expo-camera` +
`@react-native-ml-kit/text-recognition`, pre-filling an editable field only —
it must never commit a reading by itself). OCR and SQLCipher both need a dev
build; everything before them runs in Expo Go.

When adding a repository function, remember the three steps: the `.ts`
implementation, the `.web.ts` counterpart, and `notifyChange()` on writes.
