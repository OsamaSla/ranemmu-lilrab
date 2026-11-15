/**
 * Keeps a hand-authored translation attached to the stanza it belongs to.
 *
 * The reader pairs `verses[i]` with `verses_xx[i]` positionally, and the
 * bundled corpus ships both in the same order. Admin edits, however, arrive as
 * an override patch: moving a stanza or flagging a refrain rewrites
 * `patch.verses` while `verses_he` (forwarded by scripts/hebrew-apply.mjs and
 * never touched by an editor that does not edit Hebrew) keeps the *bundled*
 * order. Spreading the patch over the record then pairs every Hebrew stanza
 * with the wrong Arabic one — observed on Book 2 after a reorder, where the
 * reader showed fluent Hebrew against the wrong stanza.
 *
 * Realigning here rather than in the editor means an override saved by an
 * older build (or from another device, or already published to Firestore)
 * fixes itself on read, with no migration and no stored-data rewrite.
 *
 * Matching is by stanza text, not by index or label:
 * - labels are renumbered when a refrain is defined, so they cannot identify a
 *   stanza;
 * - text survives a move untouched, which is exactly the edit being undone.
 * A stanza whose text was also edited still matches by shared lines, and
 * anything left over keeps its source order.
 */
import type { HymnVerse } from './types';

const normalise = (line: string) => line.replace(/\s+/g, ' ').trim();

/** Whole-stanza key: equal only when every line survived verbatim. */
function stanzaKey(lines: string[]): string {
  return lines.map(normalise).filter(Boolean).join('\n');
}

/** Share of lines the two stanzas have in common (0…1). */
function overlap(a: string[], b: string[]): number {
  const left = a.map(normalise).filter(Boolean);
  const right = new Set(b.map(normalise).filter(Boolean));
  if (left.length === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const line of left) if (right.has(line)) shared += 1;
  return shared / Math.max(left.length, b.length);
}

/**
 * Reorders `translation` so index *i* belongs to `target[i]`.
 *
 * `source` is the Arabic stanza list the translation was authored against
 * (the bundled record) and `target` is the edited list. When the two cannot be
 * reconciled the translation is returned untouched, which is the previous
 * behaviour — a wrong guess would be worse than the old positional pairing.
 */
export function alignTranslation(
  source: HymnVerse[],
  translation: HymnVerse[] | undefined,
  target: HymnVerse[],
): HymnVerse[] | undefined {
  if (!translation?.length) return translation;
  if (translation.length !== source.length || translation.length !== target.length) {
    return translation;
  }

  const count = target.length;
  const sourceKeys = source.map((verse) => stanzaKey(verse.lines));
  const taken = new Array<boolean>(count).fill(false);
  const pick = new Array<number>(count).fill(-1);

  // 1. Text identical and unambiguous: the normal case for a move.
  for (let i = 0; i < count; i += 1) {
    const key = stanzaKey(target[i].lines);
    const matches: number[] = [];
    for (let j = 0; j < count; j += 1) {
      if (!taken[j] && sourceKeys[j] === key) matches.push(j);
    }
    if (matches.length === 1) {
      pick[i] = matches[0];
      taken[matches[0]] = true;
    }
  }

  // 2. Stanza moved *and* a line edited: best shared-line overlap wins, but
  //    only when most of the text still agrees.
  for (let i = 0; i < count; i += 1) {
    if (pick[i] >= 0) continue;
    let best = -1;
    let bestScore = 0.5;
    for (let j = 0; j < count; j += 1) {
      if (taken[j]) continue;
      const score = overlap(target[i].lines, source[j].lines);
      if (score > bestScore) {
        bestScore = score;
        best = j;
      }
    }
    if (best >= 0) {
      pick[i] = best;
      taken[best] = true;
    }
  }

  // 3. Whatever is left keeps the source order.
  const leftovers: number[] = [];
  for (let j = 0; j < count; j += 1) if (!taken[j]) leftovers.push(j);
  let cursor = 0;
  for (let i = 0; i < count; i += 1) {
    if (pick[i] >= 0) continue;
    pick[i] = leftovers[cursor];
    cursor += 1;
  }

  // Labels and refrain flags are the *edited* record's, so a copy written back
  // by the admin editor matches the Arabic grid instead of reintroducing the
  // pre-edit numbering.
  return pick.map((j, i) => ({
    ...translation[j],
    label: target[i].label,
    chorus: target[i].chorus ? true : undefined,
  }));
}
