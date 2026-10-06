import { seedPreview } from './preview/seed';
import { resetTables } from './preview/store';
import type { StorageAdapter } from './types';

/**
 * Browser preview adapter.
 *
 * There is no SQL engine here. The sibling `repo/*.web.ts` modules read and
 * write `preview/store.ts` directly, so nothing on web ever calls `getDb()`
 * and this adapter returns no handle at all.
 *
 * See `preview/store.ts` for why emulating SQLite in the browser was
 * abandoned.
 */
export const adapter: StorageAdapter = {
  label: 'in-memory preview',

  async connect() {
    // A reload is a fresh start. It lands on a furnished building rather
    // than an empty wizard, because the point of the preview is to look at
    // the interface, and an empty app shows almost none of it.
    resetTables();
    seedPreview();
    return null;
  },
};
