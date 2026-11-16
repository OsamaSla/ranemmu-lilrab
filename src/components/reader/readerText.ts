/**
 * Small, dependency-free pieces shared by the reader's extracted components.
 * Kept in one module so the toolbar, verse blocks and notices agree on the
 * language chips, the translation disclaimers and the refrain heading.
 */

export type ReaderLang = 'ar' | 'en' | 'de' | 'he';

/** One saturated fill and one pale tint per language, distinguishable in both themes. */
export const CHIP_COLORS: Record<ReaderLang, { fill: string; tint: string }> = {
  ar: { fill: '#C5A03D', tint: '#FFF8E1' },
  en: { fill: '#1565C0', tint: '#E3F2FD' },
  de: { fill: '#2E7D32', tint: '#E8F5E9' },
  he: { fill: '#5E35B1', tint: '#EDE7F6' },
};

/**
 * AI-translation disclaimer, in the language being viewed (not the UI
 * language). Hebrew is human-authored, but it still carries an honesty note
 * because it has no per-language review flag; EN/DE print theirs only for
 * AI_DRAFT. Arabic is the original and needs none.
 */
export const TRANSLATION_NOTES = {
  en: 'This English translation was made by AI and is not 100% reliable — it only gives the main idea of the hymn.',
  de: 'Diese deutsche Übersetzung wurde von einer KI erstellt und ist nicht zu 100 % zuverlässig — sie gibt nur die Hauptidee des Liedes wieder.',
  he: 'התרגום העברי הזה נעשה על ידי בינה מלאכותית ואינו אמין ב־100% — הוא נותן רק את הרעיון המרכזי של המזמור.',
} as const;

/** Review badge shown above a translation, in the viewed language. */
export const TRANSLATION_STATUS_LABEL = {
  AI_DRAFT: { en: 'AI draft', de: 'KI-Entwurf' },
  VERIFIED: { en: 'Verified', de: 'Geprüft' },
} as const;

/** Printed word for a refrain when neither the hymn nor its label carries one. */
const REFRAIN_FALLBACK = 'القرار';

/** A label that is nothing but a stanza number ("1", "١", "12"). */
const NUMBER_LABEL = /^[0-9\u0660-\u0669]+$/;

/**
 * Heading printed above a refrain stanza. Older saved records carry the stanza
 * number in `label` (a refrain flagged "1" rendered as "(1)"), so a bare
 * number is never shown for a refrain.
 */
export function refrainHeading(
  chorus: string | undefined,
  translated: string | undefined,
  label: string | undefined,
): string {
  if (chorus?.trim() && translated?.trim() && translated !== chorus) {
    return `${chorus} · ${translated}`;
  }
  if (chorus?.trim()) return chorus;
  if (translated?.trim()) return translated;
  const printed = label?.trim();
  if (printed && !NUMBER_LABEL.test(printed)) return printed;
  return REFRAIN_FALLBACK;
}
