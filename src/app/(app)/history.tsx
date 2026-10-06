import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { ScreenScroll, Section } from '@/components/screen';
import { Text } from '@/components/text';
import { getBuilding } from '@/db/repo/building';
import { listAllBills } from '@/db/repo/bills';
import { useQuery } from '@/db/use-query';
import { summarise, type PeriodTotals } from '@/domain/bill';
import { formatMoney } from '@/lib/money';
import { formatPeriod, type Period } from '@/lib/period';
import { useLayout } from '@/theme/layout';
import { useColors } from '@/theme/tokens';

type MonthSummary = { period: Period; totals: PeriodTotals };

/**
 * Month-by-month ledger: what was billed and what actually came in.
 *
 * Months with no bills are omitted rather than listed as empty rows — a gap
 * in a paper khata is a month the landlord skipped, and showing a run of
 * zeroes would bury the months that matter.
 */
export default function HistoryScreen() {
  const colors = useColors();
  const { gutter } = useLayout();
  const { data, loading } = useQuery(async () => {
    const [bills, building] = await Promise.all([listAllBills(), getBuilding()]);

    const byPeriod = new Map<Period, typeof bills>();
    for (const bill of bills) {
      const existing = byPeriod.get(bill.period);
      if (existing) existing.push(bill);
      else byPeriod.set(bill.period, [bill]);
    }

    const months: MonthSummary[] = [...byPeriod.entries()]
      .map(([period, periodBills]) => ({ period, totals: summarise(periodBills) }))
      .sort((a, b) => b.period.localeCompare(a.period));

    return { months, symbol: building?.currencySymbol ?? '₹' };
  }, []);

  return (
    <View className="flex-1 bg-canvas">
      <SafeAreaView className="flex-1" edges={['top']}>
        <View style={{ paddingHorizontal: gutter }} className="pb-2 pt-3">
          <Text variant="title">History</Text>
        </View>

        <ScreenScroll>
          {loading ? (
            <View className="items-center py-20">
              <ActivityIndicator color={colors.text} />
            </View>
          ) : !data?.months.length ? (
            <EmptyHistory />
          ) : (
            <Section title="Every month you’ve billed">
              <View className="overflow-hidden rounded-md border border-border bg-surface">
                {data.months.map((month, index) => (
                  <MonthRow
                    key={month.period}
                    month={month}
                    symbol={data.symbol}
                    last={index === data.months.length - 1}
                  />
                ))}
              </View>
            </Section>
          )}
        </ScreenScroll>
      </SafeAreaView>
    </View>
  );
}

function MonthRow({
  month,
  symbol,
  last,
}: {
  month: MonthSummary;
  symbol: string;
  last: boolean;
}) {
  const colors = useColors();
  const { totals } = month;
  const settled = totals.outstandingPaise === 0;

  return (
    <PressableScale
      accessibilityLabel={`${formatPeriod(month.period)}. ${
        settled ? 'Fully collected' : `${formatMoney(totals.outstandingPaise, symbol)} still owed`
      }`}
      scaleTo={0.99}
      className={`flex-row items-center gap-3 px-4 py-4 ${last ? '' : 'border-b border-border'}`}>
      <View className="flex-1">
        <Text variant="body" weight="medium">
          {formatPeriod(month.period)}
        </Text>
        <Text variant="caption" tone="secondary">
          {totals.billedCount === 1 ? '1 unit billed' : `${totals.billedCount} units billed`}
        </Text>
      </View>

      <View className="items-end">
        <Text variant="body" numeric weight="medium">
          {formatMoney(totals.billedPaise, symbol)}
        </Text>
        {settled ? (
          <View className="mt-0.5 flex-row items-center gap-1">
            <Feather name="check" size={12} color={colors.paid} />
            <Text variant="caption" tone="paid">
              Collected
            </Text>
          </View>
        ) : (
          <Text variant="caption" tone="overdue" numeric className="mt-0.5">
            {formatMoney(totals.outstandingPaise, symbol)} owed
          </Text>
        )}
      </View>
    </PressableScale>
  );
}

function EmptyHistory() {
  return (
    <View className="gap-2 rounded-md border border-dashed border-border px-5 py-6">
      <Text variant="heading">Nothing billed yet</Text>
      <Text variant="body" tone="secondary">
        Once you bill a unit, every month shows up here with what you billed and what came in.
      </Text>
    </View>
  );
}
