# Rent Khata

Rent and electricity ledger for a landlord with one building. Replaces the
paper khata: enter each unit's meter reading, the app works out the bill, you
mark it paid and send it to the tenant on WhatsApp.

Single user, offline, no login, no payment gateway — the person holding the
phone is the owner.

Expo SDK 57 · React Native 0.86 · TypeScript · NativeWind 4 · Drizzle + SQLite

---

## Running it

**This is a mobile app.** It runs on iOS and Android. It also loads in a
browser, but only as a preview — see the table below for what that does and
does not show you.

| | What you get | What you need |
|---|---|---|
| **Browser** | Layout, colours, type, the building view, the whole data flow | Nothing. `npm run web` |
| **Expo Go** (phone) | The real thing: glass, haptics, finger-sized targets, camera | The phone and this PC on the same Wi-Fi |
| **Dev build** | Everything, including modules Expo Go lacks | `eas build`, or Android Studio / Xcode locally |

### Browser preview

```bash
npm install
npm run web          # then open http://localhost:8081
```

Honest limits:

- **No glass.** `GLASS_MODE` resolves to `solid`, so the header and tab bar are
  flat. The frosted material only exists on a device.
- **Data is in memory.** A reload starts over from the setup wizard. There is
  no SQLite in the browser — see "Browser preview" in `AGENTS.md` for why.
- Mouse hover can't tell you whether touch targets are big enough.

Good for iterating on layout and logic. Judge the look on a phone.

### On your phone with Expo Go

```bash
npx expo start       # scan the QR with the iPhone Camera app
```

Install [Expo Go](https://expo.dev/go) first. Phone and PC must be on the same
Wi-Fi. If Expo Go hangs on "Opening project", your computer is refusing the
incoming connection — see [Troubleshooting](#troubleshooting).

Everything currently in the app runs inside Expo Go. No dev build needed yet.

### Dev build

Needed once OCR or database encryption land, since those ship native code Expo
Go doesn't bundle.

```bash
npx expo run:android          # needs Android Studio + JDK
npx eas build --profile development --platform ios    # no Mac required
```

On Windows you cannot build iOS locally. Use EAS, or a Mac.

---

## Commands

```bash
npm run web            # browser preview
npx expo start         # dev server for Expo Go / devices
npm run typecheck      # tsc --noEmit
npm test               # domain logic + the WCAG contrast guard
npm run check:contrast # just the contrast guard, on its own
npm run lint
npm run db:generate    # regenerate migrations after editing src/db/schema.ts
```

Run `typecheck` and `test` before calling anything done.

---

## Layout

```
src/
  app/         routes (Expo Router). Layout and wiring only.
  components/  presentational UI
  hooks/       compose repositories into what one screen needs
  domain/      pure rules: billing maths, status, naming. No I/O, fully tested.
  lib/         money, periods, WhatsApp message building, meter photos
  db/          storage: schema, repositories, migrations
  theme/       colour, type, motion tokens
```

`src/domain/domain.test.ts` covers the billing arithmetic — rupee rounding,
Indian digit grouping, month rollover, the overdue cutoff. It runs on plain
Node with no test framework.

**`AGENTS.md` is the contributor guide**: architecture, the storage seam, the
legibility rules, and the traps that fail silently. Read it before changing
anything in `src/db` or `src/theme`.

---

## Troubleshooting

**Expo Go stuck on "Opening project"**

Your firewall is blocking the incoming connection. The tell is that the
terminal shows no `iOS Bundled` / `Android Bundled` line at all — the phone
never reached Metro.

Windows blocks inbound connections by default on every network profile. In an
**Administrator** PowerShell:

```powershell
New-NetFirewallRule -DisplayName "Expo Metro 8081" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Any
```

Paste that as a **single line** — a wrapped paste runs each fragment as its own
command and fails confusingly.

No admin rights (a managed work laptop, say)? `npx expo start --tunnel` routes
around the firewall entirely, but sends your bundle through a third party's
servers — check that's acceptable on your machine first.

**Port 8081 already in use** — a previous Metro is still alive:

```bash
npx kill-port 8081
```

**Styles missing on a new component.** NativeWind only styles components in its
registry; anything else silently ignores `className`. Register it in
`src/theme/css-interop.ts`. This is the single most common surprise in this
codebase — `AGENTS.md` explains it.

**Blank screen with "Couldn't open your data"** — storage failed to open. The
message underneath is the real cause.

---

## Status

Working: setup wizard, building view, bill entry with auto-filled previous
readings, paid/unpaid, WhatsApp sharing, meter photos.

Not built yet: history ledger, editable settings, encrypted database with
biometric lock, JSON backup, and OCR for meter readings.
