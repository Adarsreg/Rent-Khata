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
  openingText: string;
  setOpeningText: (value: string) => void;
  /** Optional meter photo kept with the bill as proof of the reading. */
  photoUri: string | null;
  setPhotoUri: (uri: string | null) => void;

  /** True until the unit's one-time opening reading has been established. */
  needsOpeningReading: boolean;
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
  const [openingText, setOpeningText] = useState('');
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
    setOpeningText(data.unit.openingReading != null ? String(data.unit.openingReading) : '');
    setPhotoUri(data.bill?.photoUri ?? null);
    setSeeded(true);
  }, [data, seeded]);

  const needsOpeningReading = !data?.prevReadingIsDerived;
  const previousReading = needsOpeningReading
    ? parseInteger(openingText)
    : (data?.prevReading ?? null);
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
      // The opening reading is written once and then never again; after that
      // the previous reading comes from the prior bill.
      ...(needsOpeningReading && previousReading != null
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
    openingText,
    setOpeningText,
    photoUri,
    setPhotoUri,

    needsOpeningReading,
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
