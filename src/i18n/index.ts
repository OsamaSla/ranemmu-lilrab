/**
 * Locale registry and translation lookup.
 *
 * The Arabic dictionary is nested for authoring but flattened to dotted keys
 * here, because `en.ts` and `de.ts` are authored flat — nesting them would
 * gain nothing and cost a deep-merge on every lookup. `useT` in ../hooks/useT
 * binds this to the persisted locale.
 */
import { ar, type Dictionary, type TranslationKey } from './ar';
import { en } from './en';
import { de } from './de';
import type { BookId } from '../data/types';

export type LocaleCode = 'ar' | 'en' | 'de';

export const DEFAULT_LOCALE: LocaleCode = 'ar';

/** UI languages the dictionaries cover; the language switcher lists these. */
export const LOCALES = ['ar', 'en', 'de'] as const satisfies readonly LocaleCode[];

export function isLocale(value: unknown): value is LocaleCode {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

type FlatDictionary = Record<TranslationKey, string>;

/** Flattens the nested Arabic source to the same dotted shape en/de use. */
function flatten(node: Record<string, unknown>, prefix = ''): FlatDictionary {
  const out: Record<string, string> = {};

  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    else if (value !== null && typeof value === 'object') {
      Object.assign(out, flatten(value as Record<string, unknown>, path));
    }
  }

  return out as FlatDictionary;
}

const DICTIONARIES: Record<LocaleCode, FlatDictionary> = {
  ar: flatten(ar),
  en,
  de,
};

/**
 * Only Arabic is right-to-left. Adding a language here means adding it to
 * DICTIONARIES too — the type checker enforces it.
 */
const RTL_LOCALES: ReadonlySet<LocaleCode> = new Set<LocaleCode>(['ar']);

export function isRTL(locale: LocaleCode): boolean {
  return RTL_LOCALES.has(locale);
}

/**
 * Looks up `key`, falling back to Arabic when a translation is missing.
 * Falling back to Arabic rather than to the key itself means a partially
 * translated locale degrades to a readable label instead of a blank one.
 */
export function translate(locale: LocaleCode, key: TranslationKey): string {
  return DICTIONARIES[locale][key] ?? DICTIONARIES.ar[key] ?? key;
}

/**
 * Display name of a book. Kept next to the dictionaries because the reader's
 * "also in" rows, the admin lists and the book picker all need the same three
 * labels; a missing `book.book3` key would otherwise silently fall back to
 * "Sing to the Lord".
 */
export function bookLabelKey(book: BookId | string | undefined): TranslationKey {
  if (book === 'taranim') return 'book.taranim';
  if (book === 'book3') return 'book.book3';
  return 'book.main';
}

export type { TranslationKey, Dictionary };
