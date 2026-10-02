/**
 * Elevated rounded surface — the card pattern used throughout the app.
 */
import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { useTheme } from '../hooks/useTheme';
import { radius, shadow } from '../theme/tokens';

interface CardProps extends ViewProps {
  padded?: boolean;
  children?: ReactNode;
}

export function Card({ padded = true, style, children, ...rest }: CardProps) {
  const { colors } = useTheme();

  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: padded ? 16 : 0,
          overflow: 'hidden',
        },
        shadow.card,
        style,
      ]}>
      {children}
    </View>
  );
}