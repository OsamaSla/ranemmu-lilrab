#!/usr/bin/env node
/**
 * Copy PWA assets (manifest.json + icons) to dist folder after build
 */
import { readdirSync, readFile, writeFile, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const ASSETS = join(ROOT, 'assets', 'images');

// Copy manifest.json
const manifestSrc = join(ASSETS.replace('images', ''), 'public', 'manifest.json');
const manifestDest = join(DIST, 'manifest.json');

try {
  await writeFile(manifestDest, readFile(manifestSrc, 'utf8'));
  console.log('✅ Copied manifest.json to dist/');
} catch (err) {
  // If public folder doesn't exist yet, just log warning
  console.log('⚠️  Warning: Could not find public/manifest.json - will be created on next deploy');
}

// Copy icons
const icons = [
  ['icon-192.png', 'assets/images/icon-192.png'],
  ['icon-512.png', 'assets/images/icon-512.png']
];

for (const [name, srcPath] of icons) {
  const srcFile = join(ROOT, srcPath);
  const destFile = join(DIST, name);
  
  try {
    copyFileSync(srcFile, destFile);
    console.log(`✅ Copied ${name}`);
  } catch (err) {
    console.warn(`⚠️  Missing icon: ${name} - skip`);
  }
}

console.log('\n🎉 PWA assets ready for deployment!');
