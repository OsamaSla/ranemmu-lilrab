/**
 * Core hymn domain model.
 *
 * `verses[].lines[]` is deliberately two-dimensional: search results reference
 * positions as `verse:line` (e.g. "1:9"), which requires per-line granularity
 * rather than one blob of text per stanza.
 */

/** One stanza (مقطع — a group of verses). `label` is the printed marker, usually Arabic-Indic digits. */
export interface HymnVerse {
  label: string;
  lines: string[];
  /** Set on the refrain so the reader can indent it. Falls back to `chorus`. */
  chorus?: boolean;
}

/** Lightweight record used by the library list, recents, favorites and structure screens. */
export interface HymnSummary {
  id: string;
  number: number;
  title: string;
  /** مقياس الكلام — metre cadence, e.g. "87.87.87". Groups the "similar hymns" views. */
  meter?: string;
  /** True when the summary should be flagged as a chorus-bearing hymn. */
  hasChorus?: boolean;
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
   * everywhere else. Never machine-generated — only the typist's wording.
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
