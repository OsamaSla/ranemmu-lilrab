/**
 * Publishes the assembled book 3 corpus into the app's content root.
 *
 * `scripts/book3/build-book3.mjs` writes content/book3/book3.json, which the
 * corpus builder deliberately ignores (content/*.json is top-level only) so a
 * half-finished book never ships by accident. Running this step is the explicit
 * "book 3 is ready" switch.
 *
 * Usage: npm run book3:publish
 */
import { copyFileSync, existsSync, readFileSync } from 'node:fs';

const SRC = 'content/book3/book3.json';
const DEST = 'content/book3.json';

if (!existsSync(SRC)) {
  console.error(`missing ${SRC} — run: npm run book3:build`);
  process.exit(1);
}

const data = JSON.parse(readFileSync(SRC, 'utf8'));
const hymns = data.hymns ?? [];
const numbers = hymns.map((h) => h.number);
const max = numbers.length ? Math.max(...numbers) : 0;
const missing = [];
for (let n = 1; n <= 402; n += 1) if (!numbers.includes(n)) missing.push(n);

if (missing.length > 0) {
  console.error(`refusing to publish: ${missing.length} hymn(s) missing (e.g. ${missing.slice(0, 12).join(', ')})`);
  process.exit(1);
}

copyFileSync(SRC, DEST);
console.log(`published ${hymns.length} hymns (1..${max}) -> ${DEST}`);
console.log('next: npm run build:corpus && npm run typecheck');
