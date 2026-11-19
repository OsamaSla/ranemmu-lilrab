/**
 * Stanza-rail scroll tracking for the hymn reader.
 *
 * Extracted from ReaderScreen so the rail, the verse blocks and the quick-fix
 * sheet share one measurement store. The store is tagged with the hymn id it
 * was measured for: the first `onLayout` of a new hymn resets it, because
 * reused React Native views do not always re-fire `onLayout` after next/prev
 * navigation and a clear-in-effect raced with that first measurement.
 *
 * The active stanza is the one whose **centre** is closest to the centre of
 * the reading area (not its top edge), and scrolling settles by snapping that
 * stanza back to the centre. A rail tap does the same immediately. This keeps
 * the highlighted stanza on screen while the reader moves through a hymn;
 * the hysteresis in `onReaderScroll` means you must cross the midpoint before
 * the highlight steps into the next or previous stanza.
 *
 * `onReaderScroll` is a plain prop, never `scrollRef.addListener(...)` — the
 * latter is native-only and crashed react-native-web with
 * "e.addListener is not a function".
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from 'react-native';

import type { Hymn } from '../data/types';

interface StanzaLayout {
  y: number;
  height: number;
}

export interface VerseScroll {
  scrollRef: React.RefObject<ScrollView | null>;
  activeVerseIndex: number | null;
  onReaderScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Scrolls a stanza to the centre of the reading area and highlights it. */
  scrollToVerse: (verseIndex: number) => void;
  onVerseLayout: (verseIndex: number) => (event: LayoutChangeEvent) => void;
  onScrollViewLayout: (event: LayoutChangeEvent) => void;
  onLineLayout: (verseIndex: number, lineIndex: number) => (event: LayoutChangeEvent) => void;
  /** Absolute y of a stanza, for positioning the quick-fix sheet's target line. */
  stanzaOffset: (verseIndex: number) => number | undefined;
  lineOffsets: React.RefObject<Map<string, number>>;
  scrollY: React.RefObject<number>;
}

/** A stanza must be this much closer than the current one to take over. */
const HYSTERESIS = 24;
/** Quiet period after the last scroll event before snapping to centre. */
const SNAP_DELAY = 180;
/** Window in which our own animated scroll is ignored (no feedback loops). */
const SETTLE_MS = 550;
/**
 * Past the last stanza the reader holds content (the translation notice and
 * «ترنيمات مشابهة»). Once the reading centre crosses this far below the last
 * stanza, snapping is suspended so that content stays reachable; scrolling
 * back up past the exit threshold re-arms it.
 */
const TRAILING_ENTER = 40;
const TRAILING_EXIT = 24;

export function useVerseScroll(
  id: string | undefined,
  hymn: Hymn | undefined,
  verse: string | undefined,
): VerseScroll {
  const scrollRef = useRef<ScrollView>(null);
  const verseOffsets = useRef<{ hymnId: string; layouts: Map<number, StanzaLayout> }>({
    hymnId: '',
    layouts: new Map(),
  });
  const lineOffsets = useRef(new Map<string, number>());
  const scrollY = useRef(0);
  // The ScrollView's own height is the reading area (header and tab bar
  // excluded). Until its first onLayout, the window height is close enough.
  const viewportHeight = useRef(Dimensions.get('window').height);
  const activeIndexRef = useRef<number | null>(null);
  // True while the reader is scrolled into the content after the last stanza.
  const trailingRef = useRef(false);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A rail tap or a snap scrolls with an animation; the events it emits would
  // otherwise walk the highlight through every stanza it flies past.
  const settleUntilRef = useRef(0);
  const [activeVerseIndex, setActiveVerseIndex] = useState<number | null>(null);

  const setActive = useCallback((index: number | null) => {
    activeIndexRef.current = index;
    setActiveVerseIndex(index);
  }, []);

  // The reader component survives next/prev navigation (only the inner
  // ScrollView is keyed by hymn id), so the previous hymn's dot must be reset.
  useEffect(() => {
    settleUntilRef.current = 0;
    trailingRef.current = false;
    if (snapTimer.current) clearTimeout(snapTimer.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(null);
  }, [id, setActive]);

  useEffect(
    () => () => {
      if (snapTimer.current) clearTimeout(snapTimer.current);
    },
    [],
  );

  const centreOf = (layout: StanzaLayout) => layout.y + layout.height / 2;

  const targetFor = useCallback((verseIndex: number) => {
    const store = verseOffsets.current;
    const layout = store.layouts.get(verseIndex);
    if (!layout) return undefined;
    return Math.max(0, centreOf(layout) - viewportHeight.current / 2);
  }, []);

  const nearestTo = useCallback((offset: number) => {
    const store = verseOffsets.current;
    const anchor = offset + viewportHeight.current / 2;
    let best: number | undefined;
    let bestDiff = Infinity;
    store.layouts.forEach((layout, index) => {
      const diff = Math.abs(centreOf(layout) - anchor);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = index;
      }
    });
    return { index: best, anchor };
  }, []);

  const scheduleSnap = useCallback(() => {
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      snapTimer.current = null;
      if (Date.now() < settleUntilRef.current) return;
      const index = activeIndexRef.current;
      if (index === null) return;
      const y = targetFor(index);
      if (y === undefined) return;
      settleUntilRef.current = Date.now() + SETTLE_MS;
      scrollRef.current?.scrollTo({ y, animated: true });
    }, SNAP_DELAY);
  }, [targetFor]);

  const onReaderScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const yOffset = event.nativeEvent.contentOffset.y;
      scrollY.current = yOffset;
      const store = verseOffsets.current;
      // Suspend snapping once the reading centre passes the last stanza, so
      // the translation notice and «ترنيمات مشابهة» below it stay reachable.
      const lastLayout =
        hymn && store.hymnId === id ? store.layouts.get(hymn.verses.length - 1) : undefined;
      if (lastLayout) {
        const anchor = yOffset + viewportHeight.current / 2;
        const lastCentre = centreOf(lastLayout);
        if (anchor > lastCentre + TRAILING_ENTER) trailingRef.current = true;
        else if (anchor < lastCentre - TRAILING_EXIT) trailingRef.current = false;
      }
      if (trailingRef.current) {
        if (snapTimer.current) {
          clearTimeout(snapTimer.current);
          snapTimer.current = null;
        }
        return;
      }
      // Keep tracking the offset for the line-fix sheet, but ignore the
      // animated scroll we just started (it must not move the highlight).
      if (Date.now() < settleUntilRef.current) return;
      if (!hymn) return;
      if (store.hymnId !== id) return;
      const { index: nearest, anchor } = nearestTo(yOffset);
      if (nearest === undefined) return;
      const current = activeIndexRef.current;
      if (current === null) {
        setActive(nearest);
      } else {
        const currentLayout = store.layouts.get(current);
        const nearestLayout = store.layouts.get(nearest);
        if (!currentLayout || !nearestLayout) return;
        // Hold the current stanza until another is clearly nearer the centre.
        if (Math.abs(centreOf(nearestLayout) - anchor) + HYSTERESIS < Math.abs(centreOf(currentLayout) - anchor)) {
          setActive(nearest);
        }
      }
      scheduleSnap();
    },
    [hymn, id, nearestTo, scheduleSnap, setActive],
  );

  const scrollToVerse = useCallback(
    (verseIndex: number) => {
      const store = verseOffsets.current;
      if (store.hymnId !== id) return;
      const y = targetFor(verseIndex);
      if (y === undefined) return;
      if (snapTimer.current) {
        clearTimeout(snapTimer.current);
        snapTimer.current = null;
      }
      // An explicit rail tap always means "go back to a stanza".
      trailingRef.current = false;
      settleUntilRef.current = Date.now() + SETTLE_MS;
      setActive(verseIndex);
      scrollRef.current?.scrollTo({ y, animated: true });
    },
    [id, setActive, targetFor],
  );

  const onVerseLayout = useCallback(
    (verseIndex: number) => (event: LayoutChangeEvent) => {
      const store = verseOffsets.current;
      if (store.hymnId !== id) {
        store.hymnId = id ?? '';
        store.layouts = new Map();
      }
      store.layouts.set(verseIndex, {
        y: event.nativeEvent.layout.y,
        height: event.nativeEvent.layout.height,
      });
    },
    [id],
  );

  const onScrollViewLayout = useCallback((event: LayoutChangeEvent) => {
    viewportHeight.current = event.nativeEvent.layout.height;
  }, []);

  const onLineLayout = useCallback(
    (verseIndex: number, lineIndex: number) => (event: LayoutChangeEvent) => {
      lineOffsets.current.set(`${id}:${verseIndex}:${lineIndex}`, event.nativeEvent.layout.y);
    },
    [id],
  );

  const stanzaOffset = useCallback(
    (verseIndex: number) => {
      const store = verseOffsets.current;
      return store.hymnId === id ? store.layouts.get(verseIndex)?.y : undefined;
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
    onScrollViewLayout,
    onLineLayout,
    stanzaOffset,
    lineOffsets,
    scrollY,
  };
}
