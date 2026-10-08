/**
 * Converts a simple text file into Template.xlsx rows.
 *
 * Run: node scripts/converter.mjs content/input-temp.txt content/from-input.xlsx
 *
 * Input format (one hymn per block, blank line separates hymns):
 *
 *   7 | حررني يسوع البار | 8.8.8.8 | القرار
 *   (1) | حررني يسوع البار،
 *    | احرمني من شر العالم
 *   (1) | كرّر: القرار
 *   (2) | تعرفُ قِفْلي |
 *    | وفكِّي
 *   (2) | كرّر: القرار
 *   (3) | أنتَ تعرفُ كلَّ أفكاري
 *
 * Rules:
 * - Header line:  number | title | meter | chorus-label
 * - Stanza line:  (N) | first-half | second-half
 *   - N can be (1), 1, ١ — starts a new stanza
 *   - second-half can be empty for مشطور (صدر only)
 * - Refrain line:  (N) | كرّر: القرار |   (kind=لازمة, chorus=true)
 * - Lines starting with | are continuations (same hymn, same stanza)
 * - Chorus label "كرّر: X" or "القرار" sets the hymn's chorus label and marks stanza as refrain
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'content');

function clean(s) {
  return String(s ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

function parseStanzaLabel(s) {
  const m = /[\(\[]?\s*([0-9٠-٩]+)\s*[\)\]]?/.exec(s);
  if (!m) return null;
  const n = Number(m[1].replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  return Number.isInteger(n) && n >= 1 ? n : null;
}

function isRefrainLine(firstHalf) {
  return /كرّر|القرار|refrain|chorus/i.test(clean(firstHalf));
}

function parseInput(text) {
  const blocks = text.split(/\n\s*\n/).filter(b => b.trim());
  const hymns = [];

  for (const block of blocks) {
    const lines = block.split('\n').map(clean).filter(l => l);
    if (!lines.length) continue;

    // Parse header
    const header = lines[0].split('|').map(clean);
    if (header.length < 2) {
      console.warn('Skipping block — header needs at least number | title');
      continue;
    }
    const number = Number(header[0]);
    const title = header[1];
    const meter = header[2] || '';
    const chorusLabel = header[3] || '';

    const verses = [];
    let currentStanza = null;
    let stanzaCounter = 0;

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split('|').map(clean);
      if (parts.length === 1 && parts[0].startsWith('|')) {
        // Continuation line (| second-half)
        const secondHalf = parts[0].slice(1);
        if (currentStanza) {
          const lastLine = currentStanza.lines[currentStanza.lines.length - 1];
          if (lastLine.includes('\u2756')) {
            // Already has second half — treat as new line
            currentStanza.lines.push(' \u2756 ' + secondHalf);
          } else {
            // Append second half to last line
            currentStanza.lines[currentStanza.lines.length - 1] = lastLine + ' \u2756 ' + secondHalf;
          }
        }
        continue;
      }

      // Check for stanza marker
      const label = parts[0];
      const parsedLabel = parseStanzaLabel(label);
      const firstHalf = parts[1] || '';
      const secondHalf = parts[2] || '';

      if (parsedLabel !== null) {
        // New stanza
        const isRefrain = isRefrainLine(firstHalf);
        if (!isRefrain) stanzaCounter += 1;

        currentStanza = {
          label: parsedLabel,
          lines: [],
          chorus: isRefrain,
        };
        verses.push(currentStanza);

        if (firstHalf && !isRefrain) {
          const line = secondHalf ? firstHalf + ' \u2756 ' + secondHalf : firstHalf;
          currentStanza.lines.push(line);
        } else if (isRefrain) {
          // Refrain line — extract just the text after "كرّر:" if present
          const text = firstHalf.replace(/كرّر\s*:\s*/i, '').trim();
          if (text) currentStanza.lines.push(text);
        }
      } else if (currentStanza) {
        // Continuation without explicit | prefix
        const line = secondHalf ? firstHalf + ' \u2756 ' + secondHalf : firstHalf;
        if (line) currentStanza.lines.push(line);
      }
    }

    if (!verses.length) continue;

    hymns.push({ number, title, meter, chorus: chorusLabel, verses });
  }

  return hymns;
}

function buildWorkbook(hymns) {
  const wb = new ExcelJS.Workbook();

  // Only create the Arabic master sheet — user can fill EN/DE later
  const ws = wb.addWorksheet('ترانيم');
  ws.views = [{ rightToLeft: true, state: 'frozen', ySplit: 1 }];

  const headers = [
    'رقم الترنيمة', 'العنوان', 'مقياس الكلام', 'القرار', 'نوع المقطع',
    'رقم المقطع', 'الصَّدْر', 'العَجُز', 'ملاحظات',
  ];
  ws.columns = headers.map((h, i) => ({ header: h, key: `c${i}`, width: [12, 28, 16, 12, 12, 10, 40, 40, 30][i] || 15 }));

  // Style header
  ws.getRow(1).font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F5B66' } };
  ws.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

  const kindList = '"مقطع,لازمة"';

  let rowIdx = 2;
  for (const hymn of hymns) {
    const { number, title, meter, chorus, verses } = hymn;

    for (let v = 0; v < verses.length; v++) {
      const stanza = verses[v];
      const isRefrain = stanza.chorus;
      const kind = isRefrain ? 'لازمة' : 'مقطع';

      for (let l = 0; l < stanza.lines.length; l++) {
        const line = stanza.lines[l];
        // Split by HALF_JOINER (❖)
        const parts = line.split('\u2756').map(clean);
        const firstHalf = parts[0] || '';
        const secondHalf = parts[1] || '';

        const row = ws.getRow(rowIdx);
        row.getCell(1).value = v === 0 && l === 0 ? number : '';   // number only on first row
        row.getCell(2).value = v === 0 && l === 0 ? title : '';    // title only on first row
        row.getCell(3).value = v === 0 && l === 0 ? meter : '';    // meter only on first row
        row.getCell(4).value = v === 0 && l === 0 ? chorus : '';   // chorus only on first row
        row.getCell(5).value = kind;
        row.getCell(5).dataValidation = { type: 'list', allowBlank: true, formulae: [kindList] };
        row.getCell(6).value = l === 0 ? `(${stanza.label})` : ''; // label only on first line of stanza
        row.getCell(7).value = firstHalf;
        row.getCell(8).value = secondHalf;
        row.getCell(9).value = ''; // notes

        // Basic styling
        row.font = { name: 'Arial', size: 12 };
        row.alignment = { wrapText: true, vertical: 'top' };

        rowIdx++;
      }
    }

    // Add one blank row between hymns
    rowIdx++;
  }

  return wb;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node scripts/converter.mjs <input.txt> <output.xlsx>');
    process.exit(1);
  }

  const inputPath = join(ROOT, args[0]);
  const outputPath = join(ROOT, args[1]);

  const text = readFileSync(inputPath, 'utf8');
  const hymns = parseInput(text);
  console.log(`Parsed ${hymns.length} hymn(s):`, hymns.map(h => h.number).join(', '));

  const wb = buildWorkbook(hymns);
  await wb.xlsx.writeFile(outputPath);
  console.log(`Written to ${outputPath}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});