import type { Bill, Building, Floor, Unit } from '../schema';

/**
 * In-memory stand-in for the database, used only by the browser preview.
 *
 * Rent Khata is a mobile app. This exists so the interface can be reviewed on
 * a desktop without a device, and it replaces the entire storage stack rather
 * than emulating SQLite: expo-sqlite's web build busy-waits the main thread on
 * `Atomics` (which wedges the tab, since Drizzle's expo driver is sync-only),
 * and sql.js's asm build hangs compiling megabytes of JavaScript. Plain arrays
 * are instant, need no WebAssembly, and add no dependency.
 *
 * Metro resolves the sibling `*.web.ts` repositories automatically, so no
 * screen or hook knows this file exists.
 */
export type PreviewTables = {
  buildings: Building[];
  floors: Floor[];
  units: Unit[];
  bills: Bill[];
};

export const tables: PreviewTables = {
  buildings: [],
  floors: [],
  units: [],
  bills: [],
};

export function resetTables(): void {
  tables.buildings = [];
  tables.floors = [];
  tables.units = [];
  tables.bills = [];
}

/** Rows are handed out as copies so a screen cannot mutate the store. */
export function clone<T>(row: T): T {
  return { ...row };
}

export function liveRows<T extends { deletedAt: number | null }>(rows: T[]): T[] {
  return rows.filter((row) => row.deletedAt == null).map(clone);
}
