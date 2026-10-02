/**
 * Resolves the active colour theme and the chrome type scale.
 */
import { useColorScheme } from 'react-native';
import { useMemo } from 'react';

import { useSettings } from '../store/settings';
import { fontFamilyFor, type as typeScale } from '../theme/fonts';
import { themes, type ThemeColors } from '../theme/tokens';

export interface AppTheme {
  colors: ThemeColors;
  isDark: boolean;
  /**
   * Type scale with the user's app-size preference applied. Hymn text is not
   * scaled here — the reader uses its own size so it can go larger than the
   * chrome without distorting the rest of the UI.
   */
  type: typeof typeScale;
  /** Font family name for chrome text. */
  fontFamily: string;
  /** Font family name for bold chrome text. */
  fontFamilyBold: string;
}

export function useTheme(): AppTheme {
  const scheme = useColorScheme();
  const themePreference = useSettings((s) => s.theme);
  const appScale = useSettings((s) => s.appScale);
  const fontId = useSettings((s) => s.fontFamily);

  return useMemo(() => {
    const isDark = themePreference === 'system' ? scheme === 'dark' : themePreference === 'dark';

    return {
      colors: themes[isDark ? 'dark' : 'light'],
      isDark,
      type: Object.fromEntries(
        Object.entries(typeScale).map(([key, size]) => [key, Math.round(size * appScale)]),
      ) as typeof typeScale,
      fontFamily: fontFamilyFor(fontId, false),
      fontFamilyBold: fontFamilyFor(fontId, true),
    };
  }, [scheme, themePreference, appScale, fontId]);
}