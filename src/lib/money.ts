/**
 * Money is stored and passed around as integer **paise**, never rupees as a
 * float. `0.1 + 0.2 !== 0.3`, and a ledger that quietly drifts by a paise per
 * bill is worse than useless. Convert only at the UI edge.
 */

/** Indian digit grouping: 12,34,567 — not the 1,234,567 that Intl may give. */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
}

/**
 * `684000` → `"₹6,840"`. Paise are shown only when non-zero, since rents and
 * electricity bills are whole rupees in practice and `₹6,840.00` is noise.
 */
export function formatMoney(paise: number | null | undefined, symbol = '₹'): string {
  if (paise == null) return '—';
  const negative = paise < 0;
  const abs = Math.abs(Math.round(paise));
  const rupees = Math.floor(abs / 100);
  const remainder = abs % 100;
  const body = groupIndian(String(rupees)) + (remainder ? `.${String(remainder).padStart(2, '0')}` : '');
  return `${negative ? '-' : ''}${symbol}${body}`;
}

/** Same as formatMoney but without the currency symbol, for table columns. */
export function formatAmount(paise: number | null | undefined): string {
  return formatMoney(paise, '');
}

/**
 * Parse what a landlord actually types — `"6840"`, `"6,840"`, `"₹6840.50"`,
 * `" 6840 "`. Returns null for anything that is not a usable number so the
 * caller can keep the field in an un-saveable state rather than storing 0.
 */
export function parseMoneyToPaise(input: string): number | null {
  const cleaned = input.replace(/[^\d.]/g, '');
  if (!cleaned || cleaned === '.') return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** Whole-number input (meter readings, unit counts). */
export function parseInteger(input: string): number | null {
  const cleaned = input.replace(/[^\d]/g, '');
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isSafeInteger(value) ? value : null;
}

/** `1234` → `"1,234"` for meter readings and consumed units. */
export function formatUnits(units: number | null | undefined): string {
  if (units == null) return '—';
  return groupIndian(String(Math.abs(Math.round(units))));
}
