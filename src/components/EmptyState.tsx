/**
 * Placeholder shown when a list has nothing in it.
 *
 * Every empty state in the app carries a hint about how to change that, since
 * "no favourites" and "no search results" look identical without it. An
 * optional action button turns a dead end into a next step ("Browse the
 * library", "Clear filters").
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from './AppText';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import { radius, spacing } from '../theme/tokens';

interface EmptyStateProps {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  hint?: string;
  /** Label for the optional primary action button. */
  actionLabel?: string;
  /** Called when the action button is pressed. Required for the button to show. */
  onAction?: () => void;
}

export function EmptyState({ icon, title, hint, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();
  const { direction } = useT();

  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxl * 2, paddingHorizontal: spacing.xl }}>
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: colors.surfaceMuted,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <MaterialCommunityIcons name={icon} size={40} color={colors.primary} />
      </View>
      <AppText variant="heading" center style={{ marginTop: spacing.lg }}>
        {title}
      </AppText>
      {hint ? (
        <AppText variant="body" center color={colors.textMuted} style={{ marginTop: spacing.sm, maxWidth: 360 }}>
          {hint}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => ({
            marginTop: spacing.lg,
            flexDirection: direction.row,
            alignItems: 'center',
            gap: spacing.xs,
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.md,
            borderRadius: radius.pill,
            backgroundColor: pressed ? colors.primaryDeep : colors.primary,
            minHeight: 48,
          })}>
          <MaterialCommunityIcons name="arrow-right" size={18} color={colors.onPrimary} />
          <AppText variant="body" color={colors.onPrimary} style={{ fontWeight: '700' }}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
