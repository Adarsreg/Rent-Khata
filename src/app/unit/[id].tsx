import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, IconButton } from '@/components/button';
import { MeterPhotoField } from '@/components/meter-photo-field';
import { Section } from '@/components/screen';
import { SendSheet } from '@/components/send-sheet';
import { StatusPill } from '@/components/status-pill';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { warningMessage } from '@/domain/bill';
import { useBillDraft, type BillDraft } from '@/hooks/use-bill-draft';
import { useUnitBill, type UnitBillData } from '@/hooks/use-unit-bill';
import { formatMoney, formatUnits } from '@/lib/money';
import { currentPeriod, formatPeriod, type Period } from '@/lib/period';
import { toInternational } from '@/lib/messaging';
import { buildBillMessage, type MessageStyle } from '@/lib/bill-message';
import { useLayout } from '@/theme/layout';
import { useColors } from '@/theme/tokens';

/**
 * Bill entry for one unit in one month.
 *
 * All state and persistence live in `useBillDraft`; this file is layout.
 * The actions are pinned to the bottom rather than scrolling with the form —
 * on a long form the thing you came to do should never be below the fold.
 */
export default function UnitScreen() {
  const params = useLocalSearchParams<{ id: string; period?: string }>();
  const period: Period = params.period ?? currentPeriod();

  const colors = useColors();
  const { gutter, contentMaxWidth } = useLayout();
  const { data, loading } = useUnitBill(params.id, period);
  const draft = useBillDraft(data, period);

  if (loading || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        {loading ? <ActivityIndicator color={colors.text} /> : <Text>Unit not found.</Text>}
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
          contentContainerStyle={{
            paddingHorizontal: gutter,
            paddingBottom: 20,
            alignItems: 'center',
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={{ width: '100%', maxWidth: contentMaxWidth }} className="gap-7">
            <TenantSection data={data} draft={draft} />
            <ChargesSection data={data} draft={draft} />
          </View>
        </ScrollView>

        <Actions data={data} draft={draft} period={period} />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function ScreenHeader({ data, period }: { data: UnitBillData; period: Period }) {
  const { gutter } = useLayout();

  return (
    <View
      style={{ paddingHorizontal: Math.max(gutter - 8, 8) }}
      className="flex-row items-center justify-between pb-3 pt-1">
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

function TenantSection({ data, draft }: { data: UnitBillData; draft: BillDraft }) {
  const isRoom = data.building.type === 'pg';

  return (
    <Section title="Tenant">
      <View className="gap-4">
        <TextField
          label={isRoom ? 'Room number' : 'Unit number'}
          value={draft.labelText}
          onChangeText={draft.setLabelText}
          autoCapitalize="characters"
        />
        <TextField
          label="Name"
          placeholder="Not set"
          value={draft.tenantName}
          onChangeText={draft.setTenantName}
        />
        <TextField
          label="Mobile number"
          prefix={`+${data.building.countryCode}`}
          placeholder="98765 43210"
          keyboardType="phone-pad"
          value={draft.tenantPhone}
          onChangeText={draft.setTenantPhone}
          numeric
          hint="Used to open WhatsApp or your SMS app. Nothing is sent anywhere else."
        />
      </View>
    </Section>
  );
}

function ChargesSection({ data, draft }: { data: UnitBillData; draft: BillDraft }) {
  const symbol = data.building.currencySymbol;

  return (
    <Section title="This month">
      <View className="gap-4">
        <TextField
          label="Rent"
          prefix={symbol}
          keyboardType="number-pad"
          value={draft.rentText}
          onChangeText={draft.setRentText}
          numeric
        />

        {/*
          Editable, not locked. A meter can be misread, replaced, or simply
          corrected a month later, and a landlord who cannot fix last month's
          number has to either live with a wrong bill or fake this month's.
          It is pre-filled from history, so the common case is still no typing.
        */}
        <TextField
          label="Previous reading"
          placeholder="e.g. 4120"
          keyboardType="number-pad"
          value={draft.previousText}
          onChangeText={draft.setPreviousText}
          numeric
          hint={
            draft.isFirstReading
              ? 'What the meter reads now. Next month this fills in by itself.'
              : 'Filled in from last month. Change it if the meter was misread or replaced.'
          }
        />

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

        <MeterPhotoField photoUri={draft.photoUri} onChange={draft.setPhotoUri} />
      </View>

      <BillTotals data={data} draft={draft} />
    </Section>
  );
}

/**
 * What the inputs add up to. Visually separated from the fields above it —
 * those are things you change, this is the consequence.
 */
function BillTotals({ data, draft }: { data: UnitBillData; draft: BillDraft }) {
  const symbol = data.building.currencySymbol;
  const { computed } = draft;

  return (
    <View className="mt-1 gap-2.5 rounded-md border border-border bg-surface px-4 py-4">
      <Line label="Rent" value={formatMoney(draft.rentPaise, symbol)} />
      <Line
        label={`Electricity, ${formatUnits(computed.unitsConsumed)} units`}
        value={formatMoney(computed.electricityPaise, symbol)}
      />

      <View className="my-1 h-px bg-border" />

      <View className="flex-row items-baseline justify-between">
        <Text variant="label" tone="secondary">
          Total
        </Text>
        <Text variant="title" numeric>
          {formatMoney(computed.totalPaise, symbol)}
        </Text>
      </View>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-baseline justify-between gap-3">
      <Text variant="body" tone="secondary" numberOfLines={1} className="flex-1">
        {label}
      </Text>
      <Text variant="body" numeric>
        {value}
      </Text>
    </View>
  );
}

/** Pinned above the home indicator so the primary action never scrolls away. */
function Actions({
  data,
  draft,
  period,
}: {
  data: UnitBillData;
  draft: BillDraft;
  period: Period;
}) {
  const { gutter, contentMaxWidth } = useLayout();
  const [sending, setSending] = useState(false);
  const isPaid = data.bill?.isPaid ?? false;
  const ready = draft.computed.isComplete && !draft.busy;

  const buildMessage = (style: MessageStyle) =>
    buildBillMessage({
      building: data.building,
      unit: data.unit,
      period,
      style,
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

  /**
   * Save before offering to send. Leaving the app with an unsaved bill would
   * mean the tenant gets a figure the ledger has no record of.
   */
  async function openSend() {
    await draft.commit();
    setSending(true);
  }

  return (
    <View className="items-center border-t border-border bg-surface pb-1 pt-3">
      <View
        style={{ width: '100%', maxWidth: contentMaxWidth, paddingHorizontal: gutter }}
        className="gap-2">
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button
              label={isPaid ? 'Paid' : 'Mark paid'}
              icon={isPaid ? 'check-circle' : 'check'}
              variant={isPaid ? 'success' : 'primary'}
              block
              haptic="success"
              disabled={!ready}
              onPress={draft.togglePaid}
            />
          </View>
          <View className="flex-1">
            <Button
              label="Send bill"
              icon="send"
              variant="secondary"
              block
              // Sending is offered even with no number yet: the sheet explains
              // what is missing, which teaches more than a dead button.
              disabled={!ready}
              onPress={openSend}
            />
          </View>
        </View>

        <Button
          label="Save and close"
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

      <SendSheet
        visible={sending}
        onClose={() => setSending(false)}
        buildMessage={buildMessage}
        internationalNumber={toInternational(draft.tenantPhone, data.building.countryCode)}
        tenantName={draft.tenantName}
      />
    </View>
  );
}
