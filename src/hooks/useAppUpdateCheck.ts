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
 * Best-effort by design: an offline check or host error leaves the app alone,
 * and an admin with an unsaved edit is never reloaded.
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';

const ENTRY_PATTERN = /\/_expo\/static\/js\/web\/entry-[A-Za-z0-9_-]+\.js/;
// A host that briefly serves two different bundles must not reload in a loop.
const RELOAD_GUARD_KEY = 'app.update.reloadedAt';
const RELOAD_GUARD_MS = 60_000;

let checking = false;

/** The bundle this page is running, plus the app root that serves it. */
function runningBundle(): { src: string; root: string } | null {
  const script = Array.from(document.scripts).find((candidate) => ENTRY_PATTERN.test(candidate.src));
  const match = script ? ENTRY_PATTERN.exec(script.src) : null;
  if (!script || !match) return null;
  // `src` is absolute, so this is the origin plus any deploy sub-path.
  return { src: script.src, root: script.src.slice(0, match.index) };
}

/** The bundle the currently deployed `index.html` names. */
async function deployedBundle(root: string): Promise<string | null> {
  const response = await fetch(`${root}/index.html`, { cache: 'no-store' });
  if (!response.ok) return null;
  const html = await response.text();
  const match = ENTRY_PATTERN.exec(html);
  // Firebase cleanUrls redirects `/index.html` to `/`, so resolve the relative
  // entry against the final URL rather than the requested one.
  return match ? new URL(match[0], response.url).href : null;
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
        const deployed = await deployedBundle(running.root);
        if (!disposed && deployed && deployed !== running.src && mayReload()) {
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
