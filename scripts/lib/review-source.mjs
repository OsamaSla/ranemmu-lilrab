/**
 * Hymn source loading for the review-sheet pipeline.
 *
 * Firebase holds live review state but only as patches (most hymns were
 * never uploaded in full — only admin-edited ones exist there). The local
 * content/*.json files hold the complete bundle. The merged view
 * (bundle + Firebase overlay, exactly like src/data/loader merges at
 * runtime) is therefore the only complete picture, and both the export
 * and the import-diff use it.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ID_PREFIX = { main: 'h', taranim: 'tr' };
export const idFor = (book, number) =>
  `${ID_PREFIX[book] ?? String(book).slice(0, 2)}${String(number).padStart(4, '0')}`;

/** Full bundle from content/*.json, keyed by stable hymn id. */
export function loadLocalCorpus(contentDir) {
  const entries = readdirSync(contentDir)
    .filter((f) => f.endsWith('.json') && f !== 'authors.json')
    .sort();
  const map = new Map();
  for (const name of entries) {
    const raw = JSON.parse(readFileSync(join(contentDir, name), 'utf8'));
    for (const h of Array.isArray(raw) ? raw : (raw.hymns ?? [])) {
      const book = h.book ?? 'main';
      const id = h.id ?? idFor(book, h.number);
      map.set(id, { ...h, book, id });
    }
  }
  return map;
}

/**
 * Overlays raw Firebase documents onto the bundle. Field-level merge —
 * remote wins per hymn (bookkeeping fields dropped). Remote-only
 * documents join when complete enough to stand alone.
 */
export function mergeRemote(localMap, remoteDocs) {
  const merged = new Map(localMap);
  for (const remote of remoteDocs) {
    const { updatedAt: _drop, ...fields } = remote;
    const base = merged.get(remote.id);
    if (base) {
      merged.set(remote.id, { ...base, ...fields });
    } else if (
      Number.isInteger(fields.number) &&
      typeof fields.title === 'string' &&
      Array.isArray(fields.verses) &&
      fields.verses.length > 0
    ) {
      merged.set(remote.id, { book: 'main', ...fields, id: remote.id });
    }
  }
  return merged;
}
