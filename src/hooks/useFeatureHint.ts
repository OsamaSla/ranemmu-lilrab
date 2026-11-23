/**
 * Per-feature "seen it" counters for the contextual coach hints.
 *
 * Each hint is allowed to appear at most `MAX_SHOWS` times. The count is kept
 * in AsyncStorage (not the settings store) so a hint can be reset without
 * disturbing user preferences, and so a returning reader stops seeing it even
 * after a reload.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY_PREFIX = 'ranemmu.hint.';
const MAX_SHOWS = 3;

export function useFeatureHint(id: string) {
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(KEY_PREFIX + id)
      .then((raw) => {
        if (cancelled) return;
        const count = Number.parseInt(raw ?? '0', 10) || 0;
        setVisible(count < MAX_SHOWS);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const dismiss = useCallback(() => {
    setVisible(false);
    AsyncStorage.getItem(KEY_PREFIX + id)
      .then((raw) => {
        const count = (Number.parseInt(raw ?? '0', 10) || 0) + 1;
        return AsyncStorage.setItem(KEY_PREFIX + id, String(count));
      })
      .catch(() => {});
  }, [id]);

  return { visible, loaded, dismiss };
}
