/**
 * مساعدة — the user guide.
 *
 * Content is static and matches the reference app's four instruction cards.
 * Keys are listed explicitly rather than derived so the order and the icon for
 * each entry are reviewable at a glance.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ScrollView, View } from 'react-native';

import { AppBar } from '../../components/AppBar';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import type { TranslationKey } from '../../i18n';
import { radius, spacing } from '../../theme/tokens';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const SECTIONS: { icon: IconName; title: TranslationKey; body: TranslationKey }[] = [
  { icon: 'magnify', title: 'help.search.title', body: 'help.search.body' },
  { icon: 'format-list-numbered', title: 'help.browse.title', body: 'help.browse.body' },
  { icon: 'fullscreen', title: 'help.fullscreen.title', body: 'help.fullscreen.body' },
  { icon: 'share-variant', title: 'help.share.title', body: 'help.share.body' },
];

export default function HelpScreen() {
  const { t, direction } = useT();
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title={t('help.title')} />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
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
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}