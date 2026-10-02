/**
 * المزيد — the secondary menu reached from the fourth tab.
 *
 * "Rate App" and "Contact Us" are present so the menu matches the reference
 * app's structure, but both raise the not-configured message until the Play
 * listing and a support address exist.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Alert, Pressable, Share, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBar } from '../../components/AppBar';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import type { TranslationKey } from '../../i18n';
import { spacing } from '../../theme/tokens';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const ABOUT_VERSION = '1.0.0';

export default function MoreScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors } = useTheme();

  const notConfigured = () => Alert.alert(t('more.title'), t('more.notConfigured'));

  const shareApp = () => {
    Share.share({
      message: `${t('appName')} — ${t('more.title')}`,
    }).catch(() => {
      // Dismissed share sheet is not an error worth surfacing.
    });
  };

  const items: {
    icon: IconName;
    label: TranslationKey;
    onPress: () => void;
  }[] = [
    { icon: 'chart-bar', label: 'more.structure', onPress: () => router.push('/structure') },
    { icon: 'star-outline', label: 'more.favorites', onPress: () => router.push('/favorites') },
    {
      icon: 'cog-outline',
      label: 'more.settings',
      onPress: () => router.push('/settings'),
    },
    { icon: 'star', label: 'more.rateApp', onPress: notConfigured },
    { icon: 'share-variant', label: 'more.shareApp', onPress: shareApp },
    { icon: 'email-outline', label: 'more.contactUs', onPress: notConfigured },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title={t('more.title')} />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        {items.map((item, index) => (
          <Card
            key={item.label}
            padded={false}
            style={{ marginBottom: spacing.sm }}>
            <CardRow
              icon={item.icon}
              label={t(item.label)}
              onPress={item.onPress}
              isLast={index === items.length - 1}
            />
          </Card>
        ))}

        <AppText
          variant="caption"
          color={colors.textMuted}
          center
          style={{ marginTop: spacing.xl }}>
          {t('settings.version')} {ABOUT_VERSION}
        </AppText>
      </ScrollView>
    </View>
  );
}

function CardRow({
  icon,
  label,
  onPress,
  isLast,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  isLast: boolean;
}) {
  const { colors } = useTheme();
  const { direction } = useT();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          flexDirection: direction.row,
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          minHeight: 56,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: colors.border,
          opacity: pressed ? 0.65 : 1,
        },
      ]}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
      <AppText variant="body" style={{ flex: 1, marginHorizontal: spacing.md }}>
        {label}
      </AppText>
      <MaterialCommunityIcons
        name={direction.isRTL ? 'chevron-left' : 'chevron-right'}
        size={20}
        color={colors.textMuted}
      />
    </Pressable>
  );
}