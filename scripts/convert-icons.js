/**
 * Convert JPG icons to PNG format for Expo EAS builds
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets', 'images');

// Read the JPG files
const jpg192 = await readFile(join(ASSETS, '192.jpg'));
const jpg512 = await readFile(join(ASSETS, '512.jpg'));

// Write as PNG with proper naming
await writeFile(join(ASSETS, 'icon-192.png'), jpg192);
await writeFile(join(ASSETS, 'icon-512.png'), jpg512);

console.log('✅ Converted 192.jpg → icon-192.png');
console.log('✅ Converted 512.jpg → icon-512.png');
console.log('📁 Save location:', ASSETS);
