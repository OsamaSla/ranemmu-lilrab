/* ranemmu-lilrab service worker — offline-first static assets, network-first pages.
 *
 * Exists so Chromium (Chrome / Edge / Samsung Internet) treats the site as
 * installable: manifest + icons + a fetch-handling worker. Version the
 * caches below when the shell changes; old versioned caches are purged on
 * activate. Static export only — no build step touches this file.
 */
const VERSION = 'v1';
const STATIC_CACHE = `ranemmu-static-${VERSION}`;
const PAGES_CACHE = `ranemmu-pages-${VERSION}`;
const BASE = '/ranemmu-lilrab';
const CORE = [
  `${BASE}/`,
  `${BASE}/manifest.json`,
  `${BASE}/icons/icon-192.png`,
  `${BASE}/icons/icon-512.png`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('ranemmu-') && k !== STATIC_CACHE && k !== PAGES_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(BASE)) return;

  // Pages: network first, fall back to cache, then to the home page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGES_CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match(`${BASE}/`))),
    );
    return;
  }

  // Static assets: serve cached while revalidating in the background.
  event.respondWith(
    caches.match(request).then((hit) => {
      const net = fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    }),
  );
});
