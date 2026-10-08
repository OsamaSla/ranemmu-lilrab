/**
 * Circular icon button used in the app bar, reader rail and tab-like rows.
 *
 * Always carries an accessibility label and role, because several of these are
 * the only affordance for their action (favourite, fullscreen, info).
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';

import { useTheme } from '../hooks/useTheme';
import { HIT_SLOP, MIN_TOUCH } from '../theme/tokens';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface IconButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  name: IconName;
  /** Required: this is what a screen reader announces. */
  label: string;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export function IconButton({
  name,
  label,
  size = 24,
  color,
  style,
  ...rest
}: IconButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={HIT_SLOP}
      android_ripple={{ color: colors.border }}
      style={({ pressed }) => [
        {
          width: MIN_TOUCH,
          height: MIN_TOUCH,
          borderRadius: MIN_TOUCH / 2,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}>
      <MaterialCommunityIcons name={name} size={size} color={color ?? colors.text} />
    </Pressable>
  );
}