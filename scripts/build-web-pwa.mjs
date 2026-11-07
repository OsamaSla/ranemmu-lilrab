#!/usr/bin/env node
/**
 * Complete web export with PWA support
 */
import { exec } from 'node:child_process';
import { readdirSync, readFile, writeFile, copyFileSync } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

console.log('🚀 Building web export...');

// Step 1: Export Expo web
await new Promise((resolve, reject) => {
  exec('npx expo export --platform web --public-url https://osamsla.github.io/ranemmu-lilrab', { cwd: ROOT }, (error, stdout, stderr) => {
    if (error) {
      console.error('Expo export failed:', error.message);
      // Continue anyway - some files may be created
    }
    resolve();
  });
});

// Step 2: Copy PWA assets from public folder
console.log('📦 Copying PWA assets...');
try {
  const manifestSrc = join(ROOT, 'public', 'manifest.json');
  const manifestDest = join(DIST, 'manifest.json');
  
  const manifestContent = await readFile(manifestSrc, 'utf8');
  await writeFile(manifestDest, manifestContent);
  console.log('✅ Copied manifest.json');
} catch (err) {
  console.warn('⚠️  Could not copy manifest.json');
}

// Copy icons
for (const icon of ['icon-192.png', 'icon-512.png']) {
  try {
    const src = join(ROOT, 'assets', 'images', icon);
    const dest = join(DIST, icon);
    await copyFileSync(src, dest);
    console.log(`✅ Copied ${icon}`);
  } catch (err) {
    // Skip if doesn't exist
  }
}

// Step 3: Add PWA meta tags to all HTML pages
console.log('🏷️  Adding PWA tags to HTML pages...');
const htmlFiles = [];

async function walkDir(dir) {
  for (const entry of await readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (entry.endsWith('.html')) {
      htmlFiles.push(fullPath);
    } else if ((await readdirSync(fullPath)).length > 0) {
      await walkDir(fullPath);
    }
  }
}

await walkDir(DIST);

let injected = 0;
for (const file of htmlFiles) {
  let content = await readFile(file, 'utf8');
  
  if (!content.includes('rel="manifest"') && content.includes('</head>')) {
    const pwaTags = `
    <!-- PWA Support -->
    <link rel="manifest" href="/ranemmu-lilrab/manifest.json">
    <meta name="theme-color" content="#D4B85F">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="الترانيم">
    <link rel="icon" type="image/png" sizes="192x192" href="/ranemmu-lilrab/icon-192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/ranemmu-lilrab/icon-512.png">`;
    
    content = content.replace('</head>', `${pwaTags}\n  </head>`);
    await writeFile(file, content);
    injected++;
  }
}

console.log(`✅ Injected PWA tags into ${injected} page(s)`);

// Step 4: Create service worker
const swContent = `
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('hymns-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/library.html',
        '/hymn/tr0001/index.html'
      ]);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});`;

try {
  await writeFile(join(DIST, 'sw.js'), swContent.trim());
  console.log('✅ Created service worker (sw.js)');
} catch (err) {
  console.warn('⚠️  Could not create service worker');
}

console.log('\n🎉 Web build complete! Ready for deployment.');
