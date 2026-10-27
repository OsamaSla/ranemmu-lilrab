/**
 * Core hymn domain model.
 *
 * `verses[].lines[]` is deliberately two-dimensional: search results reference
 * positions as `verse:line` (e.g. "1:9"), which requires per-line granularity
 * rather than one blob of text per stanza.
 */

import type { TopicId } from './topics';

/** One stanza (مقطع — a group of verses). `label` is the printed marker, usually Arabic-Indic digits. */
export interface HymnVerse {
  label: string;
  lines: string[];
  /** Set on the refrain so the reader can indent it. Falls back to `chorus`. */
  chorus?: boolean;
}

/** Hymn book identifier. `main` is the original corpus (numbers 1-1000). */
export type BookId = 'main' | 'taranim';

/** Static metadata for each book bundled in the app. */
export interface BookMeta {
  id: BookId;
  /** Stable hymn-id prefix for this book (`h0001`, `tr0001`, …). */
  idPrefix: string;
}

/** Books shipped with the app, in display order. */
export const BOOKS: BookMeta[] = [
  { id: 'main', idPrefix: 'h' },
  { id: 'taranim', idPrefix: 'tr' },
];

/** Lightweight record used by the library list, recents, favorites and structure screens. */
export interface HymnSummary {
  id: string;
  /** Owning book. Missing on legacy records means `main`. */
  book?: BookId;
  number: number;
  title: string;
  /** مقياس الكلام — metre cadence, e.g. "87.87.87". Groups the "similar hymns" views. */
  meter?: string;
  /** True when the summary should be flagged as a chorus-bearing hymn. */
  hasChorus?: boolean;
  /**
   * Optional curated recording link (YouTube video, SoundCloud track, direct
   * MP3, …) where this hymn's melody can be heard. Absent when unknown — the
   * reader falls back to a YouTube search for the hymn number + title, so
   * every hymn stays listenable even before a link is curated.
   */
  mediaUrl?: string;
  /**
   * Primary thematic topic (one of the 9 in ./topics), used for default
   * topic grouping. Absent until the hymn is classified.
   */
  primaryTopic?: TopicId;
  /**
   * Secondary thematic tags (never repeats `primaryTopic`). A hymn can
   * belong to several topics at once without duplicating its record.
   */
  topics?: TopicId[];
}

export interface Hymn extends HymnSummary {
  /**
   * The printed label of the refrain (e.g. "القرار"), rendered above any
   * stanza flagged `chorus`. Kept at the hymn level because a book uses one
   * label for the whole hymn; stanzas only carry the boolean flag.
   */
  chorus?: string;
  /**
   * Optional human translations. Each language is independent and partial:
   * a hymn shows the UI language's text wherever present and Arabic
   * everywhere else. Hymns 1001-1047 carry AI-draft translations instead —
   * the reader shows a disclaimer wherever a translation renders.
   */
  title_en?: string;
  verses_en?: HymnVerse[];
  chorus_en?: string;
  title_de?: string;
  verses_de?: HymnVerse[];
  chorus_de?: string;
  /**
   * Who wrote the Arabic words (poet, or translator for translated hymns).
   * Absent when unknown — the app hides the author line for those hymns.
   */
  author?: string;
  /** Foreign original author (e.g. "John W. Peterson"), when known. */
  authorOriginal?: string;
  /** Free-form notes shown in the info sheet. */
  info?: string;
  /**
   * Translation review state. Absent (legacy records) means AI_DRAFT —
   * only an explicit VERIFIED, set by a proofreader in Admin, hides the
   * AI-translation disclaimer in the reader.
   */
  translationStatus?: 'AI_DRAFT' | 'VERIFIED';
  verses: HymnVerse[];
}

/** A single search hit: which hymn, where in it, and the matched span. */
export interface SearchMatch {
  hymn: HymnSummary;
  verseIndex: number;
  lineIndex: number;
  /** Display label of the matched line's stanza, e.g. "٢". */
  label: string;
  line: string;
  /** Indices into `line` of the normalised form that matched. */
  start: number;
  end: number;
  /** Set when the hit was in the title rather than a verse. */
  inTitle?: boolean;
}
