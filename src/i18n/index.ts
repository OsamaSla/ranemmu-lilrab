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

export type LocaleCode = 'ar' | 'en' | 'de';

export const DEFAULT_LOCALE: LocaleCode = 'ar';

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

export const DICTIONARIES: Record<LocaleCode, FlatDictionary> = {
  ar: flatten(ar),
  en,
  de,
};

/** Locales offered in settings, in the order they should appear. */
export const LOCALES: { code: LocaleCode; label: string; nativeLabel: string }[] = [
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
];

/**
 * Only Arabic is right-to-left. Adding a language here means adding it to
 * DICTIONARIES and LOCALES too — the type checker enforces the former.
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

export type { TranslationKey, Dictionary };
