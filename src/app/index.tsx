import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { getBuilding } from '@/db/repo/building';
import { useQuery } from '@/db/use-query';
import { useColors } from '@/theme/tokens';

/**
 * Entry gate. Deliberately keyed off whether a building row exists rather
 * than an "onboarding complete" flag — one source of truth means the two can
 * never disagree and strand the user on an empty home screen.
 */
export default function Index() {
  const colors = useColors();
  const { data: building, loading } = useQuery(() => getBuilding(), []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return <Redirect href={building ? '/home' : '/onboarding'} />;
}
