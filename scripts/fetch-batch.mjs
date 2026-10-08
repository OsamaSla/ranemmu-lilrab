/**
 * Auto-fetches hymnary.org RL2007 hymn pages with a real Edge browser.
 *
 * Run: node scripts/fetch-batch.mjs <from> <to> [--headed] [--warmup] [--delay <ms>] [--warmup-secs <n>]
 *   e.g. node scripts/fetch-batch.mjs 21 30 --headed --warmup
 *
 * For each hymn N it saves the lyrics-bearing page (embedded Full Text tab
 * or the linked /text/... page) as content/batches/###-###/<N>.html.
 *
 * Politeness: 5s between requests (robots.txt asks Crawl-delay: 5 — never
 * set --delay below 5000 or the site may ban the IP, costing far more time).
 * Already-saved files are skipped, so re-running resumes for free.
 * Failures are recorded in the batch dir's failed.txt, never fatal.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EDGE_BIN =
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function flagValue(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : null;
}
// Floor 5000ms: the site's robots.txt demands Crawl-delay 5.
const BETWEEN_MS = Math.max(5000, Number(flagValue('--delay')) || 5000);
const WARMUP_SECS = Math.max(0, Number(flagValue('--warmup-secs')) || 10);
const AFTER_LOAD_MS = 600; // server-rendered pages settle fast
const JITTER_MS = 500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toTimeString().slice(0, 8);

async function fetchOne(page, n, dir) {
  const out = join(dir, `${n}.html`);
  if (existsSync(out)) {
    console.log(`[${stamp()}] #${n}: cached, skipping`);
    return 'cached';
  }
  const hymnUrl = `https://hymnary.org/hymn/RL2007/${n}`;
  try {
    await page.goto(hymnUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(AFTER_LOAD_MS);

    // Bot-block check: Bunny strips the <body> for suspected bots (page
    // arrives as a ~5KB head-only stub). Detect it before doing real work.
    const bodyCount = await page.locator('body #standard-hymn-page, body .authority_sections').count();
    if (bodyCount === 0) {
      const len = (await page.content()).length;
      throw new Error(`BOT-BLOCK: page body stripped (${len} bytes, no hymn content) — run with --warmup first`);
    }

    // Layout B: lyrics embedded on the hymn page itself.
    const embedded = await page.locator('#instance_embedded_media_tabs #text p').first().count();
    if (embedded > 0) {
      const html = await page.content();
      writeFileSync(out, html, 'utf8');
      console.log(`[${stamp()}] #${n}: saved embedded-text page (${html.length} bytes)`);
      return 'embedded';
    }

    // Layout A: follow the "Text:" link to the /text/... authority page.
    const link = page.locator('.infoBubble a[href^="/text/"]').first();
    if ((await link.count()) === 0) {
      throw new Error('page loaded but has neither embedded text nor /text/ link (hymn may genuinely lack text)');
    }
    const href = await link.getAttribute('href');
    await page.goto(`https://hymnary.org${href}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(AFTER_LOAD_MS);
    let html2 = await page.content();
    if (html2.length < 20000) {
      throw new Error(`BOT-BLOCK on text page (${html2.length} bytes) — run with --warmup first`);
    }
    if (!html2.includes('at_fulltext')) {
      // Text authority exists but carries no transcribed lyrics — fall back
      // to the hymn page itself (it may embed them); either way one file.
      console.log(`[${stamp()}] #${n}: text page has no lyrics, falling back to hymn page`);
      await page.goto(hymnUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(AFTER_LOAD_MS);
      html2 = await page.content();
    }
    writeFileSync(out, html2, 'utf8');
    console.log(`[${stamp()}] #${n}: saved text page ${href}`);
    return 'textpage';
  } catch (err) {
    const blocked = err.message.startsWith('BOT-BLOCK');
    console.error(`[${stamp()}] #${n}: FAILED — ${err.message}`);
    writeFileSync(join(dir, 'failed.txt'), `${n}: ${err.message}\n`, { flag: 'a' });
    return blocked ? 'blocked' : 'failed';
  }
}

async function main() {
  const [fromS, toS, ...flags] = process.argv.slice(2);
  const from = Number(fromS);
  const to = Number(toS ?? fromS);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) {
    console.error('Usage: node scripts/fetch-batch.mjs <from> <to> [--headed] [--warmup] [--delay <ms>] [--warmup-secs <n>]');
    process.exit(1);
  }
  const headed = flags.includes('--headed');
  const pad = (n) => String(n).padStart(3, '0');
  const dir = join(ROOT, 'content', 'batches', `${pad(from)}-${pad(to)}`);
  mkdirSync(dir, { recursive: true });

  console.log(`Fetching hymns ${from}-${to} -> ${dir} (${headed ? 'headed' : 'headless'}, ${BETWEEN_MS}ms between requests)`);
  if (headed) {
    console.log('If a security check appears in the Edge window, solve it once — the script keeps going.');
  }

  const browser = await chromium.launchPersistentContext(join(ROOT, 'content', 'batches', '.profile'), {
    executablePath: EDGE_BIN,
    headless: !headed,
    locale: 'ar-EG',
    // No auto-translate popup: Arabic pages trigger Edge's "Translate page?"
    // bubble, which can cover content and stall unattended runs.
    args: ['--disable-features=Translate'],
  });
  const page = await browser.newPage();
  // We only need the HTML: block images, stylesheets, fonts and media so
  // pages reach domcontentloaded much sooner (and the site serves less).
  await page.route(
    (url) => /\.(png|jpe?g|gif|svg|ico|css|woff2?|ttf|eot|mp3|midi?|mp4)(\?|$)/i.test(url.pathname),
    (route) => route.abort(),
  );

  if (flags.includes('--warmup')) {
    // The index page holding the range (100 hymns per page).
    const indexPage = Math.floor((from - 1) / 100);
    const indexUrl = indexPage === 0 ? 'https://hymnary.org/hymnal/RL2007' : `https://hymnary.org/hymnal/RL2007?page=${indexPage}`;
    console.log(`\nWARMUP: the hymnal index (${indexUrl}) is open in the Edge window.`);
    console.log(`Please click around (open a hymn or two). Fetching starts automatically in ${WARMUP_SECS} seconds.`);
    await page.goto(indexUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Scrape FIRST while still on the index (user clicks away afterwards).
    // Harvests the printed number -> title map for the batch range.
    try {
      const links = await page.locator('a[href^="/hymn/RL2007/"]').all();
      const titles = {};
      for (const a of links) {
        const href = (await a.getAttribute('href')) || '';
        const m = /\/hymn\/RL2007\/(\d+)$/.exec(href);
        if (!m) continue;
        const num = Number(m[1]);
        if (num < from || num > to) continue;
        const text = (await a.textContent())?.trim() || '';
        if (!text || /^\d+$/.test(text)) continue; // number link, not title
        titles[num] = text;
      }
      writeFileSync(join(dir, 'titles.json'), JSON.stringify(titles, null, 1) + '\n', 'utf8');
      console.log(`  scraped ${Object.keys(titles).length} index titles -> titles.json`);
    } catch (err) {
      console.log(`  title scrape skipped: ${err.message}`);
    }
    for (let s = WARMUP_SECS; s > 0; s -= 5) {
      console.log(`  ...${s}s left to click around`);
      await sleep(Math.min(5000, s * 1000));
    }
    console.log('Warmup done — continuing with the batch.\n');
  }
  const stats = { cached: 0, embedded: 0, textpage: 0, failed: 0, blocked: 0 };

  for (let n = from; n <= to; n += 1) {
    const r = await fetchOne(page, n, dir);
    stats[r] += 1;
    if (r === 'blocked') {
      console.log('\nStopped early: the site is stripping page bodies (bot-block).');
      console.log('Re-run with --headed --warmup (add --warmup-secs 60 if the short warmup was not enough) and click around during warmup.');
      break;
    }
    if (n < to) await sleep(BETWEEN_MS + Math.floor(Math.random() * JITTER_MS));
  }

  await browser.close();
  console.log(`\nDone: ${JSON.stringify(stats)}. Files in ${dir}`);
  if (stats.failed > 0) console.log('See failed.txt for details — re-run resumes the rest.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
