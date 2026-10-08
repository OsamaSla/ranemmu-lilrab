#!/usr/bin/env node
/**
 * Fills a translation-packet draft xlsx with Gemini's markdown tables.
 *
 * Run with: node scripts/fill-translation-draft.mjs <gemini.md> <packet-dir>
 * Example : node scripts/fill-translation-draft.mjs C:\Temp\iconwork\21-40.md content/translation-packet-021-040
 *
 * Reads the skeleton draft-<from>-<to>.xlsx from the packet dir and writes
 * draft-<from>-<to>-filled.xlsx beside it (skeleton untouched). Exits
 * non-zero listing every structural problem: missing hymn, missing
 * title, block-count or line-count mismatch vs the workbook rows.
 * Output is DRAFT — human review in Excel is mandatory before any merge.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Parse Gemini md into { number: { title_en, title_de, blocks: string[][][] } }.
 *  blocks = ordered sections; each block = rows; each row = [en, de]. */
function parseGemini(text) {
  const hymns = new Map();
  const lines = text.split('\n');
  let current = null;
  let block = null;
  let inTable = false;

  const hymnHead = /^###\s+Hymn\s+(\d+)\b/;
  const titleEn = /^\*\*Titel\s*\(EN\):\*\*\s*(.+)$/;
  const titleDe = /^\*\*Titel\s*\(DE\):\*\*\s*(.+)$/;
  const sectionHead = /^####\s+.+$/;

  for (const raw of lines) {
    const trimmed = raw.trim();
    // Gemini escapes markdown markers (\###, \*\*). Unescape # and * for
    // structural matching; table cell text is taken from the raw line.
    const line = trimmed.replace(/\\([#*])/g, '$1');
    let m = hymnHead.exec(line);
    if (m) {
      current = { number: Number(m[1]), title_en: '', title_de: '', blocks: [] };
      hymns.set(current.number, current);
      block = null;
      inTable = false;
      continue;
    }
    if (!current) continue;
    m = titleEn.exec(line);
    if (m) {
      current.title_en = m[1].trim();
      continue;
    }
    m = titleDe.exec(line);
    if (m) {
      current.title_de = m[1].trim();
      continue;
    }
    if (sectionHead.test(line)) {
      block = [];
      current.blocks.push(block);
      inTable = false;
      continue;
    }
    if (line.startsWith('|')) {
      const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());
      if (cells.some((c) => /^-+$/.test(c))) {
        inTable = true;
        continue;
      }
      if (!inTable) continue;
      if (/arabisch/i.test(cells[0] ?? '')) continue;
      if (cells.length >= 3 && block) block.push([cells[1] ?? '', cells[2] ?? '']);
    } else if (line !== '') {
      inTable = false;
    }
  }
  return hymns;
}

/** Workbook rows of one hymn on a translation sheet, grouped into blocks
 *  the same way import-sheet.mjs reassembles them (kind/label changes). */
function sheetBlocks(ws, headerRow, col) {
  const groups = [];
  let current = null;
  let open = null;
  for (let n = headerRow + 1; n <= ws.rowCount; n += 1) {
    const row = ws.getRow(n);
    // Trailing empty cells are trimmed on write, so columns past the
    // row's end must read as '' instead of throwing ("A Cell needs a Row").
    const text = (c) => {
      if (!c || c > row.cellCount) return '';
      return String(row.getCell(c).value ?? '').trim();
    };
    const number = text(col.number);
    const title = text(col.title);
    const part1 = text(col.part1);
    if (!number && !title && !part1 && !text(col.kind) && !text(col.label)) continue;
    if (number) {
      current = Number(String(number).replace(/[^0-9]/g, ''));
      open = null;
    }
    if (!current) continue;
    const chorus = /refrain|kehrvers/i.test(text(col.kind));
    const label = text(col.label) || null;
    const same = open && open.chorus === chorus && (label === null || label === open.label);
    if (!same) {
      open = { chorus, label, rows: [] };
      groups.push({ number: current, block: open });
    }
    open.rows.push(n);
  }
  const byNumber = new Map();
  for (const g of groups) {
    if (!byNumber.has(g.number)) byNumber.set(g.number, []);
    byNumber.get(g.number).push(g.block);
  }
  return byNumber;
}

function findCols(ws, headerRow, names) {
  const row = ws.getRow(headerRow);
  const map = new Map();
  row.eachCell((cell, c) => {
    const v = String(cell.value ?? '').trim();
    if (names[v] && !map.has(names[v])) map.set(names[v], c);
  });
  return {
    number: map.get('number'),
    title: map.get('title'),
    kind: map.get('kind'),
    label: map.get('label'),
    part1: map.get('part1'),
  };
}

async function main() {
  const [mdFile, packetDir] = process.argv.slice(2);
  if (!mdFile || !packetDir) throw new Error('usage: node scripts/fill-translation-draft.mjs <gemini.md> <packet-dir>');

  const drafts = readdirSync(join(ROOT, packetDir)).filter((f) => /^draft-\d+-\d+\.xlsx$/.test(f));
  if (drafts.length !== 1) throw new Error(`expected one draft-*.xlsx in ${packetDir}`);
  const draftName = drafts[0];

  const parsed = parseGemini(readFileSync(mdFile, 'utf8'));
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(join(ROOT, packetDir, draftName));

  const problems = [];
  const sheets = [
    { name: 'EN - English', lang: 1, headers: { 'Hymn No.': 'number', Title: 'title', Kind: 'kind', 'Stanza No.': 'label', 'First half': 'part1' } },
    { name: 'DE - Deutsch', lang: 2, headers: { 'Liednr.': 'number', Titel: 'title', Art: 'kind', 'Strophennr.': 'label', 'Erste Hälfte': 'part1' } },
  ];

  for (const spec of sheets) {
    const ws = wb.getWorksheet(spec.name);
    if (!ws) {
      problems.push(`${spec.name}: sheet missing`);
      continue;
    }
    const col = findCols(ws, 1, spec.headers);
    if (!col.number || !col.title || !col.part1) {
      problems.push(`${spec.name}: header row not recognised`);
      continue;
    }
    const blocks = sheetBlocks(ws, 1, col);
    for (const [number, hymn] of parsed) {
      const song = blocks.get(number);
      if (!song) {
        problems.push(`${spec.name}: hymn ${number} has no skeleton rows`);
        continue;
      }
      if (song.length !== hymn.blocks.length) {
        problems.push(`${spec.name}: hymn ${number}: ${hymn.blocks.length} md blocks vs ${song.length} sheet blocks`);
        continue;
      }
      const title = spec.lang === 1 ? hymn.title_en : hymn.title_de;
      if (!title) problems.push(`${spec.name}: hymn ${number}: title missing in md`);
      hymn.blocks.forEach((mdBlock, i) => {
        if (mdBlock.length !== song[i].rows.length) {
          problems.push(
            `${spec.name}: hymn ${number} block ${i + 1}: ${mdBlock.length} md lines vs ${song[i].rows.length} sheet rows`,
          );
        }
      });
    }
  }

  if (problems.length > 0) {
    console.error(`cannot fill — ${problems.length} problem(s):\n${problems.join('\n')}`);
    process.exit(1);
  }

  for (const spec of sheets) {
    const ws = wb.getWorksheet(spec.name);
    const col = findCols(ws, 1, spec.headers);
    const blocks = sheetBlocks(ws, 1, col);
    for (const [number, hymn] of parsed) {
      const song = blocks.get(number);
      const title = spec.lang === 1 ? hymn.title_en : hymn.title_de;
      ws.getRow(song[0].rows[0]).getCell(col.title).value = title;
      hymn.blocks.forEach((mdBlock, i) => {
        mdBlock.forEach(([en, de], j) => {
          ws.getRow(song[i].rows[j]).getCell(col.part1).value = spec.lang === 1 ? en : de;
        });
      });
    }
  }

  const outName = draftName.replace(/\.xlsx$/, '-filled.xlsx');
  await wb.xlsx.writeFile(join(ROOT, packetDir, outName));
  console.log(`filled ${parsed.size} hymn(s) -> ${join(packetDir, outName)}`);
  console.log('DRAFT — review every line in Excel before any merge.');
}

main().catch((err) => {
  console.error(err.stack ?? err.message);
  process.exit(1);
});
