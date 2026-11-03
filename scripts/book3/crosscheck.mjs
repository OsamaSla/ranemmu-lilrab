/**
 * Cross-check: compare new book3 hymns against main + taranim.
 * For any match by normalized first-line, prints the source hymn id
 * so it can be copied exactly (avoiding re-transcription errors).
 */
import { readFileSync } from 'node:fs';

function norm(t) { return t.toLowerCase().replace(/[\u064B-\u065F\u0670]/g, '').replace(/\s+/g, ' ').trim(); }

const main = JSON.parse(readFileSync('content/main.json', 'utf8'));
const taranim = JSON.parse(readFileSync('content/taranim.json', 'utf8'));
const book3 = JSON.parse(readFileSync('content/book3/book3.json', 'utf8'));

function indexSource(hymns) {
  return new Map(hymns.map(h => {
    const firstLine = (h.verses?.[0]?.lines?.[0] ?? '').toString();
    return [norm(firstLine.split(' · ')[0] || h.title || ''), { id: h.id, number: h.number, title: h.title }];
  }));
}

const mainIdx = indexSource(main.hymns);
const tarIdx = indexSource(taranim.hymns);

console.log('=== Cross-check: book3 vs main + taranim ===');
for (const h of book3.hymns) {
  const first = (h.verses?.[0]?.lines?.[0] ?? '').toString();
  const key = norm(first.split(' · ')[0] || h.title || '');
  if (!key) continue;
  const m = mainIdx.get(key);
  const t = tarIdx.get(key);
  if (m || t) {
    console.log(`MATCH hymn ${h.number} ("${h.title}")`);
    if (m) console.log('  -> main:', m.id, 'n=', m.number, 'title=', m.title);
    if (t) console.log('  -> taranim:', t.id, 'n=', t.number, 'title=', t.title);
  }
}
