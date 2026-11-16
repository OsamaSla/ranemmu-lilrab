/**
 * Stanza-rail scroll tracking for the hymn reader.
 *
 * Extracted from ReaderScreen so the rail, the verse blocks and the quick-fix
 * sheet share one measurement store. The store is tagged with the hymn id it
 * was measured for: the first `onLayout` of a new hymn resets it, because
 * reused React Native views do not always re-fire `onLayout` after next/prev
 * navigation and a clear-in-effect raced with that first measurement.
 *
 * `onReaderScroll` is a plain prop, never `scrollRef.addListener(...)` — the
 * latter is native-only and crashed react-native-web with
 * "e.addListener is not a function".
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';

import type { Hymn } from '../data/types';
import { spacing } from '../theme/tokens';

export interface VerseScroll {
  scrollRef: React.RefObject<ScrollView | null>;
  activeVerseIndex: number | null;
  onReaderScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollToVerse: (verseIndex: number) => void;
  onVerseLayout: (verseIndex: number) => (event: LayoutChangeEvent) => void;
  onLineLayout: (verseIndex: number, lineIndex: number) => (event: LayoutChangeEvent) => void;
  /** Absolute y of a stanza, for positioning the quick-fix sheet's target line. */
  stanzaOffset: (verseIndex: number) => number | undefined;
  lineOffsets: React.RefObject<Map<string, number>>;
  scrollY: React.RefObject<number>;
}

export function useVerseScroll(
  id: string | undefined,
  hymn: Hymn | undefined,
  verse: string | undefined,
): VerseScroll {
  const scrollRef = useRef<ScrollView>(null);
  const verseOffsets = useRef<{ hymnId: string; offsets: Map<number, number> }>({
    hymnId: '',
    offsets: new Map(),
  });
  const lineOffsets = useRef(new Map<string, number>());
  const scrollY = useRef(0);
  const [activeVerseIndex, setActiveVerseIndex] = useState<number | null>(null);

  // The reader component survives next/prev navigation (only the inner
  // ScrollView is keyed by hymn id), so the previous hymn's dot must be reset.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveVerseIndex(null);
  }, [id]);

  const onReaderScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const yOffset = event.nativeEvent.contentOffset.y;
      scrollY.current = yOffset;
      if (!hymn) return;
      const store = verseOffsets.current;
      if (store.hymnId !== id) return;
      let closestIndex = 0;
      let minDiff = Infinity;

      hymn.verses.forEach((_, index) => {
        const offset = store.offsets.get(index);
        if (offset !== undefined) {
          const diff = Math.abs(offset - yOffset);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = index;
          }
        }
      });

      if (minDiff < 100) {
        setActiveVerseIndex((current) => (current === closestIndex ? current : closestIndex));
      }
    },
    [hymn, id],
  );

  const scrollToVerse = useCallback(
    (verseIndex: number) => {
      const store = verseOffsets.current;
      if (store.hymnId !== id) return;
      const y = store.offsets.get(verseIndex);
      if (y !== undefined) {
        setActiveVerseIndex(verseIndex);
        scrollRef.current?.scrollTo({ y: Math.max(0, y - spacing.lg), animated: true });
      }
    },
    [id],
  );

  const onVerseLayout = useCallback(
    (verseIndex: number) => (event: LayoutChangeEvent) => {
      const store = verseOffsets.current;
      if (store.hymnId !== id) {
        store.hymnId = id ?? '';
        store.offsets = new Map();
      }
      store.offsets.set(verseIndex, event.nativeEvent.layout.y);
    },
    [id],
  );

  const onLineLayout = useCallback(
    (verseIndex: number, lineIndex: number) => (event: LayoutChangeEvent) => {
      lineOffsets.current.set(`${id}:${verseIndex}:${lineIndex}`, event.nativeEvent.layout.y);
    },
    [id],
  );

  const stanzaOffset = useCallback(
    (verseIndex: number) => {
      const store = verseOffsets.current;
      return store.hymnId === id ? store.offsets.get(verseIndex) : undefined;
    },
    [id],
  );

  // `?verse=n` deep link: wait for the keyed ScrollView's onLayout to land.
  // `hasHymn` flips when the lazily imported chunk resolves, and `id` changes
  // on next/prev navigation — both must re-arm the timer.
  const hasHymn = hymn !== undefined;
  useEffect(() => {
    if (verse === undefined || !hasHymn) return;
    const target = Number.parseInt(verse, 10);
    if (Number.isNaN(target)) return;
    const timer = setTimeout(() => scrollToVerse(target), 350);
    return () => clearTimeout(timer);
  }, [verse, hasHymn, id, scrollToVerse]);

  return {
    scrollRef,
    activeVerseIndex,
    onReaderScroll,
    scrollToVerse,
    onVerseLayout,
    onLineLayout,
    stanzaOffset,
    lineOffsets,
    scrollY,
  };
}
