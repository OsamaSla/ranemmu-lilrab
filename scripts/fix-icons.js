/**
 * Properly convert JPG icons to PNG by re-encoding (required for EAS builds)
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets', 'images');

// Convert 192.jpg → icon-192.png
await sharp(join(ASSETS, '192.jpg'))
  .png()
  .toFile(join(ASSETS, 'icon-192.png'));

// Convert 512.jpg → icon-512.png  
await sharp(join(ASSETS, '512.jpg'))
  .png()
  .toFile(join(ASSETS, 'icon-512.png'));

console.log('✅ 192.jpg → icon-192.png (PNG encoded)');
console.log('✅ 512.jpg → icon-512.png (PNG encoded)');
console.log('📁 Files ready in:', ASSETS);
