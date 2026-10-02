/**
 * الرئيسية — the landing screen.
 *
 * Mirrors the reference app: a decorative backdrop, the app name, a search
 * field that opens the live search overlay, and a primary CTA into the library.
 * The audio toggle from the reference app's top bar is intentionally absent.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '../../components/AppBar';
import { AppText } from '../../components/AppText';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { getHymnCount } from '../../data/loader';
import { toArabicDigits } from '../../data/normalize';
import { radius, spacing } from '../../theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const { t, direction } = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title={t('appName')} />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + spacing.xxl,
        }}>
        {/* Decorative backdrop: concentric arcs bleeding off the inline-end edge,
            standing in for the reference app's circular artwork. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -80,
            ...(direction.isRTL ? { left: -80 } : { right: -80 }),
            width: 280,
            height: 280,
            borderRadius: 140,
            backgroundColor: colors.primary,
            opacity: 0.06,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -20,
            ...(direction.isRTL ? { left: -20 } : { right: -20 }),
            width: 160,
            height: 160,
            borderRadius: 80,
            backgroundColor: colors.accent,
            opacity: 0.08,
          }}
        />

        <AppText variant="display" center style={{ marginBottom: spacing.sm }}>
          {t('appName')}
        </AppText>

        <AppText variant="body" center color={colors.textMuted} style={{ marginBottom: spacing.xxl }}>
          {t('library.count')}: {toArabicDigits(getHymnCount())}
        </AppText>

        {/* Search trigger. A real field would need a keyboard on tap; routing to
            the search screen keeps focus handling in one place. */}
        <Pressable
          accessibilityRole="search"
          accessibilityLabel={t('home.searchPlaceholder')}
          onPress={() => router.push('/search')}
          style={({ pressed }) => [
            {
              flexDirection: direction.row,
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: spacing.lg,
              height: 52,
              opacity: pressed ? 0.7 : 1,
            },
          ]}>
          <MaterialCommunityIcons name="magnify" size={22} color={colors.textMuted} />
          <AppText
            variant="body"
            color={colors.textMuted}
            numberOfLines={1}
            style={{ flex: 1, paddingHorizontal: spacing.md }}>
            {t('home.searchPlaceholder')}
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/library')}
          style={({ pressed }) => [
            {
              marginTop: spacing.lg,
              backgroundColor: colors.primary,
              borderRadius: radius.md,
              paddingVertical: spacing.lg,
              alignItems: 'center',
              opacity: pressed ? 0.8 : 1,
            },
          ]}>
          <AppText variant="heading" color={colors.onPrimary} style={{ fontWeight: '700' }}>
            {t('home.viewAllHymns')}
          </AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}