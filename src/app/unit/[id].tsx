import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, IconButton } from '@/components/button';
import { Card, Divider } from '@/components/card';
import { StatusPill } from '@/components/status-pill';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { warningMessage } from '@/domain/bill';
import { useBillDraft, type BillDraft } from '@/hooks/use-bill-draft';
import { useUnitBill, type UnitBillData } from '@/hooks/use-unit-bill';
import { formatMoney, formatUnits } from '@/lib/money';
import { currentPeriod, formatPeriod, type Period } from '@/lib/period';
import { buildBillMessage, shareToWhatsApp, toInternational } from '@/lib/whatsapp';
import { useColors } from '@/theme/tokens';

/**
 * Bill entry for one unit in one month. The month's figures, the tenant's
 * details, and the three commit actions.
 *
 * All state and persistence live in `useBillDraft`; this file is layout.
 */
export default function UnitScreen() {
  const params = useLocalSearchParams<{ id: string; period?: string }>();
  const period: Period = params.period ?? currentPeriod();

  const colors = useColors();
  const { data, loading } = useUnitBill(params.id, period);
  const draft = useBillDraft(data, period);

  if (loading || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        {loading ? <ActivityIndicator color={colors.brand} /> : <Text>Unit not found.</Text>}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-canvas"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <ScreenHeader data={data} period={period} />

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <TenantCard data={data} draft={draft} />
          <ChargesCard data={data} draft={draft} />
          <Actions data={data} draft={draft} period={period} />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function ScreenHeader({ data, period }: { data: UnitBillData; period: Period }) {
  return (
    <View className="flex-row items-center justify-between px-4 py-2">
      <IconButton icon="x" label="Close" variant="ghost" onPress={() => router.back()} />
      <View className="items-center">
        <Text variant="heading">{data.unit.label}</Text>
        <Text variant="caption" tone="tertiary">
          {formatPeriod(period)}
        </Text>
      </View>
      <View className="w-12 items-end">
        <StatusPill status={data.status} size="sm" />
      </View>
    </View>
  );
}

function TenantCard({ data, draft }: { data: UnitBillData; draft: BillDraft }) {
  return (
    <Card className="gap-4">
      <TextField
        label="Tenant name"
        placeholder="Not set"
        value={draft.tenantName}
        onChangeText={draft.setTenantName}
      />
      <TextField
        label="WhatsApp number"
        prefix={`+${data.building.countryCode}`}
        placeholder="98765 43210"
        keyboardType="phone-pad"
        value={draft.tenantPhone}
        onChangeText={draft.setTenantPhone}
        numeric
        hint="Used only to open WhatsApp on your phone. Nothing is sent anywhere else."
      />
    </Card>
  );
}

function ChargesCard({ data, draft }: { data: UnitBillData; draft: BillDraft }) {
  const colors = useColors();
  const symbol = data.building.currencySymbol;

  return (
    <Card className="gap-4">
      <TextField
        label="Monthly rent"
        prefix={symbol}
        keyboardType="number-pad"
        value={draft.rentText}
        onChangeText={draft.setRentText}
        numeric
      />

      <Divider />

      {draft.needsOpeningReading ? (
        <TextField
          label="Current meter reading (one time only)"
          placeholder="e.g. 4120"
          keyboardType="number-pad"
          value={draft.openingText}
          onChangeText={draft.setOpeningText}
          numeric
          hint="Enter what the meter reads today. From next month this fills in by itself."
        />
      ) : (
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Feather name="lock" size={13} color={colors.textTertiary} />
            <Text variant="label" tone="secondary">
              Previous reading
            </Text>
          </View>
          <Text variant="body" numeric className="font-semibold">
            {formatUnits(draft.previousReading)}
          </Text>
        </View>
      )}

      <TextField
        label="New meter reading"
        placeholder={
          draft.previousReading != null ? `More than ${formatUnits(draft.previousReading)}` : '—'
        }
        keyboardType="number-pad"
        value={draft.readingText}
        onChangeText={draft.setReadingText}
        numeric
        warning={draft.warning ? warningMessage(draft.warning) : null}
      />

      <Divider />

      <Line label="Units consumed" value={formatUnits(draft.computed.unitsConsumed)} />
      <Line label="Rate" value={`${formatMoney(data.ratePaisePerUnit, symbol)} / unit`} />
      <Line label="Electricity" value={formatMoney(draft.computed.electricityPaise, symbol)} />

      <Divider />

      <View className="flex-row items-baseline justify-between">
        <Text variant="label">TOTAL</Text>
        <Text variant="title" numeric>
          {formatMoney(draft.computed.totalPaise, symbol)}
        </Text>
      </View>
    </Card>
  );
}

function Actions({
  data,
  draft,
  period,
}: {
  data: UnitBillData;
  draft: BillDraft;
  period: Period;
}) {
  const isPaid = data.bill?.isPaid ?? false;
  const canCommit = draft.computed.isComplete && !draft.busy;

  async function share() {
    await draft.commit();

    const message = buildBillMessage({
      building: data.building,
      unit: data.unit,
      period,
      bill: {
        rentPaise: draft.rentPaise,
        ratePaisePerUnit: data.ratePaisePerUnit,
        prevReading: draft.previousReading,
        newReading: draft.newReading,
        unitsConsumed: draft.computed.unitsConsumed,
        electricityPaise: draft.computed.electricityPaise,
        totalPaise: draft.computed.totalPaise,
      },
    });

    await shareToWhatsApp(message, toInternational(draft.tenantPhone, data.building.countryCode));
  }

  return (
    <View className="gap-2">
      <Button
        label={isPaid ? 'Paid — tap to undo' : 'Mark as paid'}
        icon={isPaid ? 'check-circle' : 'check'}
        variant={isPaid ? 'success' : 'primary'}
        block
        haptic="success"
        disabled={!canCommit}
        onPress={draft.togglePaid}
      />
      <Button
        label="Share on WhatsApp"
        icon="send"
        variant="secondary"
        block
        disabled={!canCommit || !draft.tenantPhone}
        onPress={share}
      />
      <Button
        label="Save"
        variant="ghost"
        block
        loading={draft.busy}
        disabled={draft.busy}
        onPress={async () => {
          await draft.commit();
          router.back();
        }}
      />
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-baseline justify-between">
      <Text variant="body" tone="secondary">
        {label}
      </Text>
      <Text variant="body" numeric>
        {value}
      </Text>
    </View>
  );
}
