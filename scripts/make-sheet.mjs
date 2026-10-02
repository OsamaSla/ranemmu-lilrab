/**
 * Generates content/Template.xlsx — the spreadsheet the book typist fills in.
 *
 * Run with: npm run make:sheet
 *
 * Layout (one row per line; scripts/import-sheet.mjs reassembles stanzas):
 *   A رقم الترنيمة  B العنوان  C مقياس الكلام  D القرار
 *   E نوع السطر (dropdown: بيت/لازمة)  F رقم البيت
 *   G الصَّدْر  H العَجُز  I ملاحظات (never imported)
 *
 * A verse in the book's own terms: two halves are صدر + عجز, a single-part
 * line (الصدر column only) is يتيم.
 *
 * The sheet is right-to-left at the worksheet level (not just cell
 * alignment), so column A sits at the visual right edge in Excel.
 */
import ExcelJS from 'exceljs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'content', 'Template.xlsx');

const TEAL = 'FF0F5B66';
const HEADER_FONT = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
const BODY_FONT = { name: 'Arial', size: 12 };
const RIGHT_WRAP = { horizontal: 'right', vertical: 'middle', wrapText: true };

const HEADERS = [
  'رقم الترنيمة',
  'العنوان',
  'مقياس الكلام',
  'القرار',
  'نوع السطر',
  'رقم البيت',
  'الصَّدْر',
  'العَجُز',
  'ملاحظات',
];

const WIDTHS = [12, 28, 16, 12, 12, 10, 40, 40, 30];

/** Worked example: refrain mid-hymn, صدر + عجز halves, stacked lines. */
const EXAMPLE = [
  ['٧', 'أنت تعرفني', '8.8.8.8', 'القرار', 'بيت', '(١)', 'أنتَ تعرفُني', '', ''],
  ['', '', '', '', 'بيت', '', 'تعرفُ مَضْجَعِي', '', 'سطر بلا رقم بيت = تتمة البيت السابق'],
  ['', '', '', '', 'لازمة', '', 'أنتَ تعرفُني، تعرفُ قلبي', '', ''],
  ['', '', '', '', 'بيت', '(٢)', 'تعرفُ قِفْلي', 'وفكِّي', 'صدر وعجز'],
  ['', '', '', '', 'بيت', '(٣)', 'أنتَ تعرفُ كلَّ أفكاري', '', 'يتيم: صدر فقط'],
  ['', '', '', '', 'بيت', '', 'طُرُقي ليستْ عنكَ خفيَّة', '', ''],
];

const EMPTY_ROWS = 12;

const INSTRUCTIONS = [
  'تعليمات إدخال الترانيم — كتاب «هلم نرنم» (اقرأ مرة واحدة فقط)',
  '',
  '١. كل سطر في الكتاب = صف في الجدول. لا تدمج أسطراً في خلية واحدة.',
  '٢. رقم الترنيمة وعنوانها ومقياس الكلام والقرار تُكتب في أول صف فقط؛ اتركها فارغة في بقية الصفوف.',
  '٣. رقم البيت بين قوسين في أول سطر فقط: (١). اتركه فارغاً في تتمة البيت نفسه.',
  '٤. البيت من شطرين: الصَّدْر في عموده والعَجُز في عموده. واليَتيم (سطر واحد): املأ الصدر فقط.',
  '٥. اللازمة (القرار): صف مستقل في موضعه بالكتاب، واختر «لازمة» من قائمة «نوع السطر».',
  '٦. عمود «ملاحظات» لك وللمحرر فقط — لا يدخل التطبيق أبداً.',
  '٧. قبل الإرسال: احذف صفوف المثال (٧. أنت تعرفني) واملأ مكانها.',
];

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'helmenarnam content pipeline';
  wb.views = [{ activeTab: 0 }];

  const ws = wb.addWorksheet('ترانيم');
  ws.views = [{ rightToLeft: true, state: 'frozen', ySplit: 1 }];

  ws.columns = HEADERS.map((header, i) => ({
    header,
    key: `c${i}`,
    width: WIDTHS[i],
  }));

  const headerRow = ws.getRow(1);
  headerRow.font = HEADER_FONT;
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
  headerRow.height = 30;

  for (const row of EXAMPLE) ws.addRow(row);
  for (let i = 0; i < EMPTY_ROWS; i += 1) ws.addRow([]);

  ws.eachRow((row, n) => {
    if (n === 1) return;
    row.font = BODY_FONT;
    row.alignment = RIGHT_WRAP;
  });

  ws.dataValidations.add('E2:E2000', {
    type: 'list',
    formulae: ['"بيت,لازمة"'],
    allowBlank: true,
    showDropDown: false,
    showErrorMessage: true,
    errorTitle: 'نوع السطر',
    error: 'اختر «بيت» أو «لازمة» من القائمة',
  });

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
