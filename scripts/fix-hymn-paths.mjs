#!/usr/bin/env node
/**
 * Validate hymn page paths in dist/ and (re)create the root redirect.
 *
 * History: this script used to inject a `<meta http-equiv="refresh">`
 * pointing back to /library.html into every hymn page, and it computed the
 * insertion offset with `headMatch[0].length + 5` instead of
 * `headMatch.index + headMatch[0].length`. That corrupted the doctype of all
 * 1,824 hymn pages and bounced readers straight back to the library. It is
 * now read-only apart from writing dist/index.html: hymn pages must never
 * redirect away from themselves.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist');
const hymnDir = join(DIST, 'hymn');

if (!existsSync(hymnDir)) {
  console.error('No hymn folder found. Run `node scripts/create-web.mjs` first.');
  process.exit(1);
}

const hymnFolders = readdirSync(hymnDir).sort();
let missing = 0;
let corrupted = 0;

for (const folderName of hymnFolders) {
  const indexPath = join(hymnDir, folderName, 'index.html');
  if (!existsSync(indexPath)) {
    missing += 1;
    console.warn(`missing: hymn/${folderName}/index.html`);
    continue;
  }
  const html = readFileSync(indexPath, 'utf8');
  if (!html.startsWith('<!DOCTYPE html>')) {
    corrupted += 1;
    console.warn(`bad doctype: hymn/${folderName}/index.html`);
  }
}

writeFileSync(
  join(DIST, 'index.html'),
  `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="0;url=library.html">
  <title>الترنيمة للرب | Redirecting...</title>
  <style>
    body { font-family: Tahoma, sans-serif; direction: rtl; padding: 50px; text-align: center; background: linear-gradient(135deg, #0A1A14 0%, #1A2E24 100%); color: white; }
    h1 { color: #D4B85F; }
  </style>
</head>
<body>
  <h1>جارٍ التحويل إلى المكتبة...</h1>
  <p>If not redirected, <a href="library.html">click here</a></p>
</body>
</html>`
);

console.log(
  `Checked ${hymnFolders.length} hymn pages: ${missing} missing, ${corrupted} with a bad doctype.`
);
if (missing || corrupted) process.exitCode = 1;
