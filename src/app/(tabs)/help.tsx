/**
 * مساعدة — the user guide.
 *
 * Content is static and matches the reference app's four instruction cards.
 * Keys are listed explicitly rather than derived so the order and the icon for
 * each entry are reviewable at a glance.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Pressable, ScrollView, View } from 'react-native';

import { AppBar } from '../../components/AppBar';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { TutorialVideoCard } from '../../components/TutorialVideoCard';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import type { TranslationKey } from '../../i18n';
import { radius, spacing } from '../../theme/tokens';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const SECTIONS: { icon: IconName; title: TranslationKey; body: TranslationKey; route?: '/library' }[] = [
  { icon: 'magnify', title: 'help.search.title', body: 'help.search.body', route: '/library' },
  { icon: 'format-list-numbered', title: 'help.browse.title', body: 'help.browse.body', route: '/library' },
  { icon: 'fullscreen', title: 'help.fullscreen.title', body: 'help.fullscreen.body', route: '/library' },
  { icon: 'share-variant', title: 'help.share.title', body: 'help.share.body' },
];

export default function HelpScreen() {
  const router = useRouter();
  const { replay } = useOnboarding();
  const { t, direction } = useT();
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title={t('help.title')} showBack />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <TutorialVideoCard />
        {/* Learn by doing — jump straight into the three most-used sections. */}
        <Card style={{ padding: spacing.lg, marginBottom: spacing.md }}>
          <AppText variant="body" style={{ fontWeight: '700' }}>
            {t('help.practiceTitle')}
          </AppText>
          <AppText variant="label" color={colors.textMuted} style={{ marginTop: 2, marginBottom: spacing.md }}>
            {t('help.practiceBody')}
          </AppText>
          <View style={{ flexDirection: direction.row, flexWrap: 'wrap', gap: spacing.sm }}>
            {(
              [
                { icon: 'book-open-page-variant', label: t('library.title'), route: '/library' },
                { icon: 'star-outline', label: t('favorites.title'), route: '/favorites' },
                { icon: 'playlist-play', label: t('setlist.title'), route: '/setlist' },
              ] as const
            ).map((item) => (
              <Pressable
                key={item.route}
                onPress={() => router.push(item.route)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                android_ripple={{ color: colors.border }}
                style={({ pressed }) => ({
                  flexDirection: direction.row,
                  alignItems: 'center',
                  gap: spacing.xs,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
                  minHeight: 44,
                })}>
                <MaterialCommunityIcons name={item.icon} size={18} color={colors.primary} />
                <AppText variant="label" style={{ fontWeight: '600' }}>
                  {item.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Installation guide video — easily reachable for non-technical users */}
        <Card style={{ padding: spacing.lg, marginTop: spacing.md }}>
          <Pressable
            onPress={() => {
              const url = 'https://www.youtube.com/shorts/55dNrcoMhwc';
              try {
                WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url).catch(() => {}));
              } catch {}
            }}
            accessibilityRole="button"
            accessibilityLabel={t('help.installApp.title')}
            android_ripple={{ color: colors.border }}
            style={{ flexDirection: direction.row, alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
              }}>
              <AppText variant="label" color={colors.onPrimary} style={{ fontWeight: '700' }}>
                {t('help.installApp.title')}
              </AppText>
            </View>
            <MaterialCommunityIcons name="cellphone-link" size={22} color={colors.textMuted} />
            <AppText variant="body" style={{ flex: 1 }} numberOfLines={2}>
              {t('help.installApp.body')}
            </AppText>
          </Pressable>
        </Card>
        <Card style={{ padding: spacing.lg }}>
          <View style={{ flexDirection: direction.row, alignItems: 'center', marginBottom: spacing.lg }}>
            <View
              style={{
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
              }}>
              <AppText variant="label" color={colors.onPrimary} style={{ fontWeight: '700' }}>
                {t('help.title')}
              </AppText>
            </View>
            <MaterialCommunityIcons
              name="book-open-page-variant"
              size={22}
              color={colors.textMuted}
              style={{ marginHorizontal: spacing.sm }}
            />
          </View>

          {SECTIONS.map((section, index) => (
            <View
              key={section.title}
              style={{
                flexDirection: direction.row,
                paddingVertical: spacing.md,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.md,
                  backgroundColor: colors.surfaceMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MaterialCommunityIcons name={section.icon} size={20} color={colors.primary} />
              </View>

              <View style={{ flex: 1, paddingHorizontal: spacing.md }}>
                <AppText variant="body" style={{ fontWeight: '700' }}>
                  {t(section.title)}
                </AppText>
                <AppText variant="label" color={colors.textMuted} style={{ marginTop: 2 }}>
                  {t(section.body)}
                </AppText>
              </View>

              {section.route ? (
                <Pressable
                  onPress={() => router.push(section.route!)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.tryIt')}
                  android_ripple={{ color: colors.border }}
                  style={({ pressed }) => ({
                    alignSelf: 'center',
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: colors.primary,
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <AppText variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>
                    {t('common.tryIt')}
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          ))}
        </Card>

        {/* Replay the first-run tour — useful after learning the basics, and
            the only way to see it again once the flag is stored. */}
        <Pressable
          onPress={replay}
          accessibilityRole="button"
          accessibilityLabel={t('help.replayTour')}
          android_ripple={{ color: colors.border }}
          style={({ pressed }) => ({
            marginTop: spacing.lg,
            flexDirection: direction.row,
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            paddingVertical: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.primary,
            opacity: pressed ? 0.7 : 1,
          })}>
          <MaterialCommunityIcons name="restart" size={18} color={colors.primary} />
          <AppText variant="label" color={colors.primary} style={{ fontWeight: '700' }}>
            {t('help.replayTour')}
          </AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}