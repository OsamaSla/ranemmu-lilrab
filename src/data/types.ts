/**
 * Core hymn domain model.
 *
 * `verses[].lines[]` is deliberately two-dimensional: search results reference
 * positions as `verse:line` (e.g. "1:9"), which requires per-line granularity
 * rather than one blob of text per stanza.
 */

/** One stanza. `label` is the printed marker, usually Arabic-Indic digits. */
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
  /** نظم — the tune name, e.g. "HAMZA". Groups the "similar hymns" views. */
  tune?: string;
  /** مقياس الكلام — metre cadence, e.g. "87.87.87". */
  meter?: string;
  /** True when the summary should be flagged as a chorus-bearing hymn. */
  hasChorus?: boolean;
}

export interface Hymn extends HymnSummary {
  /** كورد — musical key, e.g. "Db". */
  key?: string;
  /** المؤلف — author/lyricist. */
  author?: string;
  /** الملحن — composer. */
  composer?: string;
  /**
   * The printed label of the refrain (e.g. "القرار"), rendered above any
   * stanza flagged `chorus`. Kept at the hymn level because a book uses one
   * label for the whole hymn; stanzas only carry the boolean flag.
   */
  chorus?: string;
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

/** Metadata exposed by the info sheet, in the order the reference app lists it. */
export interface HymnInfo {
  tune?: string;
  author?: string;
  key?: string;
  composer?: string;
  meter?: string;
}
