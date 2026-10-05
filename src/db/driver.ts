import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseAsync } from 'expo-sqlite';

import migrations from './migrations/migrations';
import * as schema from './schema';
import type { DbHandle, StorageAdapter } from './types';

/**
 * Device storage adapter: real on-disk SQLite via expo-sqlite.
 *
 * Metro picks `driver.web.ts` instead when bundling for the browser, so this
 * file never has to know that a web build exists. Two adapters behind one
 * interface — see `types.ts`.
 */

const DATABASE_FILE = 'rent-khata.db';

export const adapter: StorageAdapter = {
  label: 'expo-sqlite',

  async connect(): Promise<DbHandle> {
    /*
     * `openDatabaseAsync`, not `openDatabaseSync`, even though the Drizzle
     * driver issues synchronous queries afterwards. Opening asynchronously
     * lets the native module finish initialising while the JS thread is free;
     * the synchronous path then has a live connection to talk to.
     */
    const sqlite = await openDatabaseAsync(DATABASE_FILE);
    const db = drizzle(sqlite, { schema });

    // Must complete before any repository query, or Drizzle reports
    // "no such table".
    await migrate(db, migrations);

    return db as unknown as DbHandle;
  },
};
