/**
 * Placeholder shown when a list has nothing in it.
 *
 * Every empty state in the app carries a hint about how to change that, since
 * "no favourites" and "no search results" look identical without it.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../theme/tokens';

interface EmptyStateProps {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  hint?: string;
}

export function EmptyState({ icon, title, hint }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxl * 2, paddingHorizontal: spacing.xl }}>
      <MaterialCommunityIcons name={icon} size={48} color={colors.textMuted} />
      <AppText variant="heading" center color={colors.textMuted} style={{ marginTop: spacing.lg }}>
        {title}
      </AppText>
      {hint ? (
        <AppText variant="body" center color={colors.textMuted} style={{ marginTop: spacing.sm }}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}