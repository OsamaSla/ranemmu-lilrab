#!/usr/bin/env node
/**
 * PWA head injection. Run after `expo export --platform web` (alongside
 * pages-fallback.mjs) as a backfill for any page missing PWA tags.
 * The primary source of truth is src/app/+html.tsx; this script only
 * touches pages without a manifest link.
 * Idempotent: pages already carrying a manifest link are left untouched.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const BASE = '/ranemmu-lilrab';

const TAGS = [
  '<!--pwa-head-->',
  `<link rel="manifest" href="${BASE}/manifest.json">`,
  `<link rel="icon" type="image/png" sizes="192x192" href="${BASE}/assets/images/icon-192.png">`,
  `<link rel="icon" type="image/png" sizes="512x512" href="${BASE}/assets/images/icon-512.png">`,
  '<meta name="theme-color" content="#D4B85F">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<meta name="apple-mobile-web-app-title" content="الترانيم">',
  '<script>if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/ranemmu-lilrab/sw.js",{scope:"/ranemmu-lilrab/"});});}<\/script>',
].join('\n    ');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

let touched = 0;
for (const file of walk(DIST)) {
  const html = readFileSync(file, 'utf8');
  if (html.includes('pwa-head')) continue;
  if (html.includes('rel="manifest"')) continue;
  if (!html.includes('</head>')) {
    console.error(`pwa-head: ${file} has no </head> — skipped`);
    continue;
  }
  writeFileSync(file, html.replace('</head>', `    ${TAGS}\n  </head>`));
  touched += 1;
}
console.log(`pwa-head: injected PWA tags into ${touched} page(s)`);
