#!/usr/bin/env node
/**
 * Per-page canonical URLs for the static export.
 *
 * Firebase Hosting (https://ranemmu-lilrab.web.app) is the canonical origin;
 * the GitHub Pages copy is a mirror of it. Two live URLs for the same hymn
 * split search ranking and confuse anyone deciding which link to share, so
 * every exported page gets:
 *
 *   <link rel="canonical" href="https://ranemmu-lilrab.web.app<route>">
 *
 * The route is derived from the exported file path, so it stays correct as
 * routes are added:
 *
 *   index.html            -> /
 *   more.html             -> /more
 *   hymn/tr0001.html      -> /hymn/tr0001
 *   hymn/some/index.html  -> /hymn/some
 *
 * Only pages loading the Expo entry bundle are touched (static documents in
 * public/, and the Pages 404.html shell, are left alone). Idempotent: an
 * existing canonical tag is replaced rather than duplicated.
 *
 * Run after `expo export -p web`, before the Pages SPA-fallback copy.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const ORIGIN = (process.env.CANONICAL_ORIGIN || 'https://ranemmu-lilrab.web.app').replace(/\/+$/, '');

// The SPA fallback is a copy of index.html: its static canonical would point
// at "/" for every deep link. src/app/+html.tsx corrects it at runtime.
const SKIP = new Set(['404.html']);

const TAG = /<link[^>]*rel=["']canonical["'][^>]*>/i;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

function routeOf(file) {
  const rel = relative(DIST, file).split(sep).join('/').replace(/\.html$/, '');
  if (rel === 'index') return '/';
  if (rel.endsWith('/index')) return `/${rel.slice(0, -'/index'.length)}`;
  return `/${rel}`;
}

let touched = 0;
for (const file of walk(DIST)) {
  if (SKIP.has(relative(DIST, file).split(sep).join('/'))) continue;

  const html = readFileSync(file, 'utf8');
  // Skip static documents copied from public/ — they are not app routes.
  if (!html.includes('/_expo/static/js/')) continue;
  if (!html.includes('</head>')) {
    console.error(`canonical: ${file} has no </head> — skipped`);
    continue;
  }

  const tag = `<link rel="canonical" href="${ORIGIN}${routeOf(file)}"/>`;
  const next = TAG.test(html)
    ? html.replace(TAG, tag)
    : html.replace('</head>', `    ${tag}\n  </head>`);

  if (next !== html) {
    writeFileSync(file, next);
    touched += 1;
  }
}

console.log(`canonical: linked ${touched} page(s) to ${ORIGIN}`);
