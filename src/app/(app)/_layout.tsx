// `Tabs` from the expo-router root is deprecated in SDK 57 — the JS tab
// navigator now lives at this subpath.
import { Tabs } from 'expo-router/js-tabs';

import { FloatingTabBar } from '@/components/floating-tab-bar';

export default function AppTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // The bar floats over content; each screen pads its own scroll view
        // via TAB_BAR_CLEARANCE instead of the navigator reserving space.
        sceneStyle: { backgroundColor: 'transparent' },
      }}>
      <Tabs.Screen name="home" options={{ title: 'Building' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
