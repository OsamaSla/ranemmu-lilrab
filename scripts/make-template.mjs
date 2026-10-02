/**
 * Generates content/Template.docx — the file the book typist fills in.
 *
 * Run with: npm run make:template
 *
 * Style names are bilingual and stable; scripts/import-word.mjs matches on
 * these exact names, so do not rename them here without updating the importer:
 *   'Hymn | عنوان'  — `number. title` line opening each hymn
 *   'Verse | بيت'    — one paragraph per stanza (Shift+Enter between lines)
 *   'Chorus | لازمة' — the refrain, typed once, placed where printed
 *   'Info | معلومات' — `key: value` metadata lines
 * Anything in Normal style is a note to the editor and is never imported.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Tab,
  TextRun,
} from 'docx';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'content', 'Template.docx');

export const STYLE = {
  HYMN: 'Hymn | عنوان',
  VERSE: 'Verse | بيت',
  CHORUS: 'Chorus | لازمة',
  INFO: 'Info | معلومات',
};

/**
 * Paragraphs reference styles by ID; the gallery shows the name. The two must
 * not be confused: passing a name as the paragraph style writes an undefined
 * styleId into the XML, which Word tolerates but mammoth cannot resolve.
 */
const STYLE_ID = {
  HYMN: 'HymnTitle',
  VERSE: 'HymnVerse',
  CHORUS: 'HymnChorus',
  INFO: 'HymnInfo',
};

const TEAL = '0F5B66';
const GREEN = '1B7A3D';
const GREY = '5C6B70';

const RUN_FONT = 'Arial';

/** Builds a right-to-left paragraph from segments; '\n' = Shift+Enter break. */
function para(style, text, extra = {}) {
  const runs = [];
  for (const chunk of String(text).split('\n')) {
    if (runs.length > 0) runs.push(new TextRun({ break: 1 }));
    // A literal \t becomes a real <w:tab/> element — the same thing Word
    // writes when the typist presses the Tab key.
    for (const [i, part] of chunk.split('\t').entries()) {
      if (i > 0) runs.push(new Tab());
      if (part) runs.push(new TextRun({ text: part, font: RUN_FONT }));
    }
  }
  return new Paragraph({
    style,
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    children: runs,
    ...extra,
  });
}

function heading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text, bold: true, size: 32, color: TEAL, font: RUN_FONT })],
  });
}

function note(text, opts = {}) {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text, size: 24, bold: !!opts.bold, color: opts.color ?? '222222', font: RUN_FONT })],
  });
}

const doc = new Document({
  styles: {
    paragraphStyles: [
      {
        id: 'HymnTitle',
        name: STYLE.HYMN,
        basedOn: 'Normal',
        paragraph: { alignment: AlignmentType.RIGHT, bidirectional: true },
        run: { size: 32, bold: true, color: TEAL, font: RUN_FONT },
      },
      {
        id: 'HymnVerse',
        name: STYLE.VERSE,
        basedOn: 'Normal',
        paragraph: { alignment: AlignmentType.RIGHT, bidirectional: true, spacing: { after: 160 } },
        run: { size: 26, font: RUN_FONT },
      },
      {
        id: 'HymnChorus',
        name: STYLE.CHORUS,
        basedOn: 'Normal',
        paragraph: { alignment: AlignmentType.RIGHT, bidirectional: true, spacing: { after: 160 } },
        run: { size: 26, bold: true, color: GREEN, font: RUN_FONT },
      },
      {
        id: 'HymnInfo',
        name: STYLE.INFO,
        basedOn: 'Normal',
        paragraph: { alignment: AlignmentType.RIGHT, bidirectional: true },
        run: { size: 22, color: GREY, font: RUN_FONT },
      },
    ],
  },
  sections: [
    {
      children: [
        heading('قالب إدخال الترانيم — كتاب «هلم نرنم»'),
        note('كيف تُدخل ترنيمة (اقرأ مرة واحدة فقط):'),
        note('١. لكل ترنيمة جديدة انسخ كتلة «ترنيمة جديدة» من آخر هذا الملف والصقها، ثم اكتب فوق النصوص الباهتة.'),
        note('٢. طبّق النمط (Style) المناسب على كل فقرة من معرض الأنماط:'),
        note('• Hymn | عنوان — سطر واحد: رقم الترنيمة ثم نقطة ثم العنوان، مثل: ١٢٣. عنوان الترنيمة'),
        note('• Verse | بيت — فقرة واحدة لكل بيت (مقطع). ابدأ برقم البيت بين قوسين: (١) ثم النص.'),
        note('• Chorus | لازمة — نص اللازمة (القرار)، يُكتب مرة واحدة في الموضع الذي يظهر فيه بالكتاب.'),
        note('• Info | معلومات — سطور «اسم: قيمة» مثل: المؤلف: … والملحن: … وكورد: … ومقياس الكلام: … ونظم: … والقرار: …'),
        note('٣. داخل البيت الواحد: السطور المتراكبة تُفصل بزر Shift+Enter، والنصفان المتجاوران يُفصل بينهما بزر Tab.'),
        note('٤. أي نص بالنمط العادي (Normal) هو ملاحظة للمحرر ولا يدخل التطبيق أبداً — اكتب فيه بحرية.'),
        note('٥. احفظ الملف وأرسله. لا تغيّر أسماء الأنماط ولا تحذفها.', { bold: true }),
        note('٦. قبل الإرسال احذف قسم «مثال مكتمل» فهو للتعلم فقط، وأما كتلة «ترنيمة جديدة» الفارغة التي لم تملأها فاحذفها أيضاً.'),
        note(''),
        heading('مثال مكتمل (هكذا تبدو الترنيمة المدخلة)'),
        para(STYLE_ID.HYMN, '٧. أنت تعرفني'),
        para(STYLE_ID.VERSE, '(١) أنتَ تعرفُني\nتعرفُ مَضْجَعِي'),
        para(STYLE_ID.CHORUS, 'أنتَ تعرفُني، تعرفُ قلبي'),
        para(STYLE_ID.VERSE, '(٢) تعرفُ قِفْلي\tوفكِّي'),
        para(STYLE_ID.VERSE, '(٣) أنتَ تعرفُ كلَّ أفكاري\nطُرُقي ليستْ عنكَ خفيَّة'),
        para(STYLE_ID.INFO, 'المؤلف: مزمور ١٣٩'),
        para(STYLE_ID.INFO, 'الملحن: —'),
        para(STYLE_ID.INFO, 'كورد: A'),
        para(STYLE_ID.INFO, 'مقياس الكلام: 8.8.8.8'),
        para(STYLE_ID.INFO, 'نظم: DENVER'),
        para(STYLE_ID.INFO, 'القرار: القرار'),
        note(''),
        note('لاحظ في المثال: اللازمة بعد البيت الأول كما في الكتاب، والبيت الثاني نصفان يفصلهما Tab، والبيت الثالث سطران بـ Shift+Enter.', { color: GREY }),
        note(''),
        heading('— انسخ ما يلي لكل ترنيمة جديدة —'),
        para(STYLE_ID.HYMN, '١٢٣. عنوان الترنيمة …'),
        para(STYLE_ID.VERSE, '(١) …'),
        para(STYLE_ID.CHORUS, '…'),
        para(STYLE_ID.VERSE, '(٢) …'),
        para(STYLE_ID.INFO, 'المؤلف: …'),
        para(STYLE_ID.INFO, 'الملحن: …'),
        para(STYLE_ID.INFO, 'كورد: …'),
        para(STYLE_ID.INFO, 'مقياس الكلام: …'),
        para(STYLE_ID.INFO, 'نظم: …'),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(OUT, buffer);
console.log(`wrote ${OUT} (${(buffer.length / 1024).toFixed(0)} KB)`);
