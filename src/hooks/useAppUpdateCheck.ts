/**
 * Keep the installed web app (PWA) on the build that is deployed now.
 *
 * A cold launch already fetches the new HTML (Firebase serves pages with
 * `no-cache` and the service worker is inert), but a standalone window that is
 * only backgrounded can stay alive for days and keep running the old bundle.
 * On every return to the foreground we read the entry script named by the
 * deployed `index.html` and reload when it differs from the one this page
 * loaded. Native builds have no static `index.html` and are updated through
 * the store, so this is web-only.
 *
 * Only the hashed file name is compared: the same bundle is referenced as
 * `/_expo/...` at the domain root and `/ranemmu-lilrab/_expo/...` on Pages, and
 * resolving the path against the origin loses the deploy sub-path.
 *
 * Best-effort by design: an offline check or host error leaves the app alone,
 * and an admin with an unsaved edit is never reloaded.
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';

const ENTRY_MARKER = '/_expo/static/js/web/';
const ENTRY_FILE = /entry-[A-Za-z0-9_-]+\.js/;
// A host that briefly serves two different bundles must not reload in a loop.
const RELOAD_GUARD_KEY = 'app.update.reloadedAt';
const RELOAD_GUARD_MS = 60_000;

let checking = false;

/** The bundle this page is running, plus the app root that serves it. */
function runningBundle(): { root: string; file: string } | null {
  const script = Array.from(document.scripts).find((candidate) =>
    candidate.src.includes(ENTRY_MARKER),
  );
  if (!script) return null;
  // `src` is absolute, so this is the origin plus any deploy sub-path.
  const markerIndex = script.src.indexOf(ENTRY_MARKER);
  const file = ENTRY_FILE.exec(script.src.slice(markerIndex))?.[0];
  return file ? { root: script.src.slice(0, markerIndex), file } : null;
}

/** The bundle the currently deployed `index.html` names. */
async function deployedFile(root: string): Promise<string | null> {
  const response = await fetch(`${root}/index.html`, { cache: 'no-store' });
  if (!response.ok) return null;
  const html = await response.text();
  const markerIndex = html.indexOf(ENTRY_MARKER);
  if (markerIndex === -1) return null;
  return ENTRY_FILE.exec(html.slice(markerIndex))?.[0] ?? null;
}

function mayReload(): boolean {
  if (document.visibilityState !== 'visible') return false;
  // Never throw away an admin's unsaved edit.
  const path = window.location.pathname;
  if (path.includes('/admin-edit') || path.includes('/admin-add')) return false;
  const active = document.activeElement;
  if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return false;
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
    if (Number.isFinite(last) && Date.now() - last < RELOAD_GUARD_MS) return false;
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    // Storage can be unavailable in private mode; the guard is optional.
  }
  return true;
}

export function useAppUpdateCheck(): void {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    let disposed = false;

    const check = async () => {
      if (checking || disposed) return;
      const running = runningBundle();
      if (!running) return;
      checking = true;
      try {
        const deployed = await deployedFile(running.root);
        if (!disposed && deployed && deployed !== running.file && mayReload()) {
          window.location.reload();
        }
      } catch {
        // Offline or a transient host error: keep the current build.
      } finally {
        checking = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void check();
    };
    // Safari restores a backgrounded standalone window from the back/forward
    // cache without a visibility change on some versions.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void check();
    };

    void check();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);
}
