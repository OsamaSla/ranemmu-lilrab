/**
 * Shared logic for the Firebase review-sheet pipeline
 * (scripts/export-review-sheet.mjs <-> scripts/import-review-sheet.mjs).
 *
 * One spreadsheet row = one hymn. Verse structure travels inside the text
 * cells with stanza headers (`[1]`, `[2]`, … and `[قرار]` for the refrain),
 * stanzas separated by a blank line:
 *
 *   [1]
 *   line one
 *   line two
 *
 *   [قرار]
 *   refrain line
 *
 * Structural edits (reorder/add/remove stanzas or lines) are NOT expressible
 * here on purpose: the importer matches blocks positionally against the
 * stored record and rejects any shape mismatch, exactly like the Admin
 * editor. Structure stays a PC-side job via the xlsx corpus pipeline.
 */
import { TOPIC_IDS } from './topic-keywords.mjs';

/** Translation languages the review sheet supports. `de` is the default. */
export const REVIEW_LANGS = ['de', 'en'];

/** Name of the tab carrying the hymn rows (export writes it, import finds it by name). */
export const REVIEW_SHEET_NAME = 'Review';

/** Field names for the reviewed language. */
export function langFields(lang) {
  return { title: `title_${lang}`, verses: `verses_${lang}`, chorus: `chorus_${lang}` };
}

/** Header shown for `[قرار]`-style refrain blocks. Both spellings parse back. */
export const CHORUS_HEADERS = new Set(['قرار', 'القرار']);

/**
 * Spreadsheet columns in order. `key` is the row-object field; `readonly`
 * columns identify the hymn and are never written back.
 */
export function sheetColumns(lang) {
  const languageName = lang === 'de' ? 'German' : 'English';
  return [
    { key: 'id', header: 'ID', width: 10, readonly: true },
    { key: 'number', header: 'Number', width: 10, readonly: true },
    { key: 'book', header: 'Book', width: 12, readonly: true },
    { key: 'title', header: 'Title (Arabic)', width: 30, rtl: true },
    { key: 'arabic', header: 'Arabic Text', width: 70, rtl: true, multiline: true },
    { key: 'titleLang', header: `${languageName} Title`, width: 30 },
    { key: 'textLang', header: `${languageName} Translation`, width: 70, multiline: true },
    { key: 'primaryTopic', header: 'Primary Category', width: 18 },
    { key: 'topics', header: 'Tags', width: 30 },
    { key: 'reviewed', header: 'IsReviewed', width: 12 },
  ];
}

/** ExcelJS cells can be strings, numbers, booleans, rich text or null. */
export function cellText(cell) {
  const v = cell?.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.replace(/\r\n/g, '\n');
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('').replace(/\r\n/g, '\n');
    if (typeof v.text === 'string') return v.text.replace(/\r\n/g, '\n');
    if (v.result !== undefined) return String(v.result);
  }
  return '';
}

/** Flattens stanzas into the review-sheet text encoding. */
export function encodeVerses(verses) {
  return (verses ?? [])
    .map((v) => [`[${v.chorus ? 'قرار' : v.label}]`, ...v.lines].join('\n'))
    .join('\n\n');
}

/**
 * Parses a review-sheet text cell back into blocks.
 * Returns `{ blocks }` or `{ error }`. Labels/flags are NOT trusted from
 * the sheet — the caller matches blocks positionally against the stored
 * record and keeps labels/flags from there.
 */
export function parseVersesCell(text) {
  if (typeof text !== 'string' || text.trim() === '') return { error: 'text cell is blank' };
  const chunks = text
    .replace(/\r\n/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((c) => c.split('\n').map((l) => l.trim()).filter((l) => l !== ''));
  const blocks = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const lines = chunks[i];
    if (lines.length === 0) continue;
    const header = /^\[(.+)\]$/.exec(lines[0]);
    if (!header) return { error: `stanza ${i + 1}: first line must be a header like [1] or [قرار]` };
    if (lines.length < 2) return { error: `stanza ${i + 1} (${lines[0]}): no text lines` };
    blocks.push({ header: header[1].trim(), chorus: CHORUS_HEADERS.has(header[1].trim()), lines: lines.slice(1) });
  }
  if (blocks.length === 0) return { error: 'text cell has no stanzas' };
  return { blocks };
}

/**
 * Positional shape check: same stanza count, same line counts, same
 * refrain flags. Returns null when shapes agree, otherwise a description.
 */
export function shapeMismatch(stored, blocks) {
  if (blocks.length !== stored.length) {
    return `${blocks.length} stanzas vs ${stored.length} stored — structural edits are PC-only`;
  }
  for (let i = 0; i < stored.length; i += 1) {
    if (blocks[i].lines.length !== stored[i].lines.length) {
      return `stanza ${i + 1} has ${blocks[i].lines.length} lines vs ${stored[i].lines.length} stored — structural edits are PC-only`;
    }
    if (blocks[i].chorus !== !!stored[i].chorus) {
      return `stanza ${i + 1}: refrain flag changed — structural edits are PC-only`;
    }
  }
  return null;
}

/** Parses IsReviewed. Blank means "no change" (never mass-unreviews). */
export function parseReviewed(value) {
  if (value === null || value === undefined) return { value: null };
  if (typeof value === 'boolean') return { value };
  const s = String(value).trim().toLowerCase();
  if (s === '') return { value: null };
  if (['true', '1', 'yes', 'y', 'wahr', 'ja'].includes(s)) return { value: true };
  if (['false', '0', 'no', 'n', 'falsch', 'nein'].includes(s)) return { value: false };
  return { error: `IsReviewed must be TRUE/FALSE (got ${JSON.stringify(String(value).slice(0, 20))})` };
}

/** Parses the Tags cell into a topic-id array. Primary is dropped (kept primary-only). */
export function parseTopicsCell(value, primary) {
  const s = cellText({ value });
  if (s.trim() === '') return { topics: [] };
  const tags = s.split(/[,;]/).map((t) => t.trim().toLowerCase()).filter((t) => t !== '');
  for (const tag of tags) {
    if (!TOPIC_IDS.includes(tag)) {
      return { error: `unknown tag '${tag}' (valid: ${TOPIC_IDS.join(', ')})` };
    }
  }
  if (new Set(tags).size !== tags.length) return { error: 'duplicate entries in Tags' };
  return { topics: tags.filter((t) => t !== primary) };
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Builds one export row from a hymn record. */
export function rowFromHymn(hymn, lang) {
  const f = langFields(lang);
  const versesLang = hymn[f.verses];
  return {
    id: hymn.id,
    number: hymn.number,
    book: hymn.book ?? 'main',
    title: hymn.title ?? '',
    arabic: encodeVerses(hymn.verses ?? []),
    titleLang: hymn[f.title] ?? '',
    textLang: versesLang ? encodeVerses(versesLang) : '',
    primaryTopic: hymn.primaryTopic ?? '',
    topics: (hymn.topics ?? []).join(', '),
    reviewed: (hymn.translationStatus ?? 'AI_DRAFT') === 'VERIFIED' ? 'TRUE' : 'FALSE',
  };
}

/**
 * Three-way merge of one imported row.
 *
 * Every field compares three versions — the sheet row, the shipped bundle
 * (`base`) and live Firebase (`live`, i.e. bundle + app edits):
 * - row == live → nothing to do (covers "both sides made the same edit").
 * - row == base → the sheet is untouched here; the app's value stands,
 *   even when it differs (stale sheets can never clobber app edits).
 * - live == base → only the sheet changed → the sheet value is applied.
 * - otherwise both sides changed the same field differently → collision:
 *   the app's value is kept and reported in `warnings`, everything else
 *   still applies (no whole-run abort for a valid conflict).
 *
 * `base` may be undefined for remote-only hymns (not in the bundle):
 * those fall back to plain row-vs-live diffing. Labels/chorus flags
 * always come from the live record, never the sheet.
 *
 * Returns `{ patch, warnings }` or `{ errors }`. Invalid data (blank
 * title, broken stanza shape, unknown topics, bad booleans) is still an
 * error and aborts the run; collisions are warnings.
 */
export function diffRow(row, base, live, lang) {
  const errors = [];
  const warnings = [];
  const patch = {};
  const where = `${row.id || '?'} (#${row.number || '?'})`;
  const f = langFields(lang);

  // r=row, b=base, l=live. Missing base (remote-only hymn) degrades to
  // two-way: any row-vs-live difference applies.
  const decide = (r, b, l, apply, label) => {
    if (same(r, l)) return;
    if (b !== undefined && same(r, b)) return;
    if (b === undefined || same(l, b)) {
      apply();
      return;
    }
    warnings.push(`${where}: ${label} changed in the app and the sheet — kept the app's value`);
  };

  const title = (row.title ?? '').trim();
  if (title === '') {
    errors.push(`${where}: Title (Arabic) must not be blank`);
  } else {
    decide(title, base ? (base.title ?? '').trim() : undefined, (live.title ?? '').trim(), () => {
      patch.title = title;
    }, 'Title (Arabic)');
  }

  const linesOf = (verses) => (verses ?? []).map((v) => v.lines);
  const parsedAr = parseVersesCell(row.arabic ?? '');
  if (parsedAr.error) {
    errors.push(`${where}: Arabic Text: ${parsedAr.error}`);
  } else {
    const mismatch = shapeMismatch(live.verses ?? [], parsedAr.blocks);
    if (mismatch) {
      errors.push(`${where}: Arabic Text: ${mismatch}`);
    } else {
      const rowLines = parsedAr.blocks.map((b) => b.lines);
      decide(
        rowLines,
        base ? linesOf(base.verses) : undefined,
        linesOf(live.verses),
        () => {
          patch.verses = live.verses.map((v, i) => ({ ...v, lines: parsedAr.blocks[i].lines }));
        },
        'Arabic Text',
      );
    }
  }

  const titleLang = (row.titleLang ?? '').trim();
  if (titleLang !== '') {
    decide(titleLang, base ? (base[f.title] ?? '').trim() : undefined, (live[f.title] ?? '').trim(), () => {
      patch[f.title] = titleLang;
    }, `${lang.toUpperCase()} Title`);
  }
  // Blank translation cells mean "no change" — translations are never
  // deleted from the sheet.

  const textLangRaw = (row.textLang ?? '').trim();
  if (textLangRaw !== '') {
    const parsed = parseVersesCell(textLangRaw);
    if (parsed.error) {
      errors.push(`${where}: ${lang.toUpperCase()} Translation: ${parsed.error}`);
    } else {
      const liveLang = live[f.verses];
      const baseLang = base?.[f.verses];
      // Shape anchor: the live translation when present (the write target),
      // otherwise the Arabic verses for newly created translations.
      const anchor = liveLang ?? live.verses ?? [];
      const mismatch = shapeMismatch(anchor, parsed.blocks);
      if (mismatch) {
        errors.push(`${where}: ${lang.toUpperCase()} Translation: ${mismatch}`);
      } else {
        const rowLines = parsed.blocks.map((b) => b.lines);
        const built = anchor.map((v, i) => ({ ...v, lines: parsed.blocks[i].lines }));
        if (!liveLang) {
          // New translation: absent on both sides, or app-added meanwhile.
          if (baseLang) {
            decide(rowLines, linesOf(baseLang), linesOf(liveLang), () => {
              patch[f.verses] = built;
            }, `${lang.toUpperCase()} Translation`);
          } else if (!same(built, liveLang ?? [])) {
            patch[f.verses] = built;
          }
        } else {
          decide(rowLines, base ? linesOf(baseLang) : undefined, linesOf(liveLang), () => {
            patch[f.verses] = built;
          }, `${lang.toUpperCase()} Translation`);
        }
      }
    }
  }

  const primary = (row.primaryTopic ?? '').trim().toLowerCase();
  if (primary !== '') {
    if (!TOPIC_IDS.includes(primary)) {
      errors.push(`${where}: unknown Primary Category '${primary}' (valid: ${TOPIC_IDS.join(', ')})`);
    } else {
      decide(primary, base ? base.primaryTopic ?? '' : undefined, live.primaryTopic ?? '', () => {
        patch.primaryTopic = primary;
      }, 'Primary Category');
    }
  }
  // Blank Primary Category keeps the stored one (same as the Admin editor).

  const parsedTags = parseTopicsCell(row.topics ?? '', primary || live.primaryTopic);
  if (parsedTags.error) {
    errors.push(`${where}: Tags: ${parsedTags.error}`);
  } else {
    decide(parsedTags.topics, base ? base.topics ?? [] : undefined, live.topics ?? [], () => {
      patch.topics = parsedTags.topics;
    }, 'Tags');
  }

  const parsedReview = parseReviewed(row.reviewed);
  if (parsedReview.error) {
    errors.push(`${where}: ${parsedReview.error}`);
  } else if (parsedReview.value !== null) {
    const status = parsedReview.value ? 'VERIFIED' : 'AI_DRAFT';
    decide(status, base ? base.translationStatus ?? 'AI_DRAFT' : undefined, live.translationStatus ?? 'AI_DRAFT', () => {
      patch.translationStatus = status;
    }, 'IsReviewed');
  }
  // Blank IsReviewed means "no change" — never mass-unreviews.

  if (errors.length > 0) return { errors };
  return { patch, warnings };
}
