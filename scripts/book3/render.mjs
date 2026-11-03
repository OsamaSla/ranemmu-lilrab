const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Phase 0: render 1-401.pdf spread pages at 400 DPI + split halves
// Run from repo root: node scripts/book3/render.mjs

const ROOT = path.resolve('.');
const PDF_PATH = path.join(ROOT, 'assets', '1-401.pdf');
const INDEX_PDF = path.join(ROOT, 'assets', '1-402-index.pdf');
const PAGE_DIR = path.join(ROOT, 'assets', 'book3', 'pages');
const META_FILE = path.join(PAGE_DIR, '.meta.json');

console.log('=== Book3 Phase0 render ===');
console.log('Source PDF:', PDF_PATH);
console.log('Index PDF:', fs.existsSync(INDEX_PDF) ? 'PRESENT' : 'MISSING');
console.log('Page out dir:', PAGE_DIR);
console.log('Script path:', __filename);
console.log('Root check:', fs.existsSync('content/book3/AGENTS.md') ? 'AGENTS.md OK' : 'MISSING AGENTS.md');
console.log('Pages rendered: 0/145 (script scaffold only — real render needs PyMuPDF)');
