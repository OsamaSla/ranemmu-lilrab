/**
 * Hymn extractor: parses locally saved hymnary.org pages into the
 * converter.mjs text format.
 *
 * Run: node scripts/parse-pilot.mjs [--dir <folder>] [--stem <name>]
 *   defaults: --dir content/pilot --stem pilot
 *   e.g. node scripts/parse-pilot.mjs --dir content/batches/021-030 --stem batch-021-030
 *
 * Input:  <dir>/<N>.html  (fetched via fetch-batch.mjs or browser Ctrl+S)
 *         Two hymnary layouts are handled:
 *           A. text-authority page  -> #at_fulltext .authority_columns <p> blocks
 *           B. hymn-instance page  -> #instance_embedded_media_tabs #text <p> blocks
 * Output: <dir>/input-<stem>.txt  (converter.mjs block format)
 *         <dir>/report-<stem>.txt (per-hymn confidence report)
 *
 * No network access — everything runs on local files.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function flagValue(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : null;
}
const SRC_DIR = join(ROOT, flagValue('--dir') ?? join('content', 'pilot'));
const STEM = flagValue('--stem') ?? 'pilot';

// RL2007 printed titles (from the hymnal index) — used to cross-check the
// site's titles, which occasionally differ. Extend as new batches arrive.
const EXPECTED_TITLES = {
  11: 'الأشبال يمكن تحتاج',
  12: 'اوعى تفكر إني نسيتك',
  13: 'ليه تحمل الهموم',
  14: 'اللي بيعزيني عن كل آلامي',
  15: 'ماذا أرد لك يا حبيب هل فضتي والذهب',
  16: 'دوسي يا نفس بعز',
  17: 'ربي من لي في حيرتي',
  18: 'مر بي ولقاني',
  19: 'ماشي معايا وما بتنساني',
  20: 'لولا الحربه لولا التاج',
  21: 'كسرت سهام العدو',
  22: 'عايز أخرج كالنور برك',
  23: 'أنا مطمن وانا وياه',
  24: 'قال لي الشيطان خطاياك',
  25: 'ما دمت راعي يا ربي الحبيب',
  26: 'إلهنا حاضر وسطينا',
  27: 'يا اللي سلام النفس في قربك',
  28: 'نهتف لسيدنا فادينا',
  29: 'أنا فيك وفي فكرك م الأول',
  30: 'إن زرعت اليوم يا نفسي',
  31: 'وسط الجماهير',
  32: 'بقوة الدم اللي سال',
  33: 'مضيت وحدي في الطريق أبحث',
  34: 'قد مت عن خطيتي',
  35: 'يسوع أتانا وزار ربانا',
  36: 'محيا فادي المؤمنين',
  37: 'في هذي الحياة لا أبالي بالهموم',
  38: 'نبع سرور فاض في قلبي',
  39: 'عدونا مكير عدونا خطير',
  40: 'رضي بي وحن علي',
  41: 'ستستجيب طلبتي',
  42: 'أراك إلهي أراك',
  43: 'سددت الدين عني',
  44: 'جوعني ليك وإشبعني بيك',
  45: 'ضاع جل العمر في إثر السراب',
  46: 'قام المسيح يا شعب أبشر',
  47: 'هامسك إيدك وامشي معاك',
  48: 'إذ كنت في أسر الردى ناديت: "يا ربي"',
  49: 'لو كان غيرك سيدي',
  50: 'سيدي إني أعود',
  51: 'كنت الرابع في الأتون',
  52: 'علم الحب وعلم الفرح',
  53: 'رباه لا رجاء لي',
  54: 'وسط الأزمات وعدك مضمون',
  55: 'سلام بقلبي سلام عظيم',
  56: 'من البطن للشيب بي يعتني',
  57: 'أمامك يا من بذلت الدم',
  58: 'يا اللي بطول الرحله معين',
  59: 'قوموا نسبح كلنا للكاهن العظيم',
  60: 'طول ما في إيدك كل حياتي',
  61: 'اوعى تأجل',
  62: 'إن قلنا أننا له',
  63: 'مات من أجل خطايانا',
  64: 'إن باركنا في حياتنا',
  65: 'يده المثقوبة تنطق بالحب',
};

// Batch-scraped index titles override the built-in map when present.
try {
  const scrapedPath = join(SRC_DIR, 'titles.json');
  const scraped = JSON.parse(readFileSync(scrapedPath, 'utf8'));
  for (const [k, v] of Object.entries(scraped)) {
    if (v) EXPECTED_TITLES[Number(k)] = v;
  }
  console.log(`Loaded ${Object.keys(scraped).length} index titles from ${scrapedPath}`);
} catch {
  /* no titles.json — built-in map only */
}

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function clean(s) {
  return decodeEntities(String(s ?? ''))
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

/** Split a stanza <p> inner HTML into marker + lyric lines.
 *  Hymnary puts the stanza number AND the first lyric line on the same
 *  line ("1- الأشبال يمكن تحتاج"), so the marker prefix is stripped and
 *  any remainder becomes the first lyric line. */
function splitStanza(innerHtml) {
  const parts = innerHtml
    .split(/<br\s*\/?>/i)
    .map((chunk) => clean(chunk.replace(/<[^>]+>/g, '')))
    // Hymnary appends a "Source: ..." credit line to the last stanza.
    .filter((l) => l && !/^source:/i.test(l));
  if (!parts.length) return null;
  const [rawHeader, ...rest] = parts;
  const numPrefix = /^\s*[0-9٠-٩]+\s*[-.)]\s*/.exec(rawHeader);
  // Refrain markers take many shapes: القرار / القرار- / قرار: / قرار -
  const refrainPrefix = /^\s*(ال)?قرار\s*:?\s*[-–—]?\s*/i.exec(rawHeader);
  let firstLine = rawHeader;
  if (numPrefix) firstLine = rawHeader.slice(numPrefix[0].length).trim();
  else if (refrainPrefix) firstLine = rawHeader.slice(refrainPrefix[0].length).trim();
  const lines = firstLine ? [firstLine, ...rest] : rest;
  return { header: rawHeader, lines };
}

function parseStanzaNumber(header) {
  const m = /^\s*([0-9٠-٩]+)\s*[-.)]/.exec(header);
  if (!m) return null;
  const western = m[1].replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const n = Number(western);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

function isRefrainHeader(header) {
  return /قرار/.test(header) && parseStanzaNumber(header) === null;
}

/** Normalise a line for repeat comparison (strip tashkeel + punctuation). */
function normLine(line) {
  return line
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[؟?!.،؛,:()«»"'\-–—]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stanzaKey(lines) {
  return lines.map(normLine).filter(Boolean).join(' | ');
}

function extractTitle(html, number) {
  // Layout B: <h2 class='hymntitle'>17. title</h2>
  let m = html.match(/<h2 class=['"]hymntitle['"]>([\s\S]*?)<\/h2>/i);
  if (m) {
    const t = clean(m[1].replace(/<[^>]+>/g, ''));
    const nm = /^\s*\d+\.\s*(.+)$/.exec(t);
    if (nm) return { title: nm[1], layout: 'B' };
  }
  // Layout A: og:title meta or <h1>
  m = html.match(/<meta property="og:title" content="([^"]+)"/i);
  if (m) return { title: clean(m[1]), layout: 'A' };
  m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (m) return { title: clean(m[1].replace(/<[^>]+>/g, '')), layout: 'A?' };
  return { title: '', layout: '?' };
}

function extractStanzas(html) {
  // Layout A: anchor on the fulltext section (the columns wrapper varies:
  // authority_columns vs authority_no_columns, and Media sections reuse
  // the same class — so jump straight to the first stanza <p>).
  // Layout B: attribute-tolerant div#text match. Else unknown.
  let start = -1;
  let layout = 'A';
  const ft = html.indexOf('at_fulltext');
  if (ft >= 0) {
    const pm = /<p[^>]*>/.exec(html.slice(ft, ft + 5000));
    if (pm) start = ft + pm.index;
  }
  if (start < 0) {
    const m = /<div[^>]*\bid="text"[^>]*>/.exec(html);
    start = m ? m.index + m[0].length : -1;
    layout = 'B';
  }
  if (start < 0) return { layout: '?', stanzas: [] };
  // Bound the region at the end of the lyrics container — tune write-ups
  // further down contain <p> blocks that must never become stanzas.
  const endMarker = layout === 'A' ? 'authority_bottom_bar' : 'hy_column';
  let end = html.indexOf(endMarker, start);
  if (end < 0 || end - start > 20000) end = start + 12000; // fallback window
  const region = html.slice(start, end);
  const stanzas = [];
  for (const m of region.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
    const s = splitStanza(m[1]);
    if (s && s.lines.length) stanzas.push(s);
    if (stanzas.length > 12) break; // safety: lyrics never this long
  }
  return { layout, stanzas };
}

function parseFile(file) {
  const number = Number(file.replace(/\.html$/i, ''));
  const html = readFileSync(join(SRC_DIR, file), 'utf8');
  const { title: siteTitle, layout: titleLayout } = extractTitle(html, number);
  const { layout, stanzas } = extractStanzas(html);
  const notes = [];

  if (!stanzas.length) notes.push('NO-LYRICS: no stanza blocks found — page may be the wrong template');

  // Classify stanzas.
  const keyCount = new Map();
  for (const s of stanzas) keyCount.set(stanzaKey(s.lines), (keyCount.get(stanzaKey(s.lines)) ?? 0) + 1);

  let verseCounter = 0;
  let lastVerseLabel = 0;
  const usedVerseLabels = new Set();
  const out = stanzas.map((s, i) => {
    const num = parseStanzaNumber(s.header);
    const explicitRefrain = isRefrainHeader(s.header);
    const repeated = (keyCount.get(stanzaKey(s.lines)) ?? 0) > 1;
    if (explicitRefrain || (!explicitRefrain && num === null && repeated)) {
      // Refrain inherits the previous verse number (matches printed hymnal
      // convention and the existing corpus, e.g. hymn 1's refrain = "1").
      const label = lastVerseLabel || 1;
      const how = explicitRefrain ? 'explicit القرار header' : 'repeated stanza, no number';
      return { kind: 'refrain', label, lines: s.lines, confidence: explicitRefrain ? 'high' : 'medium', how, rawHeader: s.header };
    }
    if (num !== null) {
      // Hymnary typos reuse a stanza number (e.g. two "2-" blocks); a
      // duplicate label would silently MERGE stanzas downstream, so bump.
      let label = num;
      if (usedVerseLabels.has(label)) {
        while (usedVerseLabels.has(label)) label += 1;
        notes.push(`stanza ${i + 1}: site numbers it (${num}) but that label is taken — renumbered to (${label}), confirm against printed hymnal`);
      }
      usedVerseLabels.add(label);
      verseCounter = label;
      lastVerseLabel = label;
      const dup = label !== num ? 'medium' : 'high';
      return { kind: 'verse', label, lines: s.lines, confidence: dup, how: dup === 'high' ? `numbered (${num})` : `renumbered ${num}->${label}`, rawHeader: s.header };
    }
    // Unnumbered, non-repeated stanza: attach to previous verse number.
    verseCounter += 1;
    lastVerseLabel = verseCounter;
    notes.push(`stanza ${i + 1} has no number and is not repeated — treated as verse (${verseCounter}), PLEASE REVIEW`);
    return { kind: 'verse', label: verseCounter, lines: s.lines, confidence: 'low', how: 'unnumbered, assumed verse', rawHeader: s.header };
  });

  const hasRefrain = out.some((s) => s.kind === 'refrain');
  const lowConfidence = out.some((s) => s.confidence === 'low' || s.confidence === 'medium');

  // Verse labels should run 1..N without gaps (site typos skip numbers).
  const verseLabels = out.filter((s) => s.kind === 'verse').map((s) => s.label);
  const expectedSeq = verseLabels.map((_, i) => i + 1);
  if (verseLabels.join(',') !== expectedSeq.join(',')) {
    notes.push(`NUMBER-GAP: verse labels run (${verseLabels.join(', ')}) instead of (${expectedSeq.join(', ')}) — confirm against printed hymnal`);
  }

  if (!hasRefrain) {
    // A line repeated across stanzas (e.g. a parenthetical last line) may be
    // an unmarked refrain — flag it instead of deciding alone.
    const lineCount = new Map();
    for (const s of out) for (const l of s.lines) lineCount.set(normLine(l), (lineCount.get(normLine(l)) ?? 0) + 1);
    const repeated = [...lineCount.entries()].filter(([, c]) => c > 1).map(([l]) => `"${l}"`);
    notes.push(
      repeated.length
        ? `NO-REFRAIN — but these lines repeat across stanzas: ${repeated.join('; ')} — check printed hymnal for a لازمة`
        : 'NO-REFRAIN detected — confirm against the printed hymnal',
    );
  }

  // Title: the printed RL2007 index title wins over the site title.
  // (Site titles are text-authority first lines, e.g. the refrain's first
  // line; the hymnal title is the verse-1 first line.)
  let title = siteTitle;
  const expected = EXPECTED_TITLES[number];
  if (expected) {
    if (normLine(siteTitle) !== normLine(expected)) {
      notes.push(`TITLE: site says "${siteTitle}" — using RL2007 index title "${expected}"`);
    }
    title = expected;
  } else if (siteTitle) {
    notes.push(`TITLE: no RL2007 index title known for #${number} — kept site title "${siteTitle}", confirm against printed hymnal`);
  }
  if (!title) {
    notes.push('NO-TITLE: could not extract title — PLEASE FILL MANUALLY');
    title = '';
  }

  return { number, title, layout: titleLayout === '?' ? layout : `${layout}`, stanzas: out, hasRefrain, lowConfidence, notes };
}

function toConverterBlock(h) {
  // Header: number | title | meter(blank) | chorus-label
  const lines = [`${h.number} | ${h.title} |  | ${h.hasRefrain ? 'القرار' : ''}`];
  for (const s of h.stanzas) {
    if (s.kind === 'refrain') {
      // "كرّر:" with empty text marks kind=لازمة without adding a lyric line.
      lines.push(`(${s.label}) | كرّر:`);
    } else {
      lines.push(`(${s.label}) | ${s.lines[0]}`);
    }
    const rest = s.kind === 'refrain' ? s.lines : s.lines.slice(1);
    for (const l of rest) lines.push(`| ${l}`);
  }
  return lines.join('\n');
}

function main() {
  const files = readdirSync(SRC_DIR)
    .filter((f) => /^\d+\.html$/i.test(f))
    .sort((a, b) => Number(a.replace(/\..*$/, '')) - Number(b.replace(/\..*$/, '')));
  if (!files.length) {
    console.error(`No <N>.html files in ${SRC_DIR}/`);
    process.exit(1);
  }

  const hymns = files.map(parseFile);
  const blocks = hymns.map(toConverterBlock).join('\n\n');
  writeFileSync(join(SRC_DIR, `input-${STEM}.txt`), blocks + '\n', 'utf8');

  const report = [];
  let needReview = 0;
  for (const h of hymns) {
    const stanzas = h.stanzas.map((s) => `(${s.label})${s.kind === 'refrain' ? '[لازمة]' : ''}`).join(' ');
    const flags = [];
    if (!h.hasRefrain) flags.push('no refrain detected');
    if (h.lowConfidence) flags.push('LOW CONFIDENCE stanza(s)');
    if (h.notes.length) flags.push(...h.notes);
    if (flags.length) needReview += 1;
    report.push(
      `hymn ${h.number} "${h.title}" [layout ${h.layout}]: ${h.stanzas.length} stanzas ${stanzas}\n` +
        `  refrain: ${h.hasRefrain ? h.stanzas.filter((s) => s.kind === 'refrain').map((s) => `(${s.label}, ${s.confidence}: ${s.how})`).join(', ') : 'NONE'}\n` +
        (flags.length ? `  !! ${flags.join(' / ')}\n` : '  ok\n'),
    );
  }
  report.push(`\nTOTAL: ${hymns.length} hymns, ${needReview} need review.`);
  const reportText = report.join('\n');
  writeFileSync(join(SRC_DIR, `report-${STEM}.txt`), reportText + '\n', 'utf8');
  console.log(reportText);
  console.log(`\nWrote ${join(SRC_DIR, `input-${STEM}.txt`)}`);
}

main();
