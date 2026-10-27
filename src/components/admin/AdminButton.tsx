/**
 * Primary pill button used across the Admin screens.
 *
 * It used to be a `button()` closure inside `admin.tsx`; the sections are
 * separate routes now, so it lives here instead of being redefined four times.
 */
import { Pressable } from 'react-native';

import { AppText } from '../AppText';
import { useTheme } from '../../hooks/useTheme';
import { radius, spacing } from '../../theme/tokens';

interface AdminButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export function AdminButton({ label, onPress, disabled = false }: AdminButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      android_ripple={{ color: colors.border }}
      style={({ pressed }) => ({
        marginTop: spacing.sm,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: colors.primary,
        alignItems: 'center',
        opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
      })}>
      <AppText variant="label" color={colors.onPrimary} style={{ fontWeight: '700' }}>
        {label}
      </AppText>
    </Pressable>
  );
}
