import type Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';

/**
 * What a unit's month looks like.
 *
 * `vacant` is deliberately separate from `notBilled`. Both have no bill, but
 * they mean opposite things to a landlord: one is nothing to do, the other is
 * work outstanding. Folding them together made "every unit paid" unreachable
 * in any building with an empty flat, and reported vacancies as chores.
 */
export type BillStatus = 'paid' | 'due' | 'overdue' | 'notBilled' | 'vacant';

type FeatherName = ComponentProps<typeof Feather>['name'];

/**
 * Every status carries an icon AND a word, not just a colour. Around 8% of
 * men have red/green colour vision deficiency, and across a whole building
 * the glyph is what actually reads — colour alone turns the elevation into an
 * ambiguous mosaic.
 */
export const STATUS_META: Record<
  BillStatus,
  { label: string; short: string; icon: FeatherName; fg: string; bg: string; border: string }
> = {
  paid: {
    label: 'Paid',
    short: 'Paid',
    icon: 'check',
    fg: 'text-paid',
    bg: 'bg-paid-muted',
    border: 'border-paid',
  },
  due: {
    label: 'Payment due',
    short: 'Due',
    icon: 'clock',
    fg: 'text-due',
    bg: 'bg-due-muted',
    border: 'border-border',
  },
  overdue: {
    label: 'Overdue',
    short: 'Overdue',
    icon: 'alert-circle',
    fg: 'text-overdue',
    bg: 'bg-overdue-muted',
    border: 'border-overdue',
  },
  notBilled: {
    label: 'Not billed yet',
    short: 'No bill',
    icon: 'edit-3',
    fg: 'text-neutral',
    bg: 'bg-neutral-muted',
    border: 'border-border',
  },
  vacant: {
    label: 'Vacant',
    short: 'Vacant',
    icon: 'minus',
    fg: 'text-neutral',
    bg: 'bg-transparent',
    border: 'border-border',
  },
};

/** Day of the following month after which an unpaid bill counts as overdue. */
const OVERDUE_AFTER_DAY = 10;

export type StatusInput = {
  /** False when the unit has no tenant — nothing can be owed on an empty flat. */
  hasTenant: boolean;
  bill: { isPaid: boolean; totalPaise: number | null } | null | undefined;
};

/**
 * An empty unit is `vacant`. A tenanted unit with no reading entered is
 * `notBilled`. Once billed it is `due` until marked paid, and tips to
 * `overdue` once past OVERDUE_AFTER_DAY of the *following* month.
 *
 * @param period billing month as 'YYYY-MM'
 * @param now    injected so this stays pure and testable
 */
export function deriveStatus(
  input: StatusInput,
  period: string,
  now: Date = new Date()
): BillStatus {
  const { hasTenant, bill } = input;

  // Checked before the bill: a flat can be vacated after being billed, and
  // the bill history stays, but there is nobody to chase today.
  if (!hasTenant && !bill) return 'vacant';
  if (!bill || bill.totalPaise == null) return hasTenant ? 'notBilled' : 'vacant';
  if (bill.isPaid) return 'paid';

  const [year, month] = period.split('-').map(Number);
  // `month` is 1-based in the period string, so using it as a 0-based index
  // already lands on the *following* month.
  const dueCutoff = new Date(year, month, OVERDUE_AFTER_DAY, 23, 59, 59);
  return now > dueCutoff ? 'overdue' : 'due';
}

/** True when the landlord still has something to do about this unit. */
export function needsAttention(status: BillStatus): boolean {
  return status === 'due' || status === 'overdue' || status === 'notBilled';
}
