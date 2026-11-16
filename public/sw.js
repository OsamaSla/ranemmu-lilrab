/* public/sw.js — v4: network-first pages, cache-first hashed assets */
const VERSION = 'v4';

const STATIC = `ranemmu-static-${VERSION}`;
const PAGES = `ranemmu-pages-${VERSION}`;
const SCOPE = self.registration.scope;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('ranemmu-') && k !== STATIC && k !== PAGES)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);

async function networkFirst(req) {
  const cache = await caches.open(PAGES);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, rej) => setTimeout(rej, 4000)),
    ]);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || (await cache.match(SCOPE)) || Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const { request: req } = e;
  if (req.method !== 'GET' || !req.url.startsWith(SCOPE)) return;
  if (req.mode === 'navigate') return e.respondWith(networkFirst(req));
  const path = new URL(req.url).pathname;
  if (path.includes('/_expo/static/') || path.includes('/assets/')) e.respondWith(cacheFirst(req));
});