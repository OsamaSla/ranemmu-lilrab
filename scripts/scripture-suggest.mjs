/**
 * Drafts the scripture a hymn is founded on, by matching the hymn against the
 * Smith & Van Dyke (1865) Arabic Bible.
 *
 * Run with:  npm run scripture:suggest
 *            node scripts/scripture-suggest.mjs --book main --limit 50
 *            node scripts/scripture-suggest.mjs --refresh     (re-download)
 *
 * Output   content/scriptures/_drafts/<book>/<number>.json   payload-shaped
 *          content/scriptures/_drafts/report.md              humans read this
 *
 * The Bible text is downloaded once into `content/.cache/svd/`, which is
 * gitignored: the text is copyrighted to its distributor and is **never**
 * committed or bundled. Only reference strings (`isa.53.4-6`) reach the corpus.
 *
 * Matching is deliberately conservative. The output is a *suggestion*: every
 * drafted ref is written with `review: true`, so it stays flagged until a human
 * reads the verse and confirms it. A hymn with no confident match gets no draft
 * at all — the reader then shows nothing rather than a plausible guess.
 */
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BIBLE_BOOKS,
  formatScriptureRef,
  refToString,
} from './lib/bible-books.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'content');
const CACHE_DIR = join(ROOT, 'content', '.cache', 'svd');
const DRAFT_DIR = join(ROOT, 'content', 'scriptures', '_drafts');

/**
 * Accept/reject bars, kept here so a run can be reproduced with its numbers.
 *
 * Two independent kinds of evidence, and each is worth less alone:
 *
 *  - a literal phrase (the hymn prints the verse's own words), measured as the
 *    summed IDF of the matched words — "كشاة تساق إلى الذبح" is a quotation,
 *    "يا إلهي قد" is a coincidence of common words;
 *  - overlap, the cosine between the hymn's vocabulary and the verse's.
 *
 * A phrase of *very* distinctive words carries the decision on its own
 * (`trigramStrong`, `bigramStrong`), because a hymn can quote one line and
 * paraphrase the rest. Anything weaker needs the overlap to agree, so a bare
 * "في جب الأسود" in an unrelated hymn (an idiom, not a foundation) is listed
 * for review instead of being drafted.
 */
const SCORE = {
  /** A three-word quote this distinctive stands alone. */
  trigramStrong: 20,
  /** A three-word quote plus some shared vocabulary. */
  trigramStrength: 16,
  trigramCosine: 0.15,
  /** A weaker three-word match only when the hymn clearly overlaps the verse. */
  trigramWithCosine: 13,
  trigramWithCosineMin: 0.25,
  /** A two-word pair this distinctive stands alone ("نعمتي تكفيك"). */
  bigramStrong: 18,
  /** Two shared words plus a reasonable overlap. */
  bigramStrength: 13,
  bigramCosine: 0.3,
  /** No phrase, but a dense rare-word overlap. */
  cosineOnly: 0.35,
  /** Adjacent verses merge into one range while their overlap keeps up. */
  rangeShare: 0.55,
  /** Longest merged range, so a hymn never cites a whole chapter by accident. */
  maxRange: 6,
};

/** Posting lists longer than this carry no signal; skip the iteration cost. */
const MAX_DF = 6000;
/** A token this rare is distinctive enough to make a two-word phrase count. */
const RARE_DF = 300;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const hit = args.find((arg) => arg.startsWith(`${name}=`));
  if (hit) return hit.slice(name.length + 1);
  const index = args.indexOf(name);
  if (index !== -1 && args[index + 1] && !args[index + 1].startsWith('--')) {
    return args[index + 1];
  }
  return fallback;
};

const REFRESH = flag('--refresh');
const ONLY_BOOK = option('--book', null);
const LIMIT = Number(option('--limit', '0')) || 0;
const VERBOSE = flag('--verbose');

const MARK = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/**
 * Arabic folding for matching only. Harakat, tatweel and punctuation are
 * dropped; آ أ إ ٱ → ا, ى → ي, ة → ه, ؤ → و, ئ → ي. The definite article is
 * stripped when at least three letters remain, so المحبة and محبة meet, while
 * الله stays الله instead of collapsing onto له.
 */
function normalise(text) {
  return String(text)
    .replace(MARK, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/\u0624/g, '\u0648')
    .replace(/\u0626/g, '\u064A')
    .replace(/[^\u0621-\u064A0-9]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Folds one token and drops the article when the stem is still a word. */
function stem(token) {
  if (/^[0-9]+$/.test(token)) return null;
  if (token.length > 4 && token.startsWith('\u0627\u0644') && token.length - 2 >= 3) {
    return token.slice(2);
  }
  return token;
}

function tokensOf(text) {
  return normalise(text).map(stem).filter(Boolean);
}

/** Stable phrase key; the space cannot occur inside a token. */
const phraseKey = (parts) => parts.join(' ');

async function downloadBook(ordinal) {
  const url = `https://api.getbible.net/v2/arabicsv/${ordinal}.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

/**
 * Loads (or downloads) every book and flattens it into verses in canonical
 * order. Files are cached by canonical ordinal, not by name, so a book can be
 * renamed in the table without invalidating the cache.
 */
async function loadBible() {
  await mkdir(CACHE_DIR, { recursive: true });
  const verses = [];

  for (let i = 0; i < BIBLE_BOOKS.length; i += 1) {
    const book = BIBLE_BOOKS[i];
    const file = join(CACHE_DIR, `${String(i + 1).padStart(2, '0')}-${book.id}.json`);
    let data = null;
    if (!REFRESH) {
      try {
        data = JSON.parse(await readFile(file, 'utf8'));
      } catch {
        data = null;
      }
    }
    if (!data) {
      data = await downloadBook(i + 1);
      await writeFile(file, JSON.stringify(data), 'utf8');
      process.stdout.write(`  downloaded ${book.id} (${data.chapters.length} ch)\n`);
    }
    for (const chapter of data.chapters) {
      for (const verse of chapter.verses) {
        // The SVD text is fully vocalised and carries leading/trailing spaces;
        // only the folded tokens are used, the text is kept for the report.
        verses.push({
          book: book.id,
          chapter: chapter.chapter,
          verse: verse.verse,
          text: verse.text.trim().replace(/\s+/g, ' '),
          tokens: tokensOf(verse.text),
        });
      }
    }
  }
  return verses;
}

/** Reads the authoring corpus the same way build-corpus does. */
async function readHymns() {
  const names = (await readdir(CONTENT_DIR)).filter(
    (name) => name.endsWith('.json') && name !== 'authors.json',
  );
  const hymns = [];
  for (const name of names) {
    const raw = JSON.parse(await readFile(join(CONTENT_DIR, name), 'utf8'));
    const list = Array.isArray(raw) ? raw : raw.hymns;
    if (!Array.isArray(list)) continue;
    const fallbackBook = name.replace(/\.json$/, '');
    for (const hymn of list) {
      hymns.push({ ...hymn, book: hymn.book ?? fallbackBook });
    }
  }
  return hymns.sort((a, b) =>
    a.book === b.book ? a.number - b.number : a.book < b.book ? -1 : 1,
  );
}

/**
 * Inverted index over verse tokens, plus the per-verse norm needed for a
 * cosine score. `df` is derived from the posting lengths.
 */
function indexBible(verses) {
  const postings = new Map();
  verses.forEach((verse, i) => {
    for (const token of new Set(verse.tokens)) {
      const list = postings.get(token);
      if (list) list.push(i);
      else postings.set(token, [i]);
    }
  });
  const total = verses.length;
  const idf = new Map();
  for (const [token, list] of postings) {
    idf.set(token, Math.log((total + 1) / (list.length + 1)));
  }
  const norms = new Float64Array(total);
  for (let i = 0; i < total; i += 1) {
    let sum = 0;
    for (const token of new Set(verses[i].tokens)) {
      // Tokens above MAX_DF are never scored, so they must not inflate the
      // vector norm either: including them shrank every cosine.
      const list = postings.get(token);
      if (!list || list.length > MAX_DF) continue;
      sum += idf.get(token) ** 2;
    }
    norms[i] = Math.sqrt(sum);
  }
  return { postings, idf, norms, total };
}

/** Weighted token vector for a hymn: title terms count three times. */
function hymnVector(hymn) {
  const weights = new Map();
  const add = (text, weight) => {
    for (const token of tokensOf(text)) {
      weights.set(token, Math.max(weights.get(token) ?? 0, weight));
    }
  };
  add(hymn.title ?? '', 3);
  for (const verse of hymn.verses ?? []) {
    for (const line of verse.lines ?? []) add(line, 1);
  }
  return weights;
}

/** Distinctive bigrams and trigrams from the hymn, in print order. */
function hymnPhrases(hymn, index) {
  const sequence = [];
  for (const line of [hymn.title ?? '', ...(hymn.verses ?? []).flatMap((v) => v.lines ?? [])]) {
    sequence.push(...tokensOf(line));
  }
  const bigrams = new Set();
  const trigrams = new Set();
  const rare = (token) => (index.postings.get(token)?.length ?? 0) <= RARE_DF;
  for (let i = 0; i < sequence.length - 1; i += 1) {
    const a = sequence[i];
    const b = sequence[i + 1];
    if (rare(a) || rare(b)) bigrams.add(phraseKey([a, b]));
    if (i < sequence.length - 2) {
      const c = sequence[i + 2];
      const rarities = [a, b, c].filter(rare).length;
      if (rarities >= 1) trigrams.add(phraseKey([a, b, c]));
    }
  }
  return { bigrams, trigrams };
}

/**
 * Phrase evidence weighted by rarity: a three-word match of common words
 * ("يا إلهي قد") is a coincidence, the same match of distinctive words
 * ("كشاة تساق إلى الذبح") is a quotation. Strength is the summed IDF of the
 * matched words, so the bar is in "how unusual is this phrase" units rather
 * than in raw hit counts.
 */
function phraseHits(verse, phrases, idf) {
  const tokens = verse.tokens;
  let bigrams = 0;
  let trigrams = 0;
  let bigramStrength = 0;
  let trigramStrength = 0;
  const matched = [];
  const strength = (parts) => parts.reduce((sum, token) => sum + (idf.get(token) ?? 0), 0);
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const bigram = tokens.slice(i, i + 2);
    if (phrases.bigrams.has(phraseKey(bigram))) {
      const value = strength(bigram);
      bigrams += 1;
      bigramStrength = Math.max(bigramStrength, value);
      if (matched.length < 6) matched.push(`${bigram.join(' ')} (${value.toFixed(1)})`);
    }
    if (i < tokens.length - 2) {
      const trigram = tokens.slice(i, i + 3);
      if (phrases.trigrams.has(phraseKey(trigram))) {
        const value = strength(trigram);
        trigrams += 1;
        trigramStrength = Math.max(trigramStrength, value);
        if (matched.length < 6) matched.push(`${trigram.join(' ')} (${value.toFixed(1)})`);
      }
    }
  }
  return { bigrams, trigrams, matched, bigramStrength, trigramStrength };
}

/**
 * Scores every verse against one hymn and returns the best candidates. The
 * accumulation array is allocated once per hymn and reset through `touched`,
 * because zeroing 31k floats per hymn would dominate the run.
 */
function rank(hymn, index, dot) {
  const weights = hymnVector(hymn);
  const phrases = hymnPhrases(hymn, index);
  let hymnNorm = 0;
  const components = [];
  for (const [token, weight] of weights) {
    const idf = index.idf.get(token);
    const list = index.postings.get(token);
    if (!idf || !list || list.length > MAX_DF) continue;
    const value = weight * idf;
    components.push({ token, value, list, idf });
    hymnNorm += value * value;
  }
  if (hymnNorm === 0) return [];
  hymnNorm = Math.sqrt(hymnNorm);

  const touched = [];
  for (const { value, list, idf } of components) {
    const add = value * idf;
    for (const i of list) {
      if (dot[i] === 0) touched.push(i);
      dot[i] += add;
    }
  }

  const candidates = [];
  for (const i of touched) {
    const cosine = dot[i] / (hymnNorm * (index.norms[i] || 1));
    dot[i] = 0;
    if (cosine < 0.06) continue;
    const hits = phraseHits(index.verses[i], phrases, index.idf);
    const score =
      cosine +
      0.03 * Math.min(hits.trigramStrength, 24) +
      0.015 * Math.min(hits.bigramStrength, 16);
    candidates.push({ i, cosine, score, ...hits });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

/** Accept/reject rule for one hymn's best candidate. */
function confident(best) {
  if (!best) return false;
  if (best.trigramStrength >= SCORE.trigramStrong) return true;
  if (best.trigramStrength >= SCORE.trigramStrength && best.cosine >= SCORE.trigramCosine) {
    return true;
  }
  if (
    best.trigramStrength >= SCORE.trigramWithCosine &&
    best.cosine >= SCORE.trigramWithCosineMin
  ) {
    return true;
  }
  if (best.bigramStrength >= SCORE.bigramStrong) return true;
  if (best.bigramStrength >= SCORE.bigramStrength && best.cosine >= SCORE.bigramCosine) {
    return true;
  }
  return best.cosine >= SCORE.cosineOnly;
}

/**
 * Grows the winning verse into a range while neighbouring verses keep a good
 * share of its score — a hymn founded on Isaiah 53 is usually founded on the
 * whole Servant Song paragraph, not one isolated verse.
 */
function passage(verses, ranked) {
  const first = ranked[0];
  const byIndex = new Map(ranked.map((item) => [item.i, item]));
  const anchor = verses[first.i];
  let from = anchor.verse;
  let to = anchor.verse;
  let size = 1;
  // Ranges follow *overlap*, not the phrase score: inside a quoted passage the
  // neighbouring verses share the same rare words, while their phrase strength
  // depends on where the line breaks happen to fall.
  const floor = Math.max(0.1, first.cosine * SCORE.rangeShare);
  for (const direction of [-1, 1]) {
    let cursor = first.i + direction;
    while (size < SCORE.maxRange) {
      const neighbour = byIndex.get(cursor);
      const verse = verses[cursor];
      if (!neighbour || !verse) break;
      if (verse.book !== anchor.book || verse.chapter !== anchor.chapter) break;
      if (Math.abs(verse.verse - anchor.verse) > SCORE.maxRange) break;
      if (neighbour.cosine < floor) break;
      from = Math.min(from, verse.verse);
      to = Math.max(to, verse.verse);
      size += 1;
      cursor += direction;
    }
  }
  return { book: anchor.book, chapter: anchor.chapter, from, to };
}

/** Which rule accepted this verse — the report prints it next to the ref. */
function verdictOf(best) {
  if (best.trigramStrength >= SCORE.trigramStrong) return 'trigram';
  if (best.trigramStrength >= SCORE.trigramStrength && best.cosine >= SCORE.trigramCosine) {
    return 'trigramOverlap';
  }
  if (best.trigramStrength >= SCORE.trigramWithCosine && best.cosine >= SCORE.trigramWithCosineMin) {
    return 'trigramOverlap';
  }
  if (best.bigramStrength >= SCORE.bigramStrong) return 'bigram';
  if (best.bigramStrength >= SCORE.bigramStrength && best.cosine >= SCORE.bigramCosine) {
    return 'bigram';
  }
  return 'cosine';
}

/** A phrase was found but the evidence was too thin to draft: list it for a human. */
function weakPhrase(best) {
  if (!best) return false;
  return (
    best.trigramStrength >= SCORE.trigramWithCosine ||
    best.bigramStrength >= SCORE.bigramStrength
  );
}

async function main() {
  const started = Date.now();
  console.log('Loading the Arabic Bible (Smith & Van Dyke)…');
  const verses = await loadBible();
  const index = indexBible(verses);
  index.verses = verses;
  console.log(`  ${verses.length} verses indexed in ${((Date.now() - started) / 1000).toFixed(1)}s`);

  const hymns = await readHymns();
  const already = hymns.filter((hymn) => Array.isArray(hymn.scriptures) && hymn.scriptures.length);
  const scan = hymns
    .filter((hymn) => !ONLY_BOOK || hymn.book === ONLY_BOOK)
    .filter((hymn) => !(Array.isArray(hymn.scriptures) && hymn.scriptures.length))
    .slice(0, LIMIT || undefined);

  await rm(DRAFT_DIR, { recursive: true, force: true });
  await mkdir(DRAFT_DIR, { recursive: true });

  const dot = new Float64Array(verses.length);
  const drafts = [];
  const weak = [];
  const nearMisses = [];
  const perBook = new Map();
  const verdicts = { trigram: 0, trigramOverlap: 0, bigram: 0, cosine: 0 };

  for (const hymn of scan) {
    const ranked = rank(hymn, index, dot);
    const best = ranked[0];
    const ref = best && confident(best) ? passage(verses, ranked) : null;
    const entry = {
      hymn,
      best,
      ref,
      key: ref ? refToString(ref) : '',
      snippet: best ? verses[best.i].text : '',
      verdict: best ? verdictOf(best) : null,
      // The two next-best verses, resolved now: `ranked` is discarded with the
      // hymn so the report cannot re-derive it later.
      others: ranked
        .filter((item) => item.i !== best?.i)
        .slice(0, 2)
        .map((item) => ({ verse: verses[item.i], score: item.score })),
    };
    if (ref) {
      drafts.push(entry);
      verdicts[entry.verdict] += 1;
      const list = perBook.get(hymn.book) ?? [];
      list.push(entry);
      perBook.set(hymn.book, list);
      const dir = join(DRAFT_DIR, hymn.book);
      await mkdir(dir, { recursive: true });
      await writeFile(
        join(dir, `${String(hymn.number).padStart(4, '0')}.json`),
        JSON.stringify({ book: hymn.book, number: hymn.number, refs: [entry.key], review: [entry.key] }, null, 2) + '\n',
        'utf8',
      );
      if (VERBOSE) {
        console.log(`  ${hymn.book} ${String(hymn.number).padStart(4, '0')}  ${formatScriptureRef(ref)}  score ${best.score.toFixed(3)} (${entry.verdict})`);
      }
    } else if (weakPhrase(best)) {
      weak.push(entry);
    } else if (best && best.score >= 0.35) {
      nearMisses.push(entry);
    }
  }

  nearMisses.sort((a, b) => b.best.score - a.best.score);
  weak.sort((a, b) => b.best.trigramStrength - a.best.trigramStrength);

  const lines = [];
  lines.push('# Scripture drafts');
  lines.push('');
  lines.push(`Generated ${new Date().toISOString().slice(0, 10)} from the Smith & Van Dyke (1865) Arabic Bible.`);
  lines.push('');
  lines.push(`- ${verses.length.toLocaleString('en-US')} verses indexed, ${scan.length.toLocaleString('en-US')} hymns scanned.`);
  lines.push(`- ${drafts.length.toLocaleString('en-US')} hymn(s) got a draft; ${already.length} already carried references and were skipped.`);
  lines.push(`- Accepted by: distinctive phrase ${verdicts.trigram} · phrase + overlap ${verdicts.trigramOverlap} · word pair ${verdicts.bigram} · rare-word overlap ${verdicts.cosine}.`);
  lines.push(
    `- Bars: phrase ≥ ${SCORE.trigramStrong} alone, or ≥ ${SCORE.trigramStrength} with cosine ≥ ${SCORE.trigramCosine}, or ≥ ${SCORE.trigramWithCosine} with cosine ≥ ${SCORE.trigramWithCosineMin}; word pair ≥ ${SCORE.bigramStrong} alone, or ≥ ${SCORE.bigramStrength} with cosine ≥ ${SCORE.bigramCosine}; cosine ≥ ${SCORE.cosineOnly}.`,
  );
  lines.push(`- ${weak.length} hymn(s) quoted a phrase too weakly to draft — listed under “Weak phrase matches” at the end.`);
  lines.push('');
  lines.push('Every draft is written with `review: true`: read the verse, then remove the flag before trusting it.');
  lines.push('Nothing here is merged until its file is copied to `content/scriptures/<book>/` and `npm run scripture:apply` is run.');
  lines.push('');

  const books = [...perBook.keys()].sort();
  for (const book of books) {
    const list = perBook.get(book);
    lines.push(`## ${book} — ${list.length} draft(s)`);
    lines.push('');
    for (const entry of list) {
      const { hymn, best } = entry;
      const opening = (hymn.verses ?? [])
        .slice(0, 2)
        .flatMap((verse) => verse.lines ?? [])
        .slice(0, 2)
        .join(' / ');
      lines.push(`### ${String(hymn.number).padStart(4, '0')} — ${hymn.title}`);
      lines.push('');
      lines.push(`Opening: ${opening}`);
      lines.push('');
      lines.push(
        `\`${entry.key}\` — **${formatScriptureRef(entry.ref)}** · score ${best.score.toFixed(3)} · cosine ${best.cosine.toFixed(3)} · strength ${best.trigramStrength.toFixed(1)}/${best.bigramStrength.toFixed(1)} · ${entry.verdict}`,
      );
      if (best.matched?.length) {
        lines.push('');
        lines.push(`Matched: ${best.matched.map((phrase) => `«${phrase}»`).join(' ')}`);
      }
      lines.push('');
      lines.push(`> ${entry.snippet}`);
      lines.push('');
      const alternatives = entry.others.map(({ verse, score }) => {
        const single = {
          book: verse.book,
          chapter: verse.chapter,
          from: verse.verse,
          to: verse.verse,
        };
        return `- \`${refToString(single)}\` — ${formatScriptureRef(single)} · score ${score.toFixed(3)} · ${verse.text.slice(0, 120)}`;
      });
      if (alternatives.length) {
        lines.push('Other candidates:');
        lines.push('');
        lines.push(...alternatives);
        lines.push('');
      }
    }
  }

  if (weak.length) {
    lines.push('## Weak phrase matches (no draft — quoted in passing, not founded on)');
    lines.push('');
    lines.push('The hymn prints a distinctive phrase from the verse, but the rest of the hymn has little in common with it. Often the hymn is only borrowing an idiom (`في جب الأسود`, `في ظلام دامس`). Promote one by hand — write its payload file under `content/scriptures/<book>/` — if the whole hymn really is about this verse.');
    lines.push('');
    for (const entry of weak) {
      const { hymn, best } = entry;
      const verse = verses[best.i];
      const single = { book: verse.book, chapter: verse.chapter, from: verse.verse, to: verse.verse };
      const phrase = (best.matched ?? [])
        .map((text) => ({ text, value: Number(text.match(/\(([0-9.]+)\)$/)?.[1] ?? 0) }))
        .sort((a, b) => b.value - a.value)[0]
        ?.text.replace(/\s*\([0-9.]+\)$/, '') ?? '';
      lines.push(
        `- ${hymn.book} ${String(hymn.number).padStart(4, '0')} — ${hymn.title} · \`${refToString(single)}\` ${formatScriptureRef(single)} · cos ${best.cosine.toFixed(2)} · «${phrase}» · ${verse.text.slice(0, 90)}`,
      );
    }
    lines.push('');
  }

  if (nearMisses.length) {
    lines.push('## Near misses (no draft — check these by hand if the hymn looks familiar)');
    lines.push('');
    for (const entry of nearMisses.slice(0, 300)) {
      const { hymn, best } = entry;
      const verse = verses[best.i];
      lines.push(
        `- ${hymn.book} ${String(hymn.number).padStart(4, '0')} — ${hymn.title} · \`${verse.book}.${verse.chapter}.${verse.verse}\` · score ${best.score.toFixed(3)} · ${verse.text.slice(0, 100)}`,
      );
    }
    lines.push('');
  }

  await writeFile(join(DRAFT_DIR, 'report.md'), lines.join('\n'), 'utf8');

  console.log('');
  console.log(`Scanned ${scan.length} hymns (${already.length} already referenced, skipped).`);
  console.log(`Drafted ${drafts.length} hymn(s): phrase ${verdicts.trigram}, phrase+overlap ${verdicts.trigramOverlap}, word pair ${verdicts.bigram}, overlap ${verdicts.cosine}.`);
  for (const book of [...perBook.keys()].sort()) {
    const total = scan.filter((hymn) => hymn.book === book).length;
    console.log(`  ${book.padEnd(8)} ${String(perBook.get(book).length).padStart(4)} / ${total}`);
  }
  console.log(`Weak phrase matches (listed, not drafted): ${weak.length}.`);
  console.log(`Near misses: ${nearMisses.length}.`);
  console.log('Report: content/scriptures/_drafts/report.md');
  console.log(`Took ${((Date.now() - started) / 1000).toFixed(1)}s.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
