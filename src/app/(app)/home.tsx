import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';

import { BuildingView } from '@/components/building-view';
import { Card } from '@/components/card';
import { MonthHeader } from '@/components/month-header';
import { GlassScreen } from '@/components/surface';
import { Text } from '@/components/text';
import { formatMoney } from '@/lib/money';
import { currentPeriod } from '@/lib/period';
import { TAB_BAR_CLEARANCE, useColors } from '@/theme/tokens';
import { useBuildingMonth } from '@/hooks/use-building-month';

export default function HomeScreen() {
  const colors = useColors();
  const [period, setPeriod] = useState(currentPeriod);
  const [headerHeight, setHeaderHeight] = useState(140);
  const { data, loading, refetch } = useBuildingMonth(period);

  const totals = data?.totals;
  const symbol = data?.building?.currencySymbol ?? '₹';
  const unbilled = (data?.unitCount ?? 0) - (totals?.billedCount ?? 0);

  const secondary = totals
    ? [
        `${data?.unitCount ?? 0} units`,
        totals.unpaidCount > 0 ? `${totals.unpaidCount} unpaid` : null,
        unbilled > 0 ? `${unbilled} not billed` : null,
        totals.unpaidCount === 0 && unbilled === 0 && totals.billedCount > 0
          ? 'all collected'
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined;

  return (
    <GlassScreen
      overlay={
        <MonthHeader
          period={period}
          onChangePeriod={setPeriod}
          primary={formatMoney(totals?.billedPaise ?? 0, symbol)}
          secondary={secondary}
          onHeight={setHeaderHeight}
        />
      }>
      <View className="flex-1 bg-canvas">
        <ScrollView
          contentContainerStyle={{
            paddingTop: headerHeight + 16,
            paddingBottom: TAB_BAR_CLEARANCE,
            paddingHorizontal: 16,
            gap: 16,
          }}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.brand} />
          }
          showsVerticalScrollIndicator={false}>
          {loading && !data ? (
            <View className="items-center py-16">
              <ActivityIndicator color={colors.brand} />
            </View>
          ) : (
            <>
              <BuildingView
                floors={data?.floors ?? []}
                onPressUnit={(id) => router.push(`/unit/${id}`)}
              />

              {totals && totals.billedCount > 0 ? (
                <Card className="gap-3">
                  <SummaryRow
                    label="Collected"
                    value={formatMoney(totals.collectedPaise, symbol)}
                    tone="paid"
                  />
                  <SummaryRow
                    label="Outstanding"
                    value={formatMoney(totals.outstandingPaise, symbol)}
                    tone={totals.outstandingPaise > 0 ? 'due' : 'muted'}
                  />
                </Card>
              ) : (
                <Card className="items-start gap-2">
                  <Text variant="heading">No bills for this month yet</Text>
                  <Text variant="caption">
                    Tap any unit above to enter its meter reading. The previous reading fills in
                    automatically after the first month.
                  </Text>
                </Card>
              )}

            </>
          )}
        </ScrollView>
      </View>
    </GlassScreen>
  );
}

function SummaryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'paid' | 'due' | 'muted';
}) {
  const color = tone === 'paid' ? 'text-paid' : tone === 'due' ? 'text-due' : 'text-text-secondary';
  return (
    <View className="flex-row items-baseline justify-between">
      <Text variant="body" tone="secondary">
        {label}
      </Text>
      <Text variant="heading" numeric className={color}>
        {value}
      </Text>
    </View>
  );
}
