import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { getBuilding } from '@/db/repo/building';
import { useQuery } from '@/db/use-query';
import { formatMoney } from '@/lib/money';
import { TAB_BAR_CLEARANCE } from '@/theme/tokens';

export default function SettingsScreen() {
  const { data: building } = useQuery(() => getBuilding(), []);

  return (
    <View className="flex-1 bg-canvas">
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: TAB_BAR_CLEARANCE,
            gap: 16,
          }}>
          <Text variant="title" className="pt-2">
            Settings
          </Text>

          <Card className="gap-3">
            <Row label="Building" value={building?.name ?? '—'} />
            <Row label="Default rent" value={formatMoney(building?.defaultRentPaise ?? 0)} />
            <Row
              label="Electricity rate"
              value={`${formatMoney(building?.ratePaisePerUnit ?? 0)} / unit`}
            />
          </Card>

          <Card>
            <Text variant="caption">
              Editing rates, app lock and JSON backup arrive in the hardening step.
            </Text>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-baseline justify-between">
      <Text variant="body" tone="secondary">
        {label}
      </Text>
      <Text variant="body" numeric className="font-semibold">
        {value}
      </Text>
    </View>
  );
}
