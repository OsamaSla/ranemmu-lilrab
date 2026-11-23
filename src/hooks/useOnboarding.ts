/**
 * First-run onboarding flag, shared across the whole app.
 *
 * A module-level store (via `useSyncExternalStore`) is used instead of local
 * component state because two screens care about it at once: the root layout
 * decides whether to show the overlay, and the Help screen can replay the tour
 * after it was completed. A plain hook would leave the root layout's copy
 * stale when Help resets the flag.
 *
 * The key lives in AsyncStorage rather than the settings store so replaying
 * the tour never touches reader preferences. `loaded` is reported separately
 * so the root layout can keep the splash screen up until the answer is known.
 * A failed read fails open (`complete: true`) — storage problems must never
 * trap a returning reader behind the overlay.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useSyncExternalStore } from 'react';

const ONBOARDING_KEY = 'ranemmu.onboarding.v1';

interface OnboardingState {
  loaded: boolean;
  complete: boolean;
}

let state: OnboardingState = { loaded: false, complete: false };
const listeners = new Set<() => void>();

function emit(next: Partial<OnboardingState>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!state.loaded) {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((value) => emit({ loaded: true, complete: value === 'true' }))
      .catch(() => emit({ loaded: true, complete: true }));
  }
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

export function useOnboarding() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const complete = useCallback(() => {
    emit({ loaded: true, complete: true });
    void AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => {});
  }, []);

  const replay = useCallback(() => {
    emit({ loaded: true, complete: false });
    void AsyncStorage.removeItem(ONBOARDING_KEY).catch(() => {});
  }, []);

  return {
    loaded: snapshot.loaded,
    isComplete: snapshot.complete,
    complete,
    replay,
  };
}
