import * as Clipboard from 'expo-clipboard';
import { Alert, Linking } from 'react-native';

import type { Bill, Building, Unit } from '@/db/schema';
import { formatAmount, formatMoney, formatUnits } from '@/lib/money';
import { formatPeriod, type Period } from '@/lib/period';

/**
 * Sends through whatever WhatsApp the owner already has installed, via a deep
 * link. No WhatsApp Business API, no account, no server, no dependency —
 * `Linking` ships with React Native.
 */

/** Strips spaces, dashes and a leading +, then prefixes the country code. */
export function toInternational(localNumber: string, countryCode: string): string | null {
  const digits = localNumber.replace(/\D/g, '');
  if (digits.length < 6) return null;
  // Already includes the country code (e.g. pasted as 919876543210).
  if (digits.startsWith(countryCode) && digits.length > 10) return digits;
  return `${countryCode}${digits}`;
}

/**
 * WhatsApp renders *asterisks* as bold. Amounts are padded into a column so
 * the message stays legible in the chat bubble's proportional font.
 */
export function buildBillMessage(args: {
  building: Building;
  unit: Unit;
  bill: Pick<
    Bill,
    'rentPaise' | 'electricityPaise' | 'totalPaise' | 'prevReading' | 'newReading' | 'unitsConsumed' | 'ratePaisePerUnit'
  >;
  period: Period;
}): string {
  const { building, unit, bill, period } = args;
  const sym = building.currencySymbol;
  const lines: string[] = [];

  lines.push(`*Rent — ${formatPeriod(period)}*`);
  lines.push(`${unit.label} · ${building.name}`);
  lines.push('');

  if (unit.tenantName) {
    lines.push(`Hello ${unit.tenantName},`);
    lines.push('');
  }

  lines.push(`Rent                ${sym}${formatAmount(bill.rentPaise)}`);

  if (bill.electricityPaise != null) {
    lines.push(`Electricity         ${sym}${formatAmount(bill.electricityPaise)}`);
    if (bill.prevReading != null && bill.newReading != null) {
      lines.push(
        `  ${formatUnits(bill.prevReading)} → ${formatUnits(bill.newReading)} = ${formatUnits(
          bill.unitsConsumed
        )} units × ${formatMoney(bill.ratePaisePerUnit, sym)}`
      );
    }
  }

  lines.push('');
  lines.push(`*TOTAL              ${sym}${formatAmount(bill.totalPaise)}*`);
  lines.push('');
  lines.push('Kindly pay at your earliest convenience. Thank you!');

  return lines.join('\n');
}

export type ShareResult = 'opened' | 'copied' | 'cancelled' | 'noNumber';

/**
 * Tries the native app scheme first, then the universal `wa.me` link, then
 * offers the clipboard. The `wa.me` fallback matters: it opens a chat even
 * for a number that is not in the owner's contacts, and it works when only
 * WhatsApp Business is installed.
 */
export async function shareToWhatsApp(
  message: string,
  internationalNumber: string | null
): Promise<ShareResult> {
  if (!internationalNumber) return 'noNumber';

  const text = encodeURIComponent(message);
  const candidates = [
    `whatsapp://send?phone=${internationalNumber}&text=${text}`,
    `https://wa.me/${internationalNumber}?text=${text}`,
  ];

  for (const url of candidates) {
    try {
      // Note: canOpenURL for the whatsapp:// scheme needs
      // ios.infoPlist.LSApplicationQueriesSchemes to include "whatsapp",
      // otherwise it always returns false on iOS.
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        return 'opened';
      }
    } catch {
      // Try the next candidate rather than failing the whole share.
    }
  }

  return new Promise<ShareResult>((resolve) => {
    Alert.alert(
      'WhatsApp not available',
      'Couldn’t open WhatsApp on this device. Copy the message instead?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve('cancelled') },
        {
          text: 'Copy message',
          onPress: async () => {
            await Clipboard.setStringAsync(message);
            resolve('copied');
          },
        },
      ]
    );
  });
}
