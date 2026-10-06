import '@/global.css';
// Side-effect import: registers GlassView/BlurView/Animated.* with NativeWind,
// which otherwise ignores their className without warning. Must run before
// any screen renders.
import '@/theme/css-interop';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Text } from '@/components/text';
import { openDatabase } from '@/db/client';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useColors } from '@/theme/tokens';

// Held until storage is ready, so the first frame is a usable one.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const colors = useColors();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <StorageGate />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Holds back every screen until storage is open and migrated.
 *
 * Rendering earlier would let a repository query run against a database with
 * no tables, which Drizzle reports as a bare "no such table".
 */
function StorageGate() {
  const colors = useColors();
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    openDatabase()
      .then(() => active && setReady(true))
      .catch((cause: unknown) => {
        if (!active) return;
        setFailure(cause instanceof Error ? cause : new Error(String(cause)));
      })
      .finally(() => {
        // Reveal the app once there is something real to show — including
        // the error screen, which is still better than a stuck splash.
        SplashScreen.hideAsync().catch(() => {});
      });

    return () => {
      active = false;
    };
  }, []);

  if (failure) return <StorageUnavailable cause={failure} />;

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvas },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="unit/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="remind" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

/** Shown instead of a blank screen when the database cannot be opened. */
function StorageUnavailable({ cause }: { cause: Error }) {
  return (
    <ScrollView
      className="bg-canvas"
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 12, padding: 28 }}>
      <Text variant="heading">Couldn’t open your data</Text>
      <Text variant="body" tone="secondary">
        Your rent records could not be loaded. Restarting the app usually fixes this. If it
        keeps happening, the data file may be damaged.
      </Text>
      <Text variant="caption" tone="tertiary" selectable>
        {cause.message}
      </Text>
    </ScrollView>
  );
}
