/**
 * Typography-aware Text.
 *
 * Every piece of text in the app goes through this so the user's font-family and
 * size preferences, plus the current theme colour, are applied in one place.
 * It also sets `writingDirection` from the active locale, which is what makes
 * Arabic punctuation and numerals sit correctly without per-screen overrides.
 */
import { Text, type TextProps, type TextStyle } from 'react-native';

import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import type { TypeScale } from '../theme/fonts';

interface AppTextProps extends TextProps {
  /** Key into the type scale. */
  variant?: keyof TypeScale;
  color?: string;
  /** Set false for hymn text, which should render at its own size. */
  useAppFont?: boolean;
  center?: boolean;
}

export function AppText({
  variant = 'body',
  color,
  useAppFont = true,
  center,
  style,
  ...rest
}: AppTextProps) {
  const { colors, type, fontFamily, fontFamilyBold } = useTheme();
  const { direction } = useT();

  const weight: TextStyle['fontWeight'] = variant === 'display' || variant === 'title' ? '700' : '400';

  const composed: TextStyle = {
    fontSize: type[variant],
    lineHeight: Math.round(type[variant] * 1.5),
    color: color ?? colors.text,
    textAlign: center ? 'center' : direction.textAlign,
    writingDirection: direction.dir,
    ...(useAppFont
      ? { fontFamily: weight === '700' ? fontFamilyBold : fontFamily, fontWeight: weight }
      : {}),
  };

  return <Text {...rest} style={[composed, style]} />;
}