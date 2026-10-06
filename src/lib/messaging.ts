import * as Clipboard from 'expo-clipboard';
import { Linking, Platform } from 'react-native';

export { toInternational } from './phone';

/**
 * Delivering a bill to a tenant.
 *
 * Everything here hands off to an app the owner already has. There is no
 * messaging account, no gateway and no server: the owner taps send in
 * WhatsApp or in their SMS app, from their own number, so the tenant sees a
 * message from their landlord rather than from a short code.
 *
 * (A server would only be needed to send *without* the owner tapping send —
 * bulk reminders on a schedule. That is a later problem, and it is the only
 * part of this that needs one.)
 */

export type Channel = 'whatsapp' | 'sms' | 'clipboard';

export type SendOutcome =
  | { status: 'opened'; channel: Channel }
  | { status: 'copied' }
  | { status: 'unavailable'; channel: Channel }
  | { status: 'noNumber' };

/**
 * Opens WhatsApp on the tenant's chat with the bill pre-filled.
 *
 * Tries the app scheme first, then `wa.me`. The second matters for two
 * reasons: it opens a chat even for a number not saved in the owner's
 * contacts, and it works when only WhatsApp Business is installed.
 *
 * Availability is decided by *attempting* the link rather than by
 * `canOpenURL`. On Android 11+ `canOpenURL` reports false for any package not
 * declared in the manifest's `<queries>`, so it would claim WhatsApp was
 * missing on devices that have it.
 */
export async function sendViaWhatsApp(
  message: string,
  internationalNumber: string | null
): Promise<SendOutcome> {
  if (!internationalNumber) return { status: 'noNumber' };

  const text = encodeURIComponent(message);

  for (const url of [
    `whatsapp://send?phone=${internationalNumber}&text=${text}`,
    `https://wa.me/${internationalNumber}?text=${text}`,
  ]) {
    try {
      await Linking.openURL(url);
      return { status: 'opened', channel: 'whatsapp' };
    } catch {
      // Try the next form before concluding WhatsApp is absent.
    }
  }

  return { status: 'unavailable', channel: 'whatsapp' };
}

/**
 * Opens the phone's SMS app with the tenant's number and the bill pre-filled.
 * Works today on both platforms with no server.
 *
 * The query separator genuinely differs: iOS wants `&body=`, Android wants
 * `?body=`. Using the wrong one drops the message text and the owner has to
 * retype the whole bill.
 */
export async function sendViaSms(
  message: string,
  internationalNumber: string | null
): Promise<SendOutcome> {
  if (!internationalNumber) return { status: 'noNumber' };

  const separator = Platform.OS === 'ios' ? '&' : '?';
  const url = `sms:+${internationalNumber}${separator}body=${encodeURIComponent(message)}`;

  try {
    await Linking.openURL(url);
    return { status: 'opened', channel: 'sms' };
  } catch {
    return { status: 'unavailable', channel: 'sms' };
  }
}

/** Last resort, and the only channel that always works. */
export async function copyToClipboard(message: string): Promise<SendOutcome> {
  await Clipboard.setStringAsync(message);
  return { status: 'copied' };
}

export async function send(
  channel: Channel,
  message: string,
  internationalNumber: string | null
): Promise<SendOutcome> {
  switch (channel) {
    case 'whatsapp':
      return sendViaWhatsApp(message, internationalNumber);
    case 'sms':
      return sendViaSms(message, internationalNumber);
    case 'clipboard':
      return copyToClipboard(message);
  }
}
