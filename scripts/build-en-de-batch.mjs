#!/usr/bin/env node
/**
 * Builds a translation staging xlsx from a drafts data file — PILOT pattern.
 *
 * Run with: node scripts/build-en-de-batch.mjs <drafts.json> <out.xlsx>
 * Example : node scripts/build-en-de-batch.mjs content/en-de-021-030.json content/staging-en-de-021-030.xlsx
 *
 * drafts.json: { hymns: [{ n, ten, tde, v: [{ r, en: [...], de: [...] }] }] }
 *   n = Arabic hymn number; ten/tde = translated titles;
 *   v = stanzas in Arabic order, r = refrain stanza.
 *
 * Shape rule (importer-enforced): EN/DE stanzas must mirror Arabic 1:1.
 * Aborts before writing on any stanza/line-count or refrain-flag mismatch.
 * Every draft row is marked DRAFT/ENTWURF. Nothing ships until reviewed
 * and merged into content/hymns-imported.xlsx.
 */
import ExcelJS from 'exceljs';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');

const AR = JSON.parse(readFileSync(join(CONTENT, 'book-hymns-imported.json'), 'utf8'));
const AR_HYMNS = Array.isArray(AR) ? AR : AR.hymns;
const byNum = new Map(AR_HYMNS.map((h) => [h.number, h]));

const AR_HEADERS = ['رقم الترنيمة', 'العنوان', 'مقياس الكلام', 'القرار', 'نوع المقطع', 'رقم المقطع', 'الصَّدْر', 'العَجُز', 'ملاحظات'];
const EN_HEADERS = ['Hymn No.', 'Title', 'Meter', 'Chorus label', 'Kind', 'Stanza No.', 'First half', 'Second half', 'Notes'];
const DE_HEADERS = ['Liednr.', 'Titel', 'Metrum', 'Kehrvers', 'Art', 'Strophennr.', 'Erste Hälfte', 'Zweite Hälfte', 'Notizen'];

function styleSheet(ws, rtl) {
  ws.views = rtl ? [{ rightToLeft: true }] : [{}];
  ws.columns = (rtl ? AR_HEADERS : ws.name.startsWith('EN') ? EN_HEADERS : DE_HEADERS).map((h, i) => ({ header: h, key: `c${i}`, width: [12, 30, 14, 14, 12, 12, 46, 46, 30][i] }));
  const hr = ws.getRow(1);
  hr.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  hr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F5B66' } };
  hr.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
}

async function main() {
  const [dataFile, outName] = process.argv.slice(2);
  if (!dataFile || !outName) throw new Error('usage: node scripts/build-en-de-batch.mjs <drafts.json> <out.xlsx>');

  const data = JSON.parse(readFileSync(join(ROOT, dataFile), 'utf8'));
  const BATCH = data.hymns;
  if (!Array.isArray(BATCH) || BATCH.length === 0) throw new Error(`${dataFile}: expected { hymns: [...] }`);

  for (const p of BATCH) {
    const a = byNum.get(p.n);
    if (!a) throw new Error(`hymn ${p.n} not in Arabic master`);
    if (!p.ten || !p.tde) throw new Error(`hymn ${p.n}: translated titles missing`);
    if (a.verses.length !== p.v.length) throw new Error(`hymn ${p.n}: ${p.v.length} draft stanzas vs ${a.verses.length} Arabic`);
    p.v.forEach((s, i) => {
      const al = a.verses[i].lines.length;
      if (s.en.length !== al) throw new Error(`hymn ${p.n} stanza ${i + 1}: EN ${s.en.length} vs AR ${al}`);
      if (s.de.length !== al) throw new Error(`hymn ${p.n} stanza ${i + 1}: DE ${s.de.length} vs AR ${al}`);
      if (!!a.verses[i].chorus !== s.r) throw new Error(`hymn ${p.n} stanza ${i + 1}: refrain flag vs Arabic`);
    });
  }
  console.log(`shape check passed: ${BATCH.length} hymns mirror Arabic 1:1`);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ranemmu.lilrab EN/DE batch (DRAFT)';
  const wsAr = wb.addWorksheet('ترانيم');
  const wsEn = wb.addWorksheet('EN - English');
  const wsDe = wb.addWorksheet('DE - Deutsch');
  styleSheet(wsAr, true); styleSheet(wsEn, false); styleSheet(wsDe, false);

  const hasChorus = (n) => byNum.get(n).verses.some((x) => x.chorus);
  const arLabel = (n, i) => `(${byNum.get(n).verses[i].label})`;
  const kindOf = (lang, r) => (lang === 'en' ? (r ? 'refrain' : 'verse') : (r ? 'Kehrvers' : 'Strophe'));

  for (const p of BATCH) {
    const a = byNum.get(p.n);
    a.verses.forEach((st, i) => {
      st.lines.forEach((line, j) => {
        wsAr.addRow(j === 0 && i === 0
          ? [p.n, a.title, a.meter ?? '', a.chorus ?? '', st.chorus ? 'لازمة' : 'مقطع', arLabel(p.n, i), line, '', i === 0 ? 'مرجع — راجع EN/DE للمراجعة' : '']
          : [null, null, null, null, st.chorus ? 'لازمة' : 'مقطع', j === 0 ? arLabel(p.n, i) : null, line, '', '']);
      });
    });
  }

  const DRAFT_EN = 'DRAFT — composed draft, review required before merge';
  const DRAFT_DE = 'ENTWURF — ausgearbeiteter Entwurf, Prüfung vor dem Zusammenführen erforderlich';

  for (const p of BATCH) {
    p.v.forEach((st, i) => {
      st.en.forEach((line, j) => {
        wsEn.addRow(j === 0 && i === 0
          ? [p.n, p.ten, '', hasChorus(p.n) ? 'Refrain' : '', kindOf('en', st.r), arLabel(p.n, i), line, '', DRAFT_EN]
          : [null, null, null, null, kindOf('en', st.r), j === 0 ? arLabel(p.n, i) : null, line, '', '']);
      });
    });
    p.v.forEach((st, i) => {
      st.de.forEach((line, j) => {
        wsDe.addRow(j === 0 && i === 0
          ? [p.n, p.tde, '', hasChorus(p.n) ? 'Kehrvers' : '', kindOf('de', st.r), arLabel(p.n, i), line, '', DRAFT_DE]
          : [null, null, null, null, kindOf('de', st.r), j === 0 ? arLabel(p.n, i) : null, line, '', '']);
      });
    });
  }

  for (const ws of [wsAr, wsEn, wsDe]) {
    ws.eachRow((row, n) => {
      if (n === 1) return;
      row.font = { name: 'Arial', size: 12 };
      row.alignment = { vertical: 'middle', wrapText: true };
    });
  }

  const out = join(ROOT, outName);
  await wb.xlsx.writeFile(out);
  console.log('wrote', out);
}

main().catch((err) => {
  console.error(err.stack ?? err.message);
  process.exit(1);
});
