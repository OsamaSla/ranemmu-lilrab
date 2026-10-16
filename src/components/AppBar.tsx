/**
 * Top bar: logo badge, screen title, and an optional trailing action.
 *
 * Children are laid out in reading order, so in Arabic the badge sits on the
 * right and the action on the left, which is the mirror of the English layout.
 */
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './AppText';
import { useGoBack } from '../hooks/useGoBack';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../theme/tokens';

interface AppBarProps {
  title: string;
  /** Rendered at the trailing edge — usually an IconButton. */
  action?: ReactNode;
  subtitle?: string;
  /** Leading back chevron (previous page, home fallback). Only the home tab omits it. */
  showBack?: boolean;
}

export function AppBar({ title, action, subtitle, showBack }: AppBarProps) {
  const { colors } = useTheme();
  const { t, direction } = useT();
  const insets = useSafeAreaInsets();
  const goBack = useGoBack();

  const badge = t('appName').split(' ')[0];

  return (
    <View
      style={{
        paddingTop: insets.top + spacing.sm,
        paddingBottom: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.primaryDeep,
        flexDirection: direction.row,
        alignItems: 'center',
      }}>
      {showBack ? (
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}>
          <MaterialCommunityIcons
            name={direction.isRTL ? 'chevron-right' : 'chevron-left'}
            size={26}
            color={colors.onPrimary}
          />
        </Pressable>
      ) : null}
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={title}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.onPrimary,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <AppText
          variant="label"
          color={colors.primaryDeep}
          numberOfLines={1}
          style={{ fontWeight: '700' }}>
          {badge}
        </AppText>
      </View>

      <View style={{ flex: 1, paddingHorizontal: spacing.md }}>
        <AppText
          variant="heading"
          numberOfLines={1}
          color={colors.onPrimary}
          style={{ fontWeight: '700' }}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" numberOfLines={1} color={colors.onPrimary} style={{ opacity: 0.8 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {action}
    </View>
  );
}