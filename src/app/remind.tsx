import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/button';
import { PressableScale } from '@/components/pressable-scale';
import { SendSheet } from '@/components/send-sheet';
import { Text } from '@/components/text';
import { buildBillMessage, type MessageStyle } from '@/lib/bill-message';
import { toInternational } from '@/lib/messaging';
import { formatMoney } from '@/lib/money';
import { currentPeriod, formatPeriod, type Period } from '@/lib/period';
import { useBuildingMonth, type UnitCell } from '@/hooks/use-building-month';
import { useLayout } from '@/theme/layout';
import { useColors } from '@/theme/tokens';

/**
 * Everyone who still owes for the month, in one list.
 *
 * Deliberately NOT a "send all" button. Each message goes out from the
 * owner's own WhatsApp or SMS app, which means leaving this app and tapping
 * send — there is no way to fire ten of those at once without a server, and
 * pretending otherwise would just lose messages silently. What this screen
 * can do is remove the hunting: the list stays put, and each row is one tap
 * from a pre-filled message.
 */
export default function RemindScreen() {
  const params = useLocalSearchParams<{ period?: string }>();
  const period: Period = params.period ?? currentPeriod();

  const colors = useColors();
  const { gutter, contentMaxWidth } = useLayout();
  const { data, loading } = useBuildingMonth(period);
  const [sendingTo, setSendingTo] = useState<UnitCell | null>(null);

  const owing = (data?.floors ?? [])
    .flatMap((floor) => floor.cells)
    .filter((cell) => cell.bill?.totalPaise != null && !cell.bill.isPaid);

  const symbol = data?.building?.currencySymbol ?? '₹';
  const countryCode = data?.building?.countryCode ?? '91';

  return (
    <View className="flex-1 bg-canvas">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View
          style={{ paddingHorizontal: Math.max(gutter - 8, 8) }}
          className="flex-row items-center justify-between pb-2 pt-1">
          <IconButton icon="x" label="Close" variant="ghost" onPress={() => router.back()} />
          <View className="items-center">
            <Text variant="heading">Reminders</Text>
            <Text variant="caption" tone="tertiary">
              {formatPeriod(period)}
            </Text>
          </View>
          <View className="w-12" />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 24, alignItems: 'center' }}
          showsVerticalScrollIndicator={false}>
          <View style={{ width: '100%', maxWidth: contentMaxWidth }} className="gap-3">
            {loading && !data ? (
              <View className="items-center py-20">
                <ActivityIndicator color={colors.text} />
              </View>
            ) : owing.length === 0 ? (
              <View className="gap-2 rounded-md border border-dashed border-border px-5 py-6">
                <Text variant="heading">Nobody owes you</Text>
                <Text variant="body" tone="secondary">
                  Every bill for {formatPeriod(period)} is marked paid.
                </Text>
              </View>
            ) : (
              <>
                <Text variant="body" tone="secondary">
                  Tap a tenant to send their bill. Each one opens on your phone so you can send it
                  yourself.
                </Text>

                {owing.map((cell) => (
                  <OwingRow
                    key={cell.unit.id}
                    cell={cell}
                    symbol={symbol}
                    countryCode={countryCode}
                    onSend={() => setSendingTo(cell)}
                  />
                ))}
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {sendingTo && data?.building ? (
        <SendSheet
          visible
          onClose={() => setSendingTo(null)}
          tenantName={sendingTo.unit.tenantName}
          internationalNumber={toInternational(sendingTo.unit.tenantPhone ?? '', countryCode)}
          buildMessage={(style: MessageStyle) =>
            buildBillMessage({
              building: data.building!,
              unit: sendingTo.unit,
              period,
              style,
              bill: sendingTo.bill!,
            })
          }
        />
      ) : null}
    </View>
  );
}

function OwingRow({
  cell,
  symbol,
  countryCode,
  onSend,
}: {
  cell: UnitCell;
  symbol: string;
  countryCode: string;
  onSend: () => void;
}) {
  const colors = useColors();
  const overdue = cell.status === 'overdue';
  const reachable = Boolean(toInternational(cell.unit.tenantPhone ?? '', countryCode));

  return (
    <PressableScale
      accessibilityLabel={`Send ${cell.unit.label} bill to ${cell.unit.tenantName ?? 'tenant'}`}
      scaleTo={0.99}
      onPress={onSend}
      className="flex-row items-center gap-3 rounded-md border border-border bg-surface px-4 py-3.5">
      <View className="flex-1">
        <Text variant="body" weight="medium">
          {cell.unit.tenantName?.trim() || cell.unit.label}
        </Text>
        <Text variant="caption" tone={overdue ? 'overdue' : 'secondary'}>
          {cell.unit.tenantName ? `${cell.unit.label}, ` : ''}
          {overdue ? 'overdue' : 'due'}
          {reachable ? '' : ' — no phone number'}
        </Text>
      </View>

      <Text variant="body" numeric weight="medium" tone={overdue ? 'overdue' : 'default'}>
        {formatMoney(cell.bill?.totalPaise ?? null, symbol)}
      </Text>

      <Feather name="send" size={16} color={colors.textSecondary} />
    </PressableScale>
  );
}
