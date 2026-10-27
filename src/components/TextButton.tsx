/**
 * Low-emphasis text action, used in app bars and list footers.
 *
 * Kept separate from a filled button so a destructive or secondary action like
 * "clear history" does not compete with the primary CTA.
 */
import { Pressable, type PressableProps } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from '../hooks/useTheme';
import type { TypeScale } from '../theme/fonts';
import { HIT_SLOP, MIN_TOUCH } from '../theme/tokens';

interface TextButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: keyof TypeScale;
  color?: string;
}

export function TextButton({ label, variant = 'label', color, ...rest }: TextButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={HIT_SLOP}
      android_ripple={{ color: colors.border }}
      style={({ pressed }) => ({
        minHeight: MIN_TOUCH,
        justifyContent: 'center',
        paddingHorizontal: 8,
        opacity: pressed ? 0.6 : 1,
      })}>
      <AppText variant={variant} color={color ?? colors.accent} style={{ fontWeight: '700' }}>
        {label}
      </AppText>
    </Pressable>
  );
}