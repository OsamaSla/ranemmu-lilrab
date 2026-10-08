#!/usr/bin/env node
/**
 * Builds an AI translation packet for a hymn range.
 *
 * Run with: node scripts/make-translation-packet.mjs [from] [to]
 * Defaults to hymns 21-40 (the batch after the 001-020 EN/DE pilot).
 *
 * Source: content/book-hymns-imported.json (vocalised Arabic master).
 *
 * Output dir content/translation-packet-<from>-<to>/ holds:
 *   source.md        — vocalised Arabic with stanza/refrain markers (chatbot input)
 *   prompt.md        — EN + DE translation brief (structure rules, register)
 *   draft-<from>-<to>.xlsx — 3-sheet workbook (ترانيم prefilled, EN/DE
 *                    row-aligned skeletons with structure columns set and
 *                    text cells left for the drafter). Shape matches what
 *                    scripts/import-sheet.mjs expects, so a reviewed file
 *                    merges with no retyping. Do NOT import the skeleton
 *                    before the texts are filled in (title/text are required).
 *
 * Hymns that already carry both verses_en and verses_de are skipped.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'content');

const HALF_JOINER = ' \u2756 ';
const DRAFT_EN = 'DRAFT — machine-assisted draft, review required before merge';
const DRAFT_DE = 'ENTWURF — maschinengestützter Entwurf, Prüfung vor dem Zusammenführen erforderlich';

const SHEETS = [
  {
    key: 'ar',
    name: 'ترانيم',
    rtl: true,
    headers: [
      'رقم الترنيمة', 'العنوان', 'مقياس الكلام', 'القرار', 'نوع المقطع',
      'رقم المقطع', 'الصَّدْر', 'العَجُز', 'ملاحظات',
    ],
    verseKind: 'مقطع',
    refrainKind: 'لازمة',
  },
  {
    key: 'en',
    name: 'EN - English',
    rtl: false,
    headers: [
      'Hymn No.', 'Title', 'Meter', 'Chorus label', 'Kind',
      'Stanza No.', 'First half', 'Second half', 'Notes',
    ],
    verseKind: 'verse',
    refrainKind: 'refrain',
    chorusLabel: 'Refrain',
    draftNote: DRAFT_EN,
  },
  {
    key: 'de',
    name: 'DE - Deutsch',
    rtl: false,
    headers: [
      'Liednr.', 'Titel', 'Metrum', 'Kehrvers', 'Art',
      'Strophennr.', 'Erste Hälfte', 'Zweite Hälfte', 'Notizen',
    ],
    verseKind: 'Strophe',
    refrainKind: 'Kehrvers',
    chorusLabel: 'Kehrvers',
    draftNote: DRAFT_DE,
  },
];

/** One workbook row per line: [number, title, meter, chorus, kind, label, part1, part2, notes]. */
function hymnRows(hymn, spec, fillText) {
  const rows = [];
  let stanzaNo = 0;
  let firstRow = true;
  for (const verse of hymn.verses) {
    const refrain = verse.chorus === true;
    if (!refrain) stanzaNo += 1;
    verse.lines.forEach((line, i) => {
      let part1 = '';
      let part2 = '';
      if (fillText) {
        [part1 = '', part2 = ''] = String(line).split(HALF_JOINER);
      }
      rows.push([
        firstRow ? hymn.number : '',
        firstRow && fillText ? hymn.title : '',
        '',
        firstRow ? chorusCell(hymn, spec, fillText) : '',
        refrain ? spec.refrainKind : spec.verseKind,
        i === 0 && !refrain ? `(${stanzaNo})` : '',
        part1,
        part2,
        firstRow && !fillText ? spec.draftNote : '',
      ]);
      firstRow = false;
    });
  }
  return rows;
}

function chorusCell(hymn, spec, fillText) {
  if (!hymn.chorus) return '';
  if (fillText) return hymn.chorus;
  return spec.chorusLabel ?? '';
}

function buildSheet(wb, spec, hymns, fillText) {
  const ws = wb.addWorksheet(spec.name);
  ws.views = spec.rtl
    ? [{ rightToLeft: true, state: 'frozen', ySplit: 1 }]
    : [{ state: 'frozen', ySplit: 1 }];
  ws.columns = spec.headers.map((header, i) => ({
    header,
    key: `c${i}`,
    width: [12, 30, 12, 12, 12, 12, 42, 42, 40][i],
  }));
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF184D55' } };
  for (const hymn of hymns) {
    for (const row of hymnRows(hymn, spec, fillText)) ws.addRow(row);
  }
  return ws;
}

/** Structural self-check: EN/DE skeletons must mirror the Arabic row counts. */
function checkShapes(hymns) {
  const problems = [];
  for (const hymn of hymns) {
    const counts = SHEETS.map((spec) => hymnRows(hymn, spec, spec.key === 'ar').length);
    if (!counts.every((c) => c === counts[0])) {
      problems.push(`hymn ${hymn.number}: row counts differ (${counts.join('/')})`);
    }
  }
  return problems;
}

function sourceMarkdown(hymns) {
  const out = [
    '# Translation source — vocalised Arabic master',
    '',
    'One section per hymn. `(verse)` stanzas are numbered in order;',
    '`[refrain]` blocks sit in place and are sung as the chorus.',
    'Translate every line; never merge, split, reorder or drop lines.',
    '',
  ];
  for (const hymn of hymns) {
    out.push(`## Hymn ${hymn.number} — ${hymn.title}`);
    if (hymn.author) out.push(`Author: ${hymn.author}`);
    if (hymn.chorus) out.push(`Chorus label: ${hymn.chorus}`);
    out.push('');
    let stanzaNo = 0;
    for (const verse of hymn.verses) {
      if (verse.chorus === true) {
        out.push('[refrain]');
      } else {
        stanzaNo += 1;
        out.push(`Stanza ${stanzaNo} (verse):`);
      }
      for (const line of verse.lines) out.push(line);
      out.push('');
    }
  }
  return out.join('\n');
}

function promptMarkdown(from, to, count) {
  return `# Translation brief — hymns ${from}-${to} (${count} hymns, EN + DE)

Source: source.md (vocalised Arabic). Output: fill the EN/DE sheets of
draft-${from}-${to}.xlsx — one translated line per row, First half column
(or split across First/Second half for long lines, joined with ❖ on import).

## Hard rules (the importer rejects anything else)

1. NEVER add, remove, merge, split or reorder rows. Row count per hymn must
   stay identical to the Arabic sheet — stanza counts and per-stanza line
   counts are validated on import.
2. Keep the Kind and Stanza No. columns exactly as prefilled.
3. Fill the Title cell on each hymn's first row (both languages).
4. Chorus label is prefilled (Refrain / Kehrvers) — leave it.

## Language guidance

- Singable church register, faithful over beautiful. Prefer clarity a
  congregation can sing; keep line lengths roughly matching the Arabic.
- German: liturgical "Du" (never Sie); English: plain reverent diction.
- Names, doxologies and Scripture echoes stay; explain nothing in footnotes.
- Unsure about a line? Translate literally and flag it in the Notes column.

## After drafting

All AI text is DRAFT. A human reviewer reads every line in Excel before any
merge. Reviewed files merge into content/hymns-imported.xlsx, then
\`npm run add-batch\` validates, rebuilds and re-exports.
`;
}

async function main() {
  const from = Number(process.argv[2] ?? 21);
  const to = Number(process.argv[3] ?? 40);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) {
    throw new Error(`usage: node scripts/make-translation-packet.mjs [from] [to] (got ${from} ${to})`);
  }

  const raw = JSON.parse(readFileSync(join(CONTENT_DIR, 'book-hymns-imported.json'), 'utf8'));
  const all = Array.isArray(raw) ? raw : raw.hymns;
  const hymns = all
    .filter((h) => h.number >= from && h.number <= to)
    .sort((a, b) => a.number - b.number);
  if (hymns.length === 0) throw new Error(`no hymns in range ${from}-${to}`);
  const skipped = hymns.filter((h) => h.verses_en && h.verses_de).map((h) => h.number);

  const problems = checkShapes(hymns);
  if (problems.length > 0) throw new Error(`skeleton mismatch:\n${problems.join('\n')}`);

  const pad = (n) => String(n).padStart(3, '0');
  const dir = join(CONTENT_DIR, `translation-packet-${pad(from)}-${pad(to)}`);
  mkdirSync(dir, { recursive: true });

  writeFileSync(join(dir, 'source.md'), sourceMarkdown(hymns), 'utf8');
  writeFileSync(join(dir, 'prompt.md'), promptMarkdown(from, to, hymns.length), 'utf8');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ranemmu.lilrab translation pipeline';
  for (const spec of SHEETS) buildSheet(wb, spec, hymns, spec.key === 'ar');
  const xlsxName = `draft-${pad(from)}-${pad(to)}.xlsx`;
  await wb.xlsx.writeFile(join(dir, xlsxName));

  console.log(`packet ${from}-${to}: ${hymns.length} hymn(s) -> ${dir}`);
  if (skipped.length > 0) {
    console.log(`note: already translated (kept in packet anyway): ${skipped.join(', ')}`);
  }
  console.log(`sheets verified: EN/DE row counts mirror Arabic for all ${hymns.length} hymn(s)`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});