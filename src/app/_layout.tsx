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
import { I18nManager, StyleSheet, View } from 'react-native';

import { OnboardingFlow } from '../components/onboarding/OnboardingFlow';
import { useAppUpdateCheck } from '../hooks/useAppUpdateCheck';
import { useOnboarding } from '../hooks/useOnboarding';
import { useTheme } from '../hooks/useTheme';
import { DEFAULT_LOCALE, isRTL } from '../i18n';
import { useAppFonts } from '../theme/fonts';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

// Prevent the auto-hide from racing the font load in the effect below.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden — harmless, and swallowing keeps launch on the happy path.
});

export default function RootLayout() {
  const fontId = useSettings((s) => s.fontFamily);
  const fontsReady = useAppFonts(fontId);
  const { colors, isDark } = useTheme();
  const sessionUser = useSession((s) => s.user);
  const onboarding = useOnboarding();

  // Web only: reload the installed PWA when a newer build is deployed.
  useAppUpdateCheck();

  useEffect(() => {
    // Permit RTL at the native layer so the keyboard and system chrome follow
    // the locale. The app's own layout direction is applied in React, which
    // allows switching languages without a restart.
    I18nManager.allowRTL(isRTL(DEFAULT_LOCALE));
  }, []);

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady]);

  // Firebase admin session + live hymn sync. Both no-op offline or before
  // the owner configures Firebase — the bundled corpus carries the app. The
  // Firestore SDK and the publish/feedback code behind liveSync are imported
  // only here, so a reader's entry bundle does not download them up front.
  useEffect(() => {
    const stopSession = useSession.getState().init();
    let cancelled = false;
    let stopSync: (() => void) | undefined;
    void import('../data/liveSync')
      .then(({ startLiveSync, flushPendingUploads }) => {
        if (cancelled) return;
        stopSync = startLiveSync();
        // Push anything that never reached the cloud (a save while offline or
        // signed out). Verified server-side, so a success here is a real one.
        void flushPendingUploads();
      })
      .catch(() => {
        /* Offline builds run entirely on the bundled corpus. */
      });
    return () => {
      cancelled = true;
      stopSession();
      stopSync?.();
    };
  }, []);

  // A queued edit can only upload once there is a signed-in admin; retry as
  // soon as one exists (startup already ran, possibly before the session was
  // restored).
  useEffect(() => {
    if (!sessionUser) return;
    void import('../data/liveSync')
      .then(({ flushPendingUploads }) => flushPendingUploads())
      .catch(() => {});
  }, [sessionUser]);

  // Keep the splash screen up until both the fonts and the onboarding flag are
  // known, so the app never flashes before the first-run tour opens.
  if (!fontsReady || !onboarding.loaded) return null;

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
      {!onboarding.isComplete ? (
        <View style={StyleSheet.absoluteFill}>
          <OnboardingFlow onComplete={onboarding.complete} onSkip={onboarding.complete} />
        </View>
      ) : null}
    </>
  );
}