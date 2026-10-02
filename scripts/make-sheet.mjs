/**
 * Generates content/Template.xlsx — the spreadsheet the book typist fills in.
 *
 * Run with: npm run make:sheet
 *
 * Sheets:
 *   ترانيم      — Arabic master. One row per printed verse (بيت);
 *                  scripts/import-sheet.mjs reassembles rows into stanzas.
 *   EN - English — optional translation, identical layout. Same hymn numbers
 *                  link rows to the Arabic master; absent hymns stay Arabic.
 *   DE - Deutsch — same, for German.
 *   تعليمات     — Arabic instructions (also covers the translation sheets).
 *
 * Column layout (all data sheets):
 *   number / title / meter / chorus-label / kind (dropdown) / stanza label
 *   / first half / second half / notes (never imported)
 *
 * In the book's own terms: a stanza is مقطع (a group of verses), a verse is
 * بيت — تام with صدر + عجز, or مشطور with صدر alone.
 *
 * The Arabic sheet is right-to-left at the worksheet level; EN/DE are
 * left-to-right, matching their scripts.
 */
import ExcelJS from 'exceljs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'content', 'Template.xlsx');

const TEAL = 'FF0F5B66';
const HEADER_FONT = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
const BODY_FONT = { name: 'Arial', size: 12 };

const WIDTHS = [12, 28, 16, 12, 12, 10, 40, 40, 30];
const EMPTY_ROWS = 12;

/** Worked example: refrain mid-hymn, بيت تام halves, stacked مشطور lines. */
const EXAMPLE_AR = [
  ['7', 'أنت تعرفني', '8.8.8.8', 'القرار', 'مقطع', '(1)', 'أنتَ تعرفُني', '', ''],
  ['', '', '', '', 'مقطع', '', 'تعرفُ مَضْجَعِي', '', 'سطر بلا رقم مقطع = تتمة المقطع السابق'],
  ['', '', '', '', 'لازمة', '', 'أنتَ تعرفُني، تعرفُ قلبي', '', ''],
  ['', '', '', '', 'مقطع', '(2)', 'تعرفُ قِفْلي', 'وفكِّي', 'بيت تام: صدر وعجز'],
  ['', '', '', '', 'مقطع', '(3)', 'أنتَ تعرفُ كلَّ أفكاري', '', 'مشطور: صدر فقط'],
  ['', '', '', '', 'مقطع', '', 'طُرُقي ليستْ عنكَ خفيَّة', '', ''],
];

/**
 * Draft translations of the same example, marked DRAFT in Notes. They exist
 * so the importer trial has something to merge — replace every word before
 * real use; only the typist's own wording ships.
 */
const EXAMPLE_EN = [
  ['7', 'You Know Me', '', 'Refrain', 'verse', '(1)', 'You know me', '', ''],
  ['', '', '', '', 'verse', '', 'You know my resting place', '', 'DRAFT — replace with your own wording'],
  ['', '', '', '', 'refrain', '', 'You know me, You know my heart', '', ''],
  ['', '', '', '', 'verse', '(2)', 'You know my lock', 'and my key', ''],
  ['', '', '', '', 'verse', '(3)', 'You know all my thoughts', '', ''],
  ['', '', '', '', 'verse', '', 'My ways are not hidden from You', '', ''],
];

const EXAMPLE_DE = [
  ['7', 'Du kennst mich', '', 'Kehrvers', 'Strophe', '(1)', 'Du kennst mich', '', ''],
  ['', '', '', '', 'Strophe', '', 'Du kennst mein Liegen', '', 'ENTWURF — bitte ersetzen'],
  ['', '', '', '', 'Kehrvers', '', 'Du kennst mich, Du kennst mein Herz', '', ''],
  ['', '', '', '', 'Strophe', '(2)', 'Du kennst mein Schloss', 'und meinen Schlüssel', ''],
  ['', '', '', '', 'Strophe', '(3)', 'Du kennst all meine Gedanken', '', ''],
  ['', '', '', '', 'Strophe', '', 'Meine Wege sind nicht verborgen vor Dir', '', ''],
];

const SHEETS = [
  {
    name: 'ترانيم',
    rtl: true,
    headers: [
      'رقم الترنيمة', 'العنوان', 'مقياس الكلام', 'القرار', 'نوع المقطع',
      'رقم المقطع', 'الصَّدْر', 'العَجُز', 'ملاحظات',
    ],
    kindList: '"مقطع,لازمة"',
    kindError: 'اختر «مقطع» أو «لازمة» من القائمة',
    example: EXAMPLE_AR,
  },
  {
    name: 'EN - English',
    rtl: false,
    headers: [
      'Hymn No.', 'Title', 'Meter', 'Chorus label', 'Kind',
      'Stanza No.', 'First half', 'Second half', 'Notes',
    ],
    kindList: '"verse,refrain"',
    kindError: 'Pick verse or refrain from the list',
    example: EXAMPLE_EN,
  },
  {
    name: 'DE - Deutsch',
    rtl: false,
    headers: [
      'Liednr.', 'Titel', 'Metrum', 'Kehrvers', 'Art',
      'Strophennr.', 'Erste Hälfte', 'Zweite Hälfte', 'Notizen',
    ],
    kindList: '"Strophe,Kehrvers"',
    kindError: 'Strophe oder Kehrvers aus der Liste wählen',
    example: EXAMPLE_DE,
  },
];

const INSTRUCTIONS = [
  'تعليمات إدخال الترانيم — كتاب «هلم نرنم» (اقرأ مرة واحدة فقط)',
  '',
  '١. كل بيت في الكتاب = صف في الجدول. لا تدمج أبياتاً في خلية واحدة.',
  '٢. رقم الترنيمة وعنوانها ومقياس الكلام والقرار تُكتب في أول صف فقط؛ اتركها فارغة في بقية الصفوف.',
  '٣. رقم المقطع بين قوسين في أول بيت فقط: (1). اتركه فارغاً في تتمة المقطع نفسه.',
  '٤. البيت التام: الصَّدْر في عموده والعَجُز في عموده. والمَشْطور (بيت من صدر واحد): املأ الصدر فقط.',
  '٥. اللازمة (القرار): صف مستقل في موضعها بالكتاب، واختر «لازمة» من قائمة «نوع المقطع».',
  '٦. عمود «ملاحظات» لك وللمحرر فقط — لا يدخل التطبيق أبداً.',
  '٧. قبل الإرسال: احذف صفوف المثال (7. أنت تعرفني) واملأ مكانها.',
  '',
  'الترجمة (اختياري تماماً): ورقتا EN وDE بنفس الشكل. انسخ رقم الترنيمة نفسه وترجم النص فقط — أي ترنيمة بلا صفوف هناك تظهر بالعربية. ابدأ بترنيمة واحدة متى شئت.',
];

function buildDataSheet(wb, spec) {
  const ws = wb.addWorksheet(spec.name);
  ws.views = spec.rtl
    ? [{ rightToLeft: true, state: 'frozen', ySplit: 1 }]
    : [{ state: 'frozen', ySplit: 1 }];

  ws.columns = spec.headers.map((header, i) => ({
    header,
    key: `c${i}`,
    width: WIDTHS[i],
  }));

  const align = spec.rtl
    ? { horizontal: 'right', vertical: 'middle', wrapText: true }
    : { horizontal: 'left', vertical: 'middle', wrapText: true };

  const headerRow = ws.getRow(1);
  headerRow.font = HEADER_FONT;
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
  headerRow.height = 30;

  for (const row of spec.example) ws.addRow(row);
  for (let i = 0; i < EMPTY_ROWS; i += 1) ws.addRow([]);

  ws.eachRow((row, n) => {
    if (n === 1) return;
    row.font = BODY_FONT;
    row.alignment = align;
  });

  ws.dataValidations.add('E2:E2000', {
    type: 'list',
    formulae: [spec.kindList],
    allowBlank: true,
    showDropDown: false,
    showErrorMessage: true,
    errorTitle: spec.headers[4],
    error: spec.kindError,
  });
}

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'helmenarnam content pipeline';
  wb.views = [{ activeTab: 0 }];

  for (const spec of SHEETS) buildDataSheet(wb, spec);

  const help = wb.addWorksheet('تعليمات');
  help.views = [{ rightToLeft: true }];
  help.columns = [{ header: 'التعليمات', key: 't', width: 110 }];
  help.getRow(1).font = HEADER_FONT;
  help.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
  help.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
  INSTRUCTIONS.forEach((line, i) => {
    if (i === 0) return;
    const row = help.addRow([line]);
    row.font = BODY_FONT;
    row.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    if (line === '') row.height = 8;
  });

  await wb.xlsx.writeFile(OUT);
  console.log(`wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
