#!/usr/bin/env node
/**
 * GitHub Pages fallback. Run as part of `npm run predeploy` (after export).
 * Copies dist/+not-found.html -> dist/404.html so unknown deep links
 * resolve instead of showing Pages' default 404. Static routes (all 1000
 * hymns) already export as individual HTML files, so no SPA rewrite needed.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(ROOT, 'dist', '+not-found.html');
const dest = join(ROOT, 'dist', '404.html');

if (!existsSync(src)) {
  console.error(`pages-fallback: missing ${src} — export first`);
  process.exit(1);
}
copyFileSync(src, dest);
console.log('pages-fallback: dist/404.html written');
