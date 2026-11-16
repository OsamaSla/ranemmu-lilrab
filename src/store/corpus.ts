/**
 * One version counter for every derived view of the hymn corpus.
 *
 * The corpus is a mutable cache: bundled chunks load on demand, admin
 * overrides are merged in, and remote patches stream in from Firestore.
 * Screens used to subscribe to the overrides/remote stores' own `updatedAt`
 * and keep local `setChunksVersion` state just to re-read that cache — easy to
 * forget one source, and noisy with `eslint-disable` comments.
 *
 * All three sources now funnel through `refreshOverlaidCorpus()` (or, for the
 * lazily imported search index, `bumpCorpusVersion()` directly). A screen
 * calls `useCorpusVersion()` and puts the value in its memo deps; the counter
 * changing is the single signal that a synchronous `getSummaries()` /
 * `getHymn()` / `getCorpus()` read may now return something different.
 *
 * Kept dependency-free on purpose: loader and search import `bumpCorpusVersion`
 * from here, so this module must not import either of them (module cycle).
 */
import { useSyncExternalStore } from 'react';

let version = 0;
const listeners = new Set<() => void>();

/** Call whenever the merged corpus (or the search index derived from it) changes. */
export function bumpCorpusVersion(): void {
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): number {
  return version;
}

/** Subscribes the calling screen to corpus invalidations. */
export function useCorpusVersion(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
