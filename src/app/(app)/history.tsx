import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { TAB_BAR_CLEARANCE } from '@/theme/tokens';

export default function HistoryScreen() {
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
            History
          </Text>
          <Card>
            <Text variant="caption">Month-by-month ledger — coming in the next step.</Text>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
