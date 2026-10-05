import { adapter } from './driver';
import type { DbHandle } from './types';

export type { DbHandle } from './types';

/**
 * The storage seam.
 *
 * Everything outside `src/db` talks to the database through this module and
 * the repositories in `src/db/repo`. Nothing else imports a Drizzle driver,
 * which is what makes the device/browser split invisible to screens — and
 * what would let Turso or PowerSync slot in later as a third adapter.
 */

let instance: DbHandle | null = null;
let connecting: Promise<void> | null = null;

/**
 * Connects once and reuses the result. Safe to call repeatedly.
 *
 * Deliberately not a top-level `const db = ...`: that runs at import time, so
 * a failure propagates through the module graph before React mounts anything
 * and the user gets a blank screen with the real cause buried in a console.
 * Returning a promise lets the root layout render a real error instead.
 */
export function openDatabase(): Promise<void> {
  connecting ??= adapter.connect().then((db) => {
    instance = db;
  });
  return connecting;
}

/**
 * The SQL handle, for repositories only.
 *
 * Throws when there is nothing to hand back, which happens in two cases worth
 * telling apart in the message: storage has not finished opening yet, or this
 * backend has no SQL at all (the browser preview) and a repository is missing
 * its `.web.ts` counterpart.
 */
export function getDb(): DbHandle {
  if (!instance) {
    throw new Error(
      `No SQL handle available from the "${adapter.label}" backend. ` +
        `Either storage has not finished opening, or this repository needs a ` +
        `.web.ts counterpart — see src/db/preview/store.ts.`
    );
  }
  return instance;
}

type ChangeListener = () => void;
const listeners = new Set<ChangeListener>();

/**
 * Announces that stored data changed. Every repository write calls this as its
 * last step; `useQuery` listens and refetches.
 *
 * Why not expo-sqlite's own `addDatabaseChangeListener`? It exists only on the
 * native adapter, so depending on it would have put a platform fork inside
 * the query hook and left web silently stale. One explicit signal behaves the
 * same everywhere and is far easier to reason about when a screen does not
 * refresh.
 *
 * The cost is that a new write must remember to call it — which is why writes
 * are confined to `src/db/repo`.
 */
export function notifyChange(): void {
  for (const listener of listeners) listener();
}

export function subscribeToChanges(listener: ChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Single clock for every stored timestamp, so tests can reason about order. */
export function nowMs(): number {
  return Date.now();
}
