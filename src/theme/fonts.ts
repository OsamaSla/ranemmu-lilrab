/**
 * Bundled font registry and type scale.
 *
 * All six families are OFL-licensed and shipped inside the app so the reader
 * works fully offline — nothing is fetched at runtime. Files are produced by
 * `npm run fonts`; the variable-font families (Cairo, Marhey) are instanced to
 * static 400/700 there because React Native on Android selects weight by family
 * name rather than by axis.
 */
import { useEffect, useState } from 'react';

import { loadAsync, isLoaded } from 'expo-font';

export interface FontFamily {
  /** Key used in settings and persisted in storage. */
  id: string;
  /** Name shown on the font chip. Kept in Latin script so chips read clearly. */
  label: string;
  /** Registered family name for regular text. */
  regular: string;
  /** Registered family name for bold text, or null when only one weight exists. */
  bold: string | null;
  /** Line-height ratio (leading) for this family. */
  lineRatio: number;
}

/**
 * `label` is intentionally not localised: the reference app shows these in
 * Latin script, and matching it keeps the chips recognisable across locales.
 */
export const FONT_FAMILIES: FontFamily[] = [
  { id: 'cairo', label: 'Cairo', regular: 'Cairo', bold: 'Cairo-Bold', lineRatio: 1.6 },
  { id: 'amiri', label: 'Amiri', regular: 'Amiri', bold: 'Amiri-Bold', lineRatio: 1.8 },
  { id: 'scheherazade', label: 'Scheherazade', regular: 'ScheherazadeNew', bold: 'ScheherazadeNew-Bold', lineRatio: 2.0 },
  { id: 'marhey', label: 'Marhey', regular: 'Marhey', bold: 'Marhey-Bold', lineRatio: 1.6 },
  { id: 'katibeh', label: 'Katibeh', regular: 'Katibeh', bold: null, lineRatio: 1.6 },
  { id: 'rakkas', label: 'Rakkas', regular: 'Rakkas', bold: null, lineRatio: 1.6 },
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
/**
 * Per-family font file maps. Only the active family is loaded up front; the
 * rest are pulled in on demand via `ensureFontFamily()` / `Font.loadAsync`,
 * so the first paint no longer waits on all ten TTFs.
 */
export const FONT_FILES_BY_ID: Record<string, Record<string, any>> = {
  cairo: {
    Cairo: require('../../assets/fonts/Cairo-Regular.ttf'),
    'Cairo-Bold': require('../../assets/fonts/Cairo-Bold.ttf'),
  },
  amiri: {
    Amiri: require('../../assets/fonts/Amiri-Regular.ttf'),
    'Amiri-Bold': require('../../assets/fonts/Amiri-Bold.ttf'),
  },
  scheherazade: {
    ScheherazadeNew: require('../../assets/fonts/ScheherazadeNew-Regular.ttf'),
    'ScheherazadeNew-Bold': require('../../assets/fonts/ScheherazadeNew-Bold.ttf'),
  },
  marhey: {
    Marhey: require('../../assets/fonts/Marhey-Regular.ttf'),
    'Marhey-Bold': require('../../assets/fonts/Marhey-Bold.ttf'),
  },
  katibeh: {
    Katibeh: require('../../assets/fonts/Katibeh-Regular.ttf'),
  },
  rakkas: {
    Rakkas: require('../../assets/fonts/Rakkas-Regular.ttf'),
  },
};

const loadPromises = new Map<string, Promise<void>>();

/** True once every registered name for `id` has finished loading. */
export function isFontFamilyLoaded(id: string): boolean {
  const files = FONT_FILES_BY_ID[id];
  if (!files) return true;
  return Object.keys(files).every((name) => isLoaded(name));
}

/**
 * Load (and cache) a single font family on demand. Safe to call repeatedly;
 * concurrent calls share one promise. Never throws — failures are logged and
 * the promise resolves so callers can keep rendering with a fallback.
 */
export function ensureFontFamily(id: string): Promise<void> {
  const existing = loadPromises.get(id);
  if (existing) return existing;
  const files = FONT_FILES_BY_ID[id];
  if (!files || isFontFamilyLoaded(id)) {
    const resolved = Promise.resolve();
    loadPromises.set(id, resolved);
    return resolved;
  }
  const promise = loadAsync(files)
    .catch((err) => {
      console.warn('[fonts] failed to load family', id, err);
    })
    .then(() => undefined);
  loadPromises.set(id, promise);
  return promise;
}

/**
 * Loads only the active family up front. Returns `null` while it is loading
 * (splash stays up) and `true` once it is ready. Other families are loaded
 * on demand via `ensureFontFamily()`.
 */
export function useAppFonts(activeId?: string) {
  const fontId = activeId ?? DEFAULT_FONT_ID;
  const [ready, setReady] = useState<boolean>(() => isFontFamilyLoaded(fontId));

  useEffect(() => {
    let cancelled = false;
    void ensureFontFamily(fontId).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [fontId]);

  if (!ready) return null;
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
