/**
 * Compact icon button for the reader headers. Transparent background, 40px
 * touch target by default, coloured icon. The prev/next pair uses a narrower
 * box so the whole toolbar fits small phones without scrolling — hitSlop still
 * keeps the effective touch area above 48px.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { IconButton } from '../IconButton';
import { useTheme } from '../../hooks/useTheme';
import { palette } from '../../theme/tokens';

interface ReaderIconButtonProps {
  name: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  onPress: () => void;
  color?: string;
  dark?: boolean;
  disabled?: boolean;
  box?: number;
}

export function ReaderIconButton({
  name,
  label,
  onPress,
  color,
  dark,
  disabled,
  box = 34,
}: ReaderIconButtonProps) {
  const { colors } = useTheme();

  return (
    <IconButton
      name={name}
      label={label}
      onPress={onPress}
      disabled={disabled}
      size={22}
      color={color ?? (dark ? palette.readerText : colors.onPrimary)}
      style={{
        width: box,
        height: 40,
        borderRadius: box / 2,
        backgroundColor: 'transparent',
        borderWidth: 0,
        // A tapped icon must not keep a browser focus ring behind a sheet.
        outlineStyle: 'solid',
        outlineWidth: 0,
        opacity: disabled ? 0.35 : 1,
      }}
    />
  );
}
