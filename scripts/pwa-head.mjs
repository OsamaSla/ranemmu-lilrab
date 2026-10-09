#!/usr/bin/env node
/**
 * PWA head injection. Run after `expo export --platform web` (alongside
 * pages-fallback.mjs). Expo's static export emits no web manifest, so
 * "Add to Home Screen" installs without a proper icon. This inserts the
 * manifest / touch-icon / theme-color tags into every dist/*.html head.
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
  `<link rel="apple-touch-icon" href="${BASE}/icons/apple-touch-icon.png">`,
  `<link rel="icon" type="image/png" sizes="192x192" href="${BASE}/icons/icon-192.png">`,
  `<link rel="icon" type="image/png" sizes="512x512" href="${BASE}/icons/icon-512.png">`,
  '<meta name="theme-color" content="#184D55">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  '<meta name="apple-mobile-web-app-title" content="رنموا للرب">',
  `<script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('${BASE}/sw.js',{scope:'${BASE}/'});});}</script>`,
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
  if (!html.includes('</head>')) {
    console.error(`pwa-head: ${file} has no </head> — skipped`);
    continue;
  }
  writeFileSync(file, html.replace('</head>', `    ${TAGS}\n  </head>`));
  touched += 1;
}
console.log(`pwa-head: injected PWA tags into ${touched} page(s)`);
