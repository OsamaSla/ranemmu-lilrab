/**
 * Root layout: font loading, status bar theming, and the route stack.
 *
 * The splash screen stays up until the bundled fonts are ready, because hymn
 * text rendered in a fallback font for a frame is visible as a flash on launch.
 */
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { I18nManager } from 'react-native';

import { useTheme } from '../hooks/useTheme';
import { DEFAULT_LOCALE, isRTL } from '../i18n';
import { useAppFonts } from '../theme/fonts';

// Prevent the auto-hide from racing the font load in the effect below.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden — harmless, and swallowing keeps launch on the happy path.
});

export default function RootLayout() {
  const fontsReady = useAppFonts();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    // Permit RTL at the native layer so the keyboard and system chrome follow
    // the locale. The app's own layout direction is applied in React, which
    // allows switching languages without a restart.
    I18nManager.allowRTL(isRTL(DEFAULT_LOCALE));
  }, []);

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.canvas },
          animation: 'slide_from_left',
        }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}