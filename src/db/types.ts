import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from './schema';

/**
 * The one database type the rest of the app knows about.
 *
 * Both adapters resolve to a `'sync'`-mode Drizzle database — expo-sqlite on
 * device, sql.js in the browser — so repository code, including transactions,
 * is identical on both. Widening this to the shared base type rather than
 * either concrete driver is what keeps the seam real instead of nominal.
 */
export type DbHandle = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

/** Contract every storage adapter must satisfy. See `driver.ts`. */
export type StorageAdapter = {
  /**
   * Open storage and bring the schema up to date.
   *
   * Resolves to `null` for backends that expose no SQL handle at all — the
   * browser preview keeps rows in plain arrays, and its repositories never
   * ask for one. `getDb()` then throws a pointed error rather than handing
   * back something unusable.
   */
  connect: () => Promise<DbHandle | null>;
  /** Human-readable name, for error messages and logs. */
  readonly label: string;
};
