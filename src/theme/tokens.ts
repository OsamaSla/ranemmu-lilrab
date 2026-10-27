/**
 * Design tokens, matching the reference app's palette.
 *
 * Light surfaces are neutral greys with white cards; the reading surface
 * is intentionally pure black (not dark grey) so fullscreen mode matches the
 * printed contrast of a hymnal rather than looking like a dimmed screen.
 */

export const palette = {
  /** Primary gold — header bars, active tab, primary CTA. */
  gold: '#D4B85F',
  /** Deeper gold used for top bar in reference app. */
  goldDeep: '#C8A84D',
  /** Interactive accents: sliders, chips, focus rings. */
  accent: '#8A9A87',

  canvas: '#0A1A14',
  canvasAlt: '#122A20',
  surface: '#1A2E24',
  border: 'rgba(255,255,255,0.08)',

  text: '#F7F4E9',
  textMuted: '#B8B0A8',
  textInverse: '#0A1A14',

  /** Fullscreen reading mode. */
  readerBg: '#000000',
  readerText: '#FFFFFF',

  favorite: '#C8A84D',
  danger: '#F2B8B5',
  overlay: 'rgba(0,0,0,0.65)',
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
    canvas: '#FDFBF7',
    surface: '#FFFFFF',
    surfaceMuted: '#F7F4E9',
    border: 'rgba(15,42,30,0.08)',
    text: '#0F2A1E',
    textMuted: '#6B635D',
    primary: '#C8A84D',
    primaryDeep: '#A8842E',
    accent: '#8A9A87',
    onPrimary: '#0A1A14',
    favorite: '#C8A84D',
    danger: '#B3261E',
    overlay: 'rgba(0,0,0,0.45)',
  },
  dark: {
    canvas: '#0A1A14',
    surface: '#1A2E24',
    surfaceMuted: '#122A20',
    border: 'rgba(255,255,255,0.08)',
    text: '#F7F4E9',
    textMuted: '#B8B0A8',
    primary: '#C8A84D',
    primaryDeep: '#A8842E',
    accent: '#8A9A87',
    onPrimary: '#0A1A14',
    favorite: '#C8A84D',
    danger: '#F2B8B5',
    overlay: 'rgba(0,0,0,0.65)',
  },
};
