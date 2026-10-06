/**
 * Billing months as `'YYYY-MM'` strings.
 *
 * Deliberately not Date objects: a period is a label for a calendar month,
 * not an instant. Storing a Date makes "October" shift to September for a
 * user east of UTC, which is exactly the class of bug a rent ledger cannot
 * afford. Strings also sort lexicographically for free.
 */
export type Period = string;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function toPeriod(date: Date): Period {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function currentPeriod(now: Date = new Date()): Period {
  return toPeriod(now);
}

function parts(period: Period): [number, number] {
  const [y, m] = period.split('-').map(Number);
  return [y, m];
}

export function shiftPeriod(period: Period, months: number): Period {
  const [y, m] = parts(period);
  // Date normalises month overflow/underflow across year boundaries.
  return toPeriod(new Date(y, m - 1 + months, 1));
}

export const prevPeriod = (p: Period) => shiftPeriod(p, -1);
export const nextPeriod = (p: Period) => shiftPeriod(p, 1);

/** `'2026-10'` → `'October 2026'` */
export function formatPeriod(period: Period): string {
  const [y, m] = parts(period);
  return `${MONTHS[m - 1]} ${y}`;
}

/** Blocks the month switcher from running into the future. */
export function isFuturePeriod(period: Period, now: Date = new Date()): boolean {
  return period > currentPeriod(now);
}

