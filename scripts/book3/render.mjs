import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

const ROOT = resolve('.');
const PDF_PATH = join(ROOT, 'assets', '1-401.pdf');
const INDEX_PDF = join(ROOT, 'assets', '1-402-index.pdf');
const PAGE_DIR = join(ROOT, 'assets', 'book3', 'pages');
const META_FILE = join(PAGE_DIR, '.meta.json');

console.log('=== Book3 Phase0 render ===');
console.log('Source PDF:', PDF_PATH);
console.log('Index PDF:', existsSync(INDEX_PDF) ? 'PRESENT' : 'MISSING');
console.log('Page out dir:', PAGE_DIR);
console.log('Script path:', __filename);
console.log('Root check:', existsSync('content/book3/AGENTS.md') ? 'AGENTS.md OK' : 'MISSING AGENTS.md');
console.log('Pages rendered: 0/145 (script scaffold only — real render needs PyMuPDF)');