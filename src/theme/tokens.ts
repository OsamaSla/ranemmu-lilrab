/**
 * Design tokens, matching the reference app's palette.
 *
 * Light surfaces are warm-neutral greys with white cards; the reading surface
 * is intentionally pure black (not dark grey) so fullscreen mode matches the
 * printed contrast of a hymnal rather than looking like a dimmed screen.
 */

export const palette = {
  /** Primary teal — header bars, active tab, primary CTA. */
  teal: '#0F5B66',
  /** Slightly deeper teal used for the top bar in the reference app. */
  tealDeep: '#184D55',
  /** Interactive accents: sliders, chips, focus rings. */
  accent: '#20808D',

  canvas: '#F2F4F5',
  canvasAlt: '#EFEFEF',
  surface: '#FFFFFF',
  border: '#E1E5E7',

  text: '#132024',
  textMuted: '#5C6B70',
  textInverse: '#FFFFFF',

  /** Fullscreen reading mode. */
  readerBg: '#000000',
  readerText: '#FFFFFF',

  favorite: '#C9A227',
  danger: '#B3261E',
  overlay: 'rgba(0,0,0,0.45)',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Android's minimum comfortable touch target. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
export const MIN_TOUCH = 48;

/**
 * Card elevation, matching the soft shadow in the reference design.
 * Expressed as `boxShadow`, which React Native 0.76+ honours on native and
 * react-native-web maps straight to CSS — the legacy `shadow*` props warn on
 * web, so they are deliberately not used.
 */
export const shadow = {
  card: {
    boxShadow: '0 3px 10px rgba(11, 42, 48, 0.08)',
  },
  bar: {
    boxShadow: '0 -2px 12px rgba(11, 42, 48, 0.12)',
  },
} as const;

export type ThemeName = 'light' | 'dark';

/**
 * Semantic colours for a mode. Reader-specific colours are excluded on purpose:
 * fullscreen reading is always black-on-white so the mode does not change the
 * contrast of the actual hymn text.
 */
export interface ThemeColors {
  canvas: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryDeep: string;
  accent: string;
  onPrimary: string;
  favorite: string;
  danger: string;
  overlay: string;
}

export const themes: Record<ThemeName, ThemeColors> = {
  light: {
    canvas: palette.canvas,
    surface: palette.surface,
    surfaceMuted: palette.canvasAlt,
    border: palette.border,
    text: palette.text,
    textMuted: palette.textMuted,
    primary: palette.teal,
    primaryDeep: palette.tealDeep,
    accent: palette.accent,
    onPrimary: palette.textInverse,
    favorite: palette.favorite,
    danger: palette.danger,
    overlay: palette.overlay,
  },
  dark: {
    canvas: '#0D1416',
    surface: '#161F22',
    surfaceMuted: '#1E282B',
    border: '#2A3639',
    text: '#E8EDEF',
    textMuted: '#9AA8AD',
    primary: '#2E8C99',
    primaryDeep: '#1B5A65',
    accent: '#3FA3B0',
    onPrimary: '#FFFFFF',
    favorite: '#E0BC4A',
    danger: '#F2B8B5',
    overlay: 'rgba(0,0,0,0.65)',
  },
};
