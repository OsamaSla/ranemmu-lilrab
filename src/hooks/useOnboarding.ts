/**
 * On-demand tour state, shared across the whole app.
 *
 * The tour used to open by itself on first launch and remember completion in
 * AsyncStorage. It no longer starts automatically — the app opens straight on
 * the home screen — and is opened from «تعرّف على التطبيق» on the Help screen
 * instead. Nothing is persisted, so every launch starts with it closed.
 *
 * A module-level store (via `useSyncExternalStore`) is used instead of local
 * component state because two screens care about it at once: the root layout
 * decides whether to render the overlay, and the Help screen opens it. A plain
 * hook would leave the root layout's copy stale when Help opens the tour.
 */
import { useCallback, useSyncExternalStore } from 'react';

let open = false;
const listeners = new Set<() => void>();

function setOpen(next: boolean) {
  if (open === next) return;
  open = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return open;
}

export function useOnboarding() {
  const isOpen = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const start = useCallback(() => setOpen(true), []);
  const complete = useCallback(() => setOpen(false), []);

  return { isOpen, start, complete };
}
