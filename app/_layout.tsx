import { useCallback, useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template/ui';
import { AuthProvider } from '@/contexts/AuthContext';
import { ClientsProvider } from '@/contexts/ClientsContext';
import { SessionsProvider } from '@/contexts/SessionsContext';
import { TaxPotProvider } from '@/contexts/TaxPotContext';

const SPLASH_SCREEN_TIMEOUT_MS = 8000;

SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn('[RootLayout] Failed to prevent splash screen auto-hide:', error);
});

export default function RootLayout() {
  console.log(`[RootLayout] Rendering root layout on ${Platform.OS}`);
  const splashHiddenRef = useRef(false);

  const hideSplashScreen = useCallback(async (reason: string) => {
    if (splashHiddenRef.current) return;
    splashHiddenRef.current = true;
    try {
      await SplashScreen.hideAsync();
      console.log(`[RootLayout] Splash screen hidden (${reason})`);
    } catch (error) {
      console.warn(`[RootLayout] Failed to hide splash screen (${reason}):`, error);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      hideSplashScreen(`startup timeout ${SPLASH_SCREEN_TIMEOUT_MS}ms`);
    }, SPLASH_SCREEN_TIMEOUT_MS);
    return () => clearTimeout(timeoutId);
  }, [hideSplashScreen]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }} onLayout={() => hideSplashScreen('root layout rendered')}>
        <AlertProvider>
          <SafeAreaProvider>
            <AuthProvider>
              <ClientsProvider>
                <SessionsProvider>
                  <TaxPotProvider>
                    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F0F10' } }}>
                      <Stack.Screen name="index" />
                      <Stack.Screen name="auth" />
                      <Stack.Screen name="onboarding" />
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="client/[id]" />
                      <Stack.Screen name="client/new" options={{ presentation: 'modal' }} />
                      <Stack.Screen name="session/[id]" />
                      <Stack.Screen name="session/new" options={{ presentation: 'modal' }} />
                      <Stack.Screen name="session/note" />
                      <Stack.Screen name="session/measure" options={{ presentation: 'modal' }} />
                      <Stack.Screen name="invoice/[id]" />
                      <Stack.Screen name="invoice/new" options={{ presentation: 'modal' }} />
                      <Stack.Screen name="messages/[clientId]" />
                      <Stack.Screen name="resources/[id]" />
                      <Stack.Screen name="verification" />
                      <Stack.Screen name="supervision" />
                      <Stack.Screen name="admin-verifications" />
                    </Stack>
                  </TaxPotProvider>
                </SessionsProvider>
              </ClientsProvider>
            </AuthProvider>
          </SafeAreaProvider>
        </AlertProvider>
      </View>
    </GestureHandlerRootView>
  );
}
