import type { ComponentProps } from 'react';
import type Feather from '@expo/vector-icons/Feather';

export type BillStatus = 'paid' | 'due' | 'overdue' | 'notBilled';

type FeatherName = ComponentProps<typeof Feather>['name'];

/**
 * Every status carries an icon AND a word, not just a color. Two reasons:
 * ~8% of men have red/green color vision deficiency, and at a glance across a
 * whole building the glyph is what actually reads — color alone turns the
 * elevation into an ambiguous mosaic.
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
    border: 'border-due',
  },
  overdue: {
    label: 'Overdue',
    short: 'Overdue',
    icon: 'alert-triangle',
    fg: 'text-overdue',
    bg: 'bg-overdue-muted',
    border: 'border-overdue',
  },
  notBilled: {
    label: 'Not billed yet',
    short: 'No bill',
    icon: 'minus',
    fg: 'text-neutral',
    bg: 'bg-neutral-muted',
    border: 'border-border',
  },
};

/** Day of the following month after which an unpaid bill counts as overdue. */
const OVERDUE_AFTER_DAY = 10;

/**
 * A bill with no reading entered is `notBilled`. Once billed it is `due`
 * until marked paid, and tips to `overdue` once we are past
 * OVERDUE_AFTER_DAY of the *next* month.
 *
 * @param period  billing month as 'YYYY-MM'
 * @param now     injected so this stays a pure function and is testable
 */
export function deriveStatus(
  bill: { isPaid: boolean; totalPaise: number | null } | null | undefined,
  period: string,
  now: Date = new Date()
): BillStatus {
  if (!bill || bill.totalPaise == null) return 'notBilled';
  if (bill.isPaid) return 'paid';

  const [year, month] = period.split('-').map(Number);
  // Month is 1-based in the period string; `month` as a 0-based index is
  // therefore already the *following* month.
  const dueCutoff = new Date(year, month, OVERDUE_AFTER_DAY, 23, 59, 59);
  return now > dueCutoff ? 'overdue' : 'due';
}
