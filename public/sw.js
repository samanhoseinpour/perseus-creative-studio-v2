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
const VERSION = 'pcs-v6';
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
// Cap the page (HTML + RSC payload) cache too — before this, every visited
// route accumulated until the next VERSION bump; a long blog-reading session
// could park hundreds of entries.
const PAGE_CACHE_LIMIT = 40;

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
// Self-hosted images: next/image's optimizer route and the static /images tree.
const isImage = (url) =>
  url.pathname.startsWith('/_next/image') || url.pathname.startsWith('/images/');
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

// Next's client router appends a cache-busting `_rsc=<hash>` search param to
// every RSC fetch — unique per navigation, so keying the cache by the raw
// request URL stores entries no later request can ever match (they only churn
// the LRU cap). Normalize the key: drop `_rsc`, and keep RSC payloads under a
// separate `_sw-rsc` marker key so a flight payload is never served for a
// document navigation (or vice versa).
function pageCacheKey(request) {
  const url = new URL(request.url);
  url.searchParams.delete('_rsc');
  if (request.headers.get('RSC') === '1') url.searchParams.set('_sw-rsc', '1');
  return url.href;
}

// Network-first: fresh content wins online; on failure fall back to the cached
// copy, then to the precached offline page. This is what stops the browser's
// default "no internet" error from ever surfacing for a page navigation.
// Stored/matched under the normalized pageCacheKey; fetched with the original
// request so the network sees the untouched URL + headers.
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cacheKey = pageCacheKey(request);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(cacheKey, response.clone());
      // Fire-and-forget like the image path — an eviction that misses this
      // tick is retried on the next successful fetch.
      trimCache(cacheName, PAGE_CACHE_LIMIT);
    }
    return response;
  } catch {
    const cached = await cache.match(cacheKey);
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
  if (!isSameOrigin(url)) return; // third-party scripts/analytics: leave alone

  if (isImage(url)) {
    event.respondWith(staleWhileRevalidate(request, IMAGES));
    return;
  }

  if (isNextStatic(url)) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }

  // Router prefetches are PARTIAL flight payloads (loading/PPR shells). Never
  // cache or serve them — under the normalized key they'd collide with the
  // full payload, and an offline navigation could get a partial page.
  if (
    request.headers.get('Next-Router-Prefetch') ||
    request.headers.get('Next-Router-Segment-Prefetch')
  ) {
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
