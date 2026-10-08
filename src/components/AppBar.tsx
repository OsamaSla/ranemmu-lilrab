/**
 * Top bar: logo badge, screen title, and an optional trailing action.
 *
 * Children are laid out in reading order, so in Arabic the badge sits on the
 * right and the action on the left, which is the mirror of the English layout.
 */
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './AppText';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../theme/tokens';

interface AppBarProps {
  title: string;
  /** Rendered at the trailing edge — usually an IconButton. */
  action?: ReactNode;
  subtitle?: string;
}

export function AppBar({ title, action, subtitle }: AppBarProps) {
  const { colors } = useTheme();
  const { t, direction } = useT();
  const insets = useSafeAreaInsets();

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