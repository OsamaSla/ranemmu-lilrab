/**
 * Relative singability check for the Hebrew translations.
 *
 * Run with:  node scripts/hebrew-meter.mjs            (report)
 *            node scripts/hebrew-meter.mjs --strict   (exit 1 on any flag)
 *            node scripts/hebrew-meter.mjs --lines    (print every line count)
 *
 * This does NOT try to prove the printed metre. Hebrew syllable counting from
 * unvocalised-cum-pointed text is approximate (shva na' vs shva nah is not
 * decidable from the text alone), and the Arabic metre numbers were never a
 * literal syllable target for the Hebrew anyway. What matters for singing is
 * that corresponding lines in every stanza run to roughly the same length, so
 * the tune does not stumble — that is what this checks: per line position, the
 * median across stanzas, and any line more than TOLERANCE syllables away.
 *
 * Syllables are estimated as vowel points (shva excluded), plus shuruq
 * (a vav carrying a dagesh and no other point). Furtive patah counts, which is
 * correct: it is a sounded vowel.
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');
const TOLERANCE = 2;

const args = new Set(process.argv.slice(2));
const STRICT = args.has('--strict');
const SHOW_LINES = args.has('--lines');

const VOWEL = /[\u05B1-\u05BB\u05C7]/; // hatafs + full points + qamats qatan
const SHURUQ = /\u05D5\u05BC(?![\u05B0-\u05BB\u05C7])/g;

/** Rough syllable estimate for one pointed Hebrew line. */
function syllables(line) {
  const vowels = (line.match(/[\u05B1-\u05BB\u05C7]/g) ?? []).length;
  const shuruq = (line.match(SHURUQ) ?? []).length;
  return vowels + shuruq;
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const files = (await readdir(CONTENT)).filter((f) => f.endsWith('.json') && f !== 'authors.json');
const hymns = [];
for (const name of files) {
  const raw = JSON.parse(await readFile(join(CONTENT, name), 'utf8'));
  hymns.push(...(Array.isArray(raw) ? raw : (raw.hymns ?? [])));
}

const translated = hymns
  .filter((h) => Array.isArray(h.verses_he) && h.verses_he.length > 0)
  .sort((a, b) => String(a.book).localeCompare(String(b.book)) || a.number - b.number);

if (translated.length === 0) {
  console.log('No hymns carry verses_he yet.');
  process.exit(0);
}

/** `tr0001` style id, built the same way build-corpus does. */
function hymnId(h) {
  const prefix = h.book === 'taranim' ? 'tr' : h.book === 'book3' ? 'b3' : 'h';
  return `${prefix}${String(h.number).padStart(4, '0')}`;
}

let flagged = 0;
let checked = 0;

for (const hymn of translated) {
  const counts = hymn.verses_he.map((verse) => verse.lines.map(syllables));
  // Group by line index inside the stanza; medians are computed per position.
  const byPosition = [];
  counts.forEach((stanza) => {
    stanza.forEach((count, i) => {
      (byPosition[i] ??= []).push(count);
    });
  });
  const medians = byPosition.map(median);
  const spread = Math.max(...medians) - Math.min(...medians);

  const shape = counts.map((s) => s.length).join('/');
  const med = medians.map((m) => Math.round(m)).join(',');
  const flags = [];

  // Stanzas of different lengths break the tune before syllable counts matter.
  const shapes = new Set(counts.map((s) => s.length));
  if (shapes.size > 1) flags.push(`irregular stanza shape ${shape}`);

  counts.forEach((stanza, v) => {
    stanza.forEach((count, i) => {
      if (count === 0) {
        flags.push(`${v + 1}:${i + 1} no vowels at all`);
        return;
      }
      const delta = count - medians[i];
      if (Math.abs(delta) > TOLERANCE) {
        const sign = delta > 0 ? '+' : '';
        flags.push(`${v + 1}:${i + 1} ${count} syllables (median ${Math.round(medians[i])}, ${sign}${Math.round(delta)})`);
      }
    });
  });

  checked += 1;
  flagged += flags.length;
  const status = flags.length ? '!' : '✓';
  console.log(`${hymnId(hymn)}  ${String(hymn.meter ?? '—').padEnd(10)} shape ${shape.padEnd(9)} median ${med.padEnd(10)} spread ${spread}  ${status}`);
  for (const flag of flags) console.log(`    ${flag}`);
  if (SHOW_LINES) {
    counts.forEach((stanza, v) => console.log(`    [${v + 1}] ${stanza.join(' ')}`));
  }
}

console.log(`\n${checked} hymn(s) checked · ${flagged} line(s) outside ±${TOLERANCE} syllables`);

if (flagged > 0) {
  console.log('A flag is a prompt to re-read the line, not automatically an error: the tune may still sit.');
  if (STRICT) process.exit(1);
}
