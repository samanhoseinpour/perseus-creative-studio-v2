/*
 * Perseus Creative Studio — service worker.
 *
 * Hand-written (no Workbox/next-pwa) so it stays bundler-agnostic: Next 16 builds
 * with Turbopack by default, where webpack-based PWA plugins are unreliable.
 *
 * Bump VERSION on any cache-shape change. The activate handler deletes every
 * cache whose name doesn't carry the current VERSION, which is what keeps cache
 * storage from growing without bound and prevents stale-bundle bugs across deploys.
 */
const VERSION = 'pcs-v3';
const PRECACHE = `${VERSION}-precache`;
const PAGES = `${VERSION}-pages`;
const STATIC = `${VERSION}-static`;
const IMAGES = `${VERSION}-images`;

// The branded offline route is the navigation fallback of last resort, so it
// must be available before the first network failure.
const OFFLINE_URL = '/offline';
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.json',
  '/favicon.ico',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
];

// Cap the runtime image cache so visited galleries can't fill the disk quota.
const IMAGE_CACHE_LIMIT = 60;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      // addAll is atomic — if any URL 404s the whole install fails, so keep this
      // list to assets we know exist.
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !key.startsWith(VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

// Allow the page to trigger an immediate update (used after a new SW is found).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

const isNextStatic = (url) => url.pathname.startsWith('/_next/static/');
const isImageKit = (url) => url.hostname === 'ik.imagekit.io';
const isSameOrigin = (url) => url.origin === self.location.origin;

// Trim a cache to a maximum number of entries, evicting the oldest first.
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  for (const key of keys.slice(0, keys.length - maxEntries)) {
    await cache.delete(key);
  }
}

// Network-first: fresh content wins online; on failure fall back to the cached
// copy, then to the precached offline page. This is what stops the browser's
// default "no internet" error from ever surfacing for a page navigation.
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const offline = await caches.match(OFFLINE_URL);
      if (offline) return offline;
    }
    throw new Error('Network error and no cache available');
  }
}

// Cache-first: for content-hashed, immutable build assets where the cached copy
// is always correct and a network round-trip is pure latency.
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

// Stale-while-revalidate: serve the cached image immediately, refresh it in the
// background. Best fit for CDN images that change rarely but shouldn't block paint.
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
        trimCache(cacheName, IMAGE_CACHE_LIMIT);
      }
      return response;
    })
    .catch(() => undefined);
  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Privacy + correctness: only ever touch safe GET requests. Form posts, the
  // EmailJS API, and analytics beacons go straight to the network, never cached.
  if (request.method !== 'GET') return;
  if (isImageKit(url)) {
    event.respondWith(staleWhileRevalidate(request, IMAGES));
    return;
  }
  if (!isSameOrigin(url)) return; // third-party scripts/analytics: leave alone

  if (isNextStatic(url)) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }

  // Page navigations and RSC payload fetches (same-origin GET with the RSC
  // header) are kept fresh-first so online users never see stale HTML/RSC.
  const isRsc = request.headers.get('RSC') === '1';
  if (request.mode === 'navigate' || isRsc) {
    event.respondWith(networkFirst(request, PAGES));
    return;
  }

  // Same-origin styles/scripts/fonts/etc. that aren't hashed: cache-first is a
  // safe default for a mostly-static marketing site.
  const dest = request.destination;
  if (['style', 'script', 'font', 'worker'].includes(dest)) {
    event.respondWith(cacheFirst(request, STATIC));
  }
});
