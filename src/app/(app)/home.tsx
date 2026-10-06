import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';

import { BuildingView } from '@/components/building-view';
import { Button } from '@/components/button';
import { MonthHeader, type MonthState } from '@/components/month-header';
import { Row, Rows, ScreenScroll, Section } from '@/components/screen';
import { GlassScreen } from '@/components/surface';
import { Text } from '@/components/text';
import { useBuildingMonth, type BuildingMonth } from '@/hooks/use-building-month';
import { formatMoney } from '@/lib/money';
import { currentPeriod } from '@/lib/period';
import { useLayout } from '@/theme/layout';
import { useColors } from '@/theme/tokens';

export default function HomeScreen() {
  const colors = useColors();
  const { isWide } = useLayout();
  const [period, setPeriod] = useState(currentPeriod);
  const [headerHeight, setHeaderHeight] = useState(150);
  const { data, loading, refetch } = useBuildingMonth(period);

  const symbol = data?.building?.currencySymbol ?? '₹';
  const totals = data?.totals;

  return (
    <GlassScreen
      overlay={
        <MonthHeader
          period={period}
          onChangePeriod={setPeriod}
          state={monthState(data, symbol)}
          summary={describeMonth(data)}
          onHeight={setHeaderHeight}
        />
      }>
      <View className="flex-1 bg-canvas">
        <ScreenScroll
          wide
          topInset={headerHeight + 20}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.text} />
          }>
          {loading && !data ? (
            <View className="items-center py-20">
              <ActivityIndicator color={colors.text} />
            </View>
          ) : (
            /*
             * Once there is room, the ledger stands beside the building
             * instead of under it: both are visible at once and the extra
             * width makes the building bigger rather than the page emptier.
             */
            <View className={isWide ? 'flex-row items-start gap-8' : 'gap-5'}>
              <View className={isWide ? 'flex-[3]' : undefined}>
                <BuildingView
                  floors={data?.floors ?? []}
                  onPressUnit={(id) => router.push(`/unit/${id}`)}
                />
              </View>

              <View className={isWide ? 'flex-[2]' : undefined}>
                {totals && totals.billedCount > 0 ? (
                  <Section title="This month">
                    <Rows>
                      <Row label="Billed" value={formatMoney(totals.billedPaise, symbol)} />
                      <Row
                        label="Collected"
                        value={formatMoney(totals.collectedPaise, symbol)}
                        tone="paid"
                      />
                      <Row
                        label="Still owed"
                        value={formatMoney(totals.outstandingPaise, symbol)}
                        tone={totals.outstandingPaise > 0 ? 'overdue' : 'secondary'}
                        last
                      />
                    </Rows>
                  </Section>
                ) : (
                  <FirstRunHint />
                )}

                {totals && totals.unpaidCount > 0 ? (
                  <View className="mt-4">
                    <Button
                      label={
                        totals.unpaidCount === 1
                          ? 'Send 1 reminder'
                          : `Send ${totals.unpaidCount} reminders`
                      }
                      icon="send"
                      variant="secondary"
                      block
                      onPress={() => router.push({ pathname: '/remind', params: { period } })}
                    />
                  </View>
                ) : null}
              </View>
            </View>
          )}
        </ScreenScroll>
      </View>
    </GlassScreen>
  );
}

/**
 * The headline figure's state.
 *
 * "Nothing billed" is kept distinct from "all collected" because both have an
 * outstanding balance of zero and they mean opposite things — the second is
 * an achievement, the first is a month the owner has not started.
 */
function monthState(data: BuildingMonth | undefined, symbol: string): MonthState {
  if (!data || data.totals.billedCount === 0) return { kind: 'nothingBilled' };

  const outstanding = data.totals.outstandingPaise;
  return outstanding > 0
    ? { kind: 'owing', amount: formatMoney(outstanding, symbol) }
    : { kind: 'collected' };
}

/**
 * One sentence, not a list of counts joined by dots. Says the single most
 * useful thing about the month and nothing else.
 *
 * Counted against *tenanted* units: an empty flat will never produce a bill,
 * so including it left every month reporting work still to do.
 */
function describeMonth(data: BuildingMonth | undefined): string {
  if (!data) return 'Loading your building';

  const { totals, unitCount, tenantedUnitCount } = data;
  const stillToBill = Math.max(0, tenantedUnitCount - totals.billedCount);
  const vacant = unitCount - tenantedUnitCount;

  if (unitCount === 0) return 'No units set up yet';
  if (tenantedUnitCount === 0) return plural(unitCount, 'unit', 'units') + ' waiting for a tenant';

  if (totals.billedCount === 0) {
    return `${plural(tenantedUnitCount, 'unit', 'units')} waiting for this month’s readings`;
  }
  if (totals.unpaidCount > 0) return `${plural(totals.unpaidCount, 'unit', 'units')} still to pay`;
  if (stillToBill > 0) return `${plural(stillToBill, 'unit', 'units')} still to bill`;

  // Everything that can be billed is billed and paid. Mention vacancies only
  // here, where they are the single remaining fact worth knowing.
  return vacant > 0
    ? `Every tenant paid, ${plural(vacant, 'unit', 'units')} empty`
    : 'Every tenant paid';
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** An empty screen is an invitation to act, not a shrug. */
function FirstRunHint() {
  return (
    <View className="gap-2 rounded-md border border-dashed border-border px-5 py-6">
      <Text variant="heading">Start with any unit</Text>
      <Text variant="body" tone="secondary">
        Tap a unit above to enter this month’s meter reading. Next month its previous reading
        fills in on its own.
      </Text>
    </View>
  );
}
