import { useEffect, useState } from 'react';

import { saveBill, setPaid } from '@/db/repo/bills';
import { updateUnit } from '@/db/repo/units';
import { checkReading, computeBill, type BillComputation, type ReadingWarning } from '@/domain/bill';
import { parseInteger, parseMoneyToPaise } from '@/lib/money';
import type { Period } from '@/lib/period';

import type { UnitBillData } from './use-unit-bill';

/**
 * Everything the bill-entry screen needs to hold while the user types.
 *
 * Extracted from the screen so the screen is only layout. Totals recompute on
 * every keystroke, nothing touches storage until the user commits, and the
 * three commit paths (save, mark paid, share) all persist through one function
 * so they cannot drift apart.
 */
export type BillDraft = {
  /** The unit number shown on the door. Editable after setup. */
  labelText: string;
  setLabelText: (value: string) => void;
  tenantName: string;
  setTenantName: (value: string) => void;
  tenantPhone: string;
  setTenantPhone: (value: string) => void;
  rentText: string;
  setRentText: (value: string) => void;
  readingText: string;
  setReadingText: (value: string) => void;
  /** Editable: a meter gets misread, swapped, or corrected after the fact. */
  previousText: string;
  setPreviousText: (value: string) => void;
  /** Optional meter photo kept with the bill as proof of the reading. */
  photoUri: string | null;
  setPhotoUri: (uri: string | null) => void;

  /** No earlier bill exists, so this is the unit's first ever reading. */
  isFirstReading: boolean;
  /** Previous reading in force, from history or the opening value. */
  previousReading: number | null;
  /** Parsed new reading, or null while the field is empty/invalid. */
  newReading: number | null;
  rentPaise: number;
  computed: BillComputation;
  warning: ReadingWarning | null;

  busy: boolean;
  /** Writes the tenant details and the bill. Returns once stored. */
  commit: () => Promise<void>;
  togglePaid: () => Promise<void>;
};

export function useBillDraft(data: UnitBillData | null | undefined, period: Period): BillDraft {
  const [labelText, setLabelText] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [rentText, setRentText] = useState('');
  const [readingText, setReadingText] = useState('');
  const [previousText, setPreviousText] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [busy, setBusy] = useState(false);

  // Seed once from storage. Re-seeding on every change would fight the user's
  // typing, since each keystroke triggers a refetch through the change feed.
  useEffect(() => {
    if (!data || seeded) return;

    setLabelText(data.unit.label);
    setTenantName(data.unit.tenantName ?? '');
    setTenantPhone(data.unit.tenantPhone ?? '');
    setRentText(String(Math.round(data.rentPaise / 100)));
    setReadingText(data.bill?.newReading != null ? String(data.bill.newReading) : '');
    // Seeded from whatever we resolved: last month closing figure, or the
    // one-time opening reading. Editable either way.
    setPreviousText(data.prevReading != null ? String(data.prevReading) : '');
    setPhotoUri(data.bill?.photoUri ?? null);
    setSeeded(true);
  }, [data, seeded]);

  /**
   * True when no earlier bill exists, so this is the unit's very first
   * reading. Only changes the wording and the hint — the field itself is
   * editable in both cases.
   */
  const isFirstReading = !data?.prevReadingIsDerived;
  const previousReading = parseInteger(previousText);
  const newReading = parseInteger(readingText);
  const rentPaise = parseMoneyToPaise(rentText) ?? data?.rentPaise ?? 0;
  const ratePaisePerUnit = data?.ratePaisePerUnit ?? 0;

  const computed = computeBill({ rentPaise, ratePaisePerUnit, prevReading: previousReading, newReading });
  const warning = checkReading(previousReading, newReading, data?.typical);

  async function commit() {
    if (!data) return;

    await updateUnit(data.unit.id, {
      // An empty box must not wipe the number — fall back to what it was.
      label: labelText.trim() || data.unit.label,
      tenantName: tenantName.trim() || null,
      tenantPhone: tenantPhone.replace(/\D/g, '') || null,
      // Keep the unit's opening reading in step while this is still the
      // first bill; later months carry their own prevReading on the row.
      ...(isFirstReading && previousReading != null
        ? { openingReading: previousReading }
        : {}),
    });

    await saveBill({
      unitId: data.unit.id,
      period,
      rentPaise,
      ratePaisePerUnit,
      prevReading: previousReading,
      newReading,
      photoUri,
    });
  }

  async function runExclusively(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return {
    labelText,
    setLabelText,
    tenantName,
    setTenantName,
    tenantPhone,
    setTenantPhone,
    rentText,
    setRentText,
    readingText,
    setReadingText,
    previousText,
    setPreviousText,
    photoUri,
    setPhotoUri,

    isFirstReading,
    previousReading,
    newReading,
    rentPaise,
    computed,
    warning,

    busy,
    commit: () => runExclusively(commit),
    togglePaid: () =>
      runExclusively(async () => {
        if (!data) return;
        // Save first: marking an unsaved bill paid would have no row to mark.
        if (!data.bill) await commit();
        await setPaid(data.unit.id, period, !(data.bill?.isPaid ?? false));
      }),
  };
}
