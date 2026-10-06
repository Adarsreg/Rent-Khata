/**
 * Phone number normalisation.
 *
 * Pure and dependency-free so it can be unit-tested — the rules here are
 * fiddly enough to be worth pinning down, and getting one wrong means a bill
 * silently goes to the wrong person.
 */

/**
 * Turns what a landlord typed into a dialable international number, without
 * the leading `+`.
 *
 * Accepts the shapes people actually enter: `98765 43210`, `098765-43210`,
 * `+91 98765 43210`, `919876543210`.
 *
 * Returns null when there is not enough to dial, so the caller can keep the
 * send action disabled rather than opening a chat with a mangled number.
 */
export function toInternational(localNumber: string, countryCode: string): string | null {
  let digits = localNumber.replace(/\D/g, '');
  if (!digits) return null;

  // Already carries the country code (pasted from elsewhere).
  if (digits.startsWith(countryCode) && digits.length > countryCode.length + 6) {
    return digits;
  }

  // A domestic trunk prefix is meaningless once the country code is attached:
  // India writes 098765 43210 for the same number as +91 98765 43210.
  if (digits.length > 10 && digits.startsWith('0')) digits = digits.replace(/^0+/, '');
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);

  if (digits.length < 7) return null;

  return `${countryCode}${digits}`;
}

/** `'919876543210'` with code `'91'` → `'+91 98765 43210'`, for display. */
export function formatPhoneForDisplay(
  internationalNumber: string | null,
  countryCode: string
): string {
  if (!internationalNumber) return '—';

  const local = internationalNumber.startsWith(countryCode)
    ? internationalNumber.slice(countryCode.length)
    : internationalNumber;

  // Indian mobile numbers group 5+5; anything else is left alone rather than
  // forced into a grouping that may be wrong for that country.
  const grouped = local.length === 10 ? `${local.slice(0, 5)} ${local.slice(5)}` : local;

  return `+${countryCode} ${grouped}`;
}
