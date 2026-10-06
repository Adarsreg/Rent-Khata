import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { exportAll, replaceAll } from '@/db/repo/building';

/**
 * JSON backup and restore.
 *
 * Until there is a server, this is the *only* thing standing between a
 * landlord and losing years of records with a lost phone — which makes it a
 * launch requirement for a financial ledger, not a nice-to-have.
 *
 * Plain JSON on purpose: the owner can open it, read it, and keep a copy in
 * their own email or drive without this app's cooperation.
 */

const FORMAT_VERSION = 1;

type BackupFile = {
  format: 'rent-khata-backup';
  version: number;
  exportedAt: string;
  data: Awaited<ReturnType<typeof exportAll>>;
};

export type RestoreResult =
  | { status: 'restored'; units: number; bills: number }
  | { status: 'cancelled' }
  | { status: 'invalid'; reason: string };

/** Writes a backup and hands it to the share sheet. */
export async function exportBackup(): Promise<{ status: 'shared' | 'unavailable' }> {
  const payload: BackupFile = {
    format: 'rent-khata-backup',
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data: await exportAll(),
  };

  const directory = new Directory(Paths.cache, 'backups');
  if (!directory.exists) directory.create({ intermediates: true });

  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(directory, `rent-khata-${stamp}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(payload, null, 2));

  if (!(await Sharing.isAvailableAsync())) return { status: 'unavailable' };

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Save your Rent Khata backup',
  });

  return { status: 'shared' };
}

/**
 * Asks for a backup file and replaces everything with its contents.
 *
 * Validated before anything is written. A half-applied restore would be worse
 * than a failed one, so a malformed file is rejected outright with a reason
 * the owner can act on.
 */
export async function restoreBackup(): Promise<RestoreResult> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json'] });
  if (picked.canceled) return { status: 'cancelled' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(picked.result.textSync());
  } catch {
    return { status: 'invalid', reason: 'That file isn’t readable JSON.' };
  }

  const problem = validate(parsed);
  if (problem) return { status: 'invalid', reason: problem };

  const backup = parsed as BackupFile;
  await replaceAll(backup.data);

  return {
    status: 'restored',
    units: backup.data.units.length,
    bills: backup.data.bills.length,
  };
}

/** Returns a human-readable problem, or null when the file is usable. */
function validate(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return 'That file isn’t a backup.';

  const candidate = value as Partial<BackupFile>;

  if (candidate.format !== 'rent-khata-backup') {
    return 'That file isn’t a Rent Khata backup.';
  }
  if (typeof candidate.version !== 'number' || candidate.version > FORMAT_VERSION) {
    return 'That backup was made by a newer version of the app. Update first.';
  }
  if (!candidate.data) return 'That backup is empty.';

  for (const table of ['buildings', 'floors', 'units', 'bills'] as const) {
    if (!Array.isArray(candidate.data[table])) {
      return `That backup is missing its ${table}.`;
    }
  }

  return null;
}
