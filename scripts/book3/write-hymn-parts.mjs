/**
 * write-hymn-parts.mjs
 * 
 * Writes one or more hymn objects to individual part files in content/book3/parts/.
 * Called by the vision-based transcription pipeline.
 * 
 * Usage:
 *   node scripts/book3/write-hymn-parts.mjs <json-file>
 * 
 * The JSON file should contain an array of hymn objects:
 * [
 *   {
 *     "number": 1,
 *     "title": "...",
 *     "verses": [
 *       { "label": "1", "lines": ["line1", "line2", ...], "chorus": false },
 *       { "label": "القرار", "lines": [...], "chorus": true }
 *     ],
 *     "meter": ""
 *   }
 * ]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PARTS_DIR = 'content/book3/parts';

if (!existsSync(PARTS_DIR)) mkdirSync(PARTS_DIR, { recursive: true });

const inputFile = process.argv[2];
if (!inputFile) throw new Error('usage: node write-hymn-parts.mjs <json-file>');

const hymns = JSON.parse(readFileSync(inputFile, 'utf8'));
const list = Array.isArray(hymns) ? hymns : [hymns];

for (const hymn of list) {
  if (!hymn.number) throw new Error(`hymn missing number: ${JSON.stringify(hymn)}`);
  
  const fileName = `b3${String(hymn.number).padStart(4, '0')}.json`;
  const filePath = join(PARTS_DIR, fileName);
  
  const partData = {
    hymns: [{
      number: hymn.number,
      title: hymn.title || '',
      verses: (hymn.verses || []).map(v => ({
        label: v.label || '1',
        ...(v.chorus ? { chorus: true } : {}),
        lines: v.lines || [],
      })),
      meter: hymn.meter || '',
      book: 'book3',
    }]
  };
  
  writeFileSync(filePath, JSON.stringify(partData, null, 2) + '\n', 'utf8');
  console.log(`wrote: ${filePath} (hymn ${hymn.number}: ${hymn.title?.substring(0, 40)})`);
}

console.log(`\nTotal hymns written: ${list.length}`);
