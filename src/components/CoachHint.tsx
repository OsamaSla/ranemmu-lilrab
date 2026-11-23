/**
 * CoachHint — a small, dismissible, one-line tip.
 *
 * Used to teach a feature the first few times a screen is opened (the count
 * lives in AsyncStorage via `useFeatureHint`). It is intentionally quiet: a
 * single row with an icon, a short label and a close button, so it informs
 * without blocking the screen underneath.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, type ViewStyle } from 'react-native';

import { AppText } from './AppText';
import { useFeatureHint } from '../hooks/useFeatureHint';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import { radius, spacing } from '../theme/tokens';

interface CoachHintProps {
  /** Stable id; the show counter is stored under this key. */
  id: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  style?: ViewStyle;
}

export function CoachHint({ id, icon, label, style }: CoachHintProps) {
  const { colors } = useTheme();
  const { t, direction } = useT();
  const { visible, dismiss } = useFeatureHint(id);
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) return;
    Animated.timing(opacity, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [visible, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        {
          opacity,
          flexDirection: direction.row,
          alignItems: 'center',
          gap: spacing.sm,
          marginHorizontal: spacing.lg,
          marginTop: spacing.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.primary,
          backgroundColor: colors.surfaceMuted,
        },
        style,
      ]}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
      <AppText variant="label" color={colors.text} style={{ flex: 1 }} numberOfLines={2}>
        {label}
      </AppText>
      <Pressable
        onPress={dismiss}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        hitSlop={8}
        style={{ padding: 2 }}>
        <MaterialCommunityIcons name="close" size={16} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}
