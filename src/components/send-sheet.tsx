import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MessageStyle } from '@/lib/bill-message';
import { send, type Channel, type SendOutcome } from '@/lib/messaging';
import { useLayout } from '@/theme/layout';
import { useColors } from '@/theme/tokens';

import { PressableScale } from './pressable-scale';
import { Text } from './text';

type IconName = ComponentProps<typeof Feather>['name'];

/**
 * How to send a bill.
 *
 * A chooser rather than a single button, because WhatsApp is the common case
 * but not the only one: plenty of tenants do not have it, and a landlord
 * should not have to find out by hitting a dead end. If WhatsApp turns out to
 * be missing, the sheet stays open and says so, with SMS right there.
 */
export function SendSheet({
  visible,
  onClose,
  buildMessage,
  internationalNumber,
  tenantName,
}: {
  visible: boolean;
  onClose: () => void;
  /** Called per channel: WhatsApp takes bold markers, SMS must not. */
  buildMessage: (style: MessageStyle) => string;
  /** Null when no usable phone number has been entered yet. */
  internationalNumber: string | null;
  tenantName: string | null;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, gutter } = useLayout();

  const [busy, setBusy] = useState<Channel | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function choose(channel: Channel) {
    setBusy(channel);
    setNotice(null);
    try {
      const style: MessageStyle = channel === 'whatsapp' ? 'whatsapp' : 'plain';
      const outcome = await send(channel, buildMessage(style), internationalNumber);
      const text = describe(outcome);

      if (outcome.status === 'opened' || outcome.status === 'copied') {
        setNotice(text);
        // Leave the sheet up briefly so the confirmation is readable, then
        // get out of the way.
        setTimeout(onClose, outcome.status === 'copied' ? 1200 : 400);
      } else {
        setNotice(text);
      }
    } finally {
      setBusy(null);
    }
  }

  const who = tenantName?.trim() || 'this tenant';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel="Dismiss"
        onPress={onClose}
        style={{ flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' }}>
        {/* Swallow taps inside the sheet so it does not dismiss itself. */}
        <Pressable
          onPress={() => {}}
          style={{
            width: '100%',
            maxWidth: contentMaxWidth,
            alignSelf: 'center',
            paddingBottom: Math.max(insets.bottom, 16),
            paddingHorizontal: gutter,
          }}
          className="gap-3 rounded-t-xl border-t border-border bg-surface pt-2.5">
          <View className="items-center pb-1">
            <View className="h-1 w-10 rounded-full bg-border-strong" />
          </View>

          <View className="gap-1">
            <Text variant="heading">Send this bill</Text>
            <Text variant="caption">
              {internationalNumber
                ? `Opens on your phone, addressed to ${who}. You tap send.`
                : `Add ${who}'s phone number first to send on WhatsApp or SMS.`}
            </Text>
          </View>

          <Option
            icon="message-circle"
            title="WhatsApp"
            detail="Opens their chat with the bill filled in"
            disabled={!internationalNumber || busy !== null}
            loading={busy === 'whatsapp'}
            onPress={() => choose('whatsapp')}
          />
          <Option
            icon="message-square"
            title="Text message"
            detail="Opens your SMS app with the bill filled in"
            disabled={!internationalNumber || busy !== null}
            loading={busy === 'sms'}
            onPress={() => choose('sms')}
          />
          <Option
            icon="copy"
            title="Copy the bill"
            detail="Paste it wherever you like"
            disabled={busy !== null}
            loading={busy === 'clipboard'}
            onPress={() => choose('clipboard')}
          />

          {notice ? (
            <Text variant="caption" tone="overdue">
              {notice}
            </Text>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Option({
  icon,
  title,
  detail,
  disabled,
  loading,
  onPress,
}: {
  icon: IconName;
  title: string;
  detail: string;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  const colors = useColors();

  return (
    <PressableScale
      accessibilityLabel={title}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled}
      scaleTo={0.98}
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-md border border-border bg-surface2 px-4 py-3.5 ${
        disabled ? 'opacity-40' : ''
      }`}>
      <Feather name={loading ? 'loader' : icon} size={19} color={colors.text} />
      <View className="flex-1">
        <Text variant="body" weight="medium">
          {title}
        </Text>
        <Text variant="caption">{detail}</Text>
      </View>
      <Feather name="chevron-right" size={17} color={colors.textTertiary} />
    </PressableScale>
  );
}

/** Plain language, and specific about what went wrong. */
function describe(outcome: SendOutcome): string {
  switch (outcome.status) {
    case 'opened':
      return outcome.channel === 'whatsapp' ? 'Opening WhatsApp…' : 'Opening your SMS app…';
    case 'copied':
      return 'Bill copied.';
    case 'noNumber':
      return 'Add a phone number for this tenant first.';
    case 'unavailable':
      return outcome.channel === 'whatsapp'
        ? 'No WhatsApp on this phone. Send a text message instead.'
        : 'No SMS app on this phone. Copy the bill instead.';
  }
}
