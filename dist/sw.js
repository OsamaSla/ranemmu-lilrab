/* Inert service worker — no fetch handler, no caching.
 *
 * Up to v3 this file was an offline worker that answered navigation requests
 * from `ranemmu-pages-v3` and static assets from `ranemmu-static-v3`. A cached
 * app shell could then hydrate against a newer JS bundle, which React reports
 * as error #418 ("server rendered HTML didn't match the client") and silently
 * throws away: exactly the kind of one-off error seen right after a deploy.
 *
 * This version clears those legacy caches once and then stays idle. The
 * registration in src/app/+html.tsx is kept so browsers pick this file up as
 * an update; new visitors install it, find no caches, and nothing runs.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith('ranemmu-')).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
