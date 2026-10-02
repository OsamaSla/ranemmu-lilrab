/**
 * Bundled font registry and type scale.
 *
 * All six families are OFL-licensed and shipped inside the app so the reader
 * works fully offline — nothing is fetched at runtime. Files are produced by
 * `npm run fonts`; the variable-font families (Cairo, Marhey) are instanced to
 * static 400/700 there because React Native on Android selects weight by family
 * name rather than by axis.
 */
import { useFonts } from 'expo-font';

export interface FontFamily {
  /** Key used in settings and persisted in storage. */
  id: string;
  /** Name shown on the font chip. Kept in Latin script so chips read clearly. */
  label: string;
  /** Registered family name for regular text. */
  regular: string;
  /** Registered family name for bold text, or null when only one weight exists. */
  bold: string | null;
}

/**
 * `label` is intentionally not localised: the reference app shows these in
 * Latin script, and matching it keeps the chips recognisable across locales.
 */
export const FONT_FAMILIES: FontFamily[] = [
  { id: 'cairo', label: 'Cairo', regular: 'Cairo', bold: 'Cairo-Bold' },
  { id: 'amiri', label: 'Amiri', regular: 'Amiri', bold: 'Amiri-Bold' },
  { id: 'scheherazade', label: 'Scheherazade', regular: 'ScheherazadeNew', bold: 'ScheherazadeNew-Bold' },
  { id: 'marhey', label: 'Marhey', regular: 'Marhey', bold: 'Marhey-Bold' },
  { id: 'katibeh', label: 'Katibeh', regular: 'Katibeh', bold: null },
  { id: 'rakkas', label: 'Rakkas', regular: 'Rakkas', bold: null },
];

export const DEFAULT_FONT_ID = 'cairo';

export function getFontFamily(id: string): FontFamily {
  return FONT_FAMILIES.find((f) => f.id === id) ?? FONT_FAMILIES[0];
}

/** Maps a fontWeight to the registered family name for the selected font. */
export function fontFamilyFor(id: string, bold = false): string {
  const family = getFontFamily(id);
  if (!bold) return family.regular;
  return family.bold ?? family.regular;
}

/**
 * Fonts are registered as `<Family>` for regular and `<Family>-Bold` for bold.
 * React Native picks between them via `fontFamily` + `fontWeight: '700'`, so
 * both the family name and the weight must be set.
 */
const FONT_MAP = {
  Cairo: require('../../assets/fonts/Cairo-Regular.ttf'),
  'Cairo-Bold': require('../../assets/fonts/Cairo-Bold.ttf'),
  Amiri: require('../../assets/fonts/Amiri-Regular.ttf'),
  'Amiri-Bold': require('../../assets/fonts/Amiri-Bold.ttf'),
  ScheherazadeNew: require('../../assets/fonts/ScheherazadeNew-Regular.ttf'),
  'ScheherazadeNew-Bold': require('../../assets/fonts/ScheherazadeNew-Bold.ttf'),
  Marhey: require('../../assets/fonts/Marhey-Regular.ttf'),
  'Marhey-Bold': require('../../assets/fonts/Marhey-Bold.ttf'),
  Katibeh: require('../../assets/fonts/Katibeh-Regular.ttf'),
  Rakkas: require('../../assets/fonts/Rakkas-Regular.ttf'),
} as const;

/** Loads the bundled fonts. Returns null once loading has begun. */
export function useAppFonts() {
  const [loaded, error] = useFonts(FONT_MAP);
  if (!loaded && !error) return null;
  if (error) throw error;
  return true;
}

/**
 * Type scale in points. Reader sizes are scaled from `readerBaseSize` in
 * settings rather than baked in here, so the A+/A− control is a single number.
 */
export const type = {
  display: 30,
  title: 22,
  heading: 18,
  body: 16,
  label: 14,
  caption: 12,
} as const;

/** The key set of the type scale, for the `variant` prop of text components. */
export type TypeScale = typeof type;

/** Reading measure: cap the line length so long verses stay easy to track. */
export const READER_MAX_WIDTH = 640;
