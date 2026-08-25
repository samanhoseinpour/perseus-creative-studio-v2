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
const VERSION = 'pcs-v9';
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
// Deliberately absent: /dashboard.webmanifest and the dashboard icons. They are
// fetched by the OS at install time, which is always online, so they buy nothing
// offline — while cache.addAll below is ATOMIC, so one 404 fails the install, the
// new VERSION never activates, the old worker keeps control, and registration
// errors are swallowed in ServiceWorkerRegister. Every entry added here is a way
// to brick the worker silently on some future rename. Keep the list minimal.

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

// ---------------------------------------------------------------- push ----
// Notifications. Nothing here touches Cache Storage — no caches.open, no
// cache.put, no fetch — so the "/admin is never cached" promise is untouched,
// and scripts/check-service-worker.mjs asserts exactly that by recording every
// cache write across a push and a click.

/**
 * Only ever navigate somewhere inside the dashboard. Modelled on
 * safeAdminReturnPath in src/lib/sessionPolicy.ts — the payload is ours and is
 * encrypted end to end, so this is belt-and-braces, but it is cheap and it is
 * pinned by the check script.
 */
function safeAdminUrl(value) {
  if (typeof value !== 'string' || value.length > 512) return '/admin';
  // No protocol-relative, no backslashes, no whitespace or control characters.
  if (/^\/\//.test(value)) return '/admin';
  if (/[\\\s\u0000-\u001f]/.test(value)) return '/admin';
  if (!/^\/admin(?=$|[/?])/.test(value)) return '/admin';
  return value;
}

self.addEventListener('push', (event) => {
  // A push event MUST always display exactly one notification, in every
  // branch — this is not politeness. Chrome enforces `userVisibleOnly`: a push
  // that shows nothing makes the browser display its own "This site has been
  // updated in the background" banner instead, and repeated offences get the
  // origin's push permission REVOKED. So there is no early return here.
  event.waitUntil(
    (async () => {
      let notice = null;
      try {
        notice = event.data ? event.data.json() : null;
      } catch (_) {
        // Deliberately NOT falling back to event.data.text(): dumping an
        // unparseable payload onto a lock screen is the one way a malformed
        // push becomes a privacy incident.
        notice = null;
      }

      const str = (v, fallback) =>
        typeof v === 'string' && v.trim() ? v : fallback;
      const title = str(notice && notice.title, 'Perseus Dashboard');
      const body = str(notice && notice.body, 'Open the dashboard.');
      const url = safeAdminUrl(notice && notice.url);
      const tag = str(notice && notice.tag, 'perseus');

      await self.registration.showNotification(title, {
        body,
        // Fetched from the network by the OS at render time. Both live at the
        // public root, so they are reachable without credentials — and neither
        // may be added to PRECACHE_URLS (cache.addAll is atomic; one 404 there
        // fails the install and leaves the OLD worker, the one with no push
        // handler, in charge for ever).
        icon: '/dashboard-icon-192.png',
        badge: '/dashboard-badge-96.png',
        tag,
        renotify: true,
        requireInteraction: false,
        data: { url },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  // close() FIRST — some platforms leave the notification sitting in the tray
  // if it is closed after the async work starts.
  event.notification.close();
  const data = event.notification.data || {};
  const url = safeAdminUrl(data.url);

  // waitUntil is mandatory: without it the worker can be terminated before
  // openWindow resolves, and the tap does nothing at all.
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      // Focus an existing dashboard window and steer it, rather than opening a
      // second copy. On a phone that is the difference between "the app I had
      // open jumps to the right page" and "a duplicate dashboard appears".
      for (const client of clients) {
        if (client.url.indexOf(self.location.origin + '/admin') !== 0) continue;
        try {
          await client.navigate(url);
        } catch (_) {
          // navigate() can reject (cross-origin history state); focus still
          // gets them to the right window.
        }
        return client.focus();
      }
      return self.clients.openWindow(url);
    })(),
  );
});

// `pushsubscriptionchange` is DELIBERATELY not handled, and this comment is
// here so nobody adds it "for completeness". Safari never fires it; and when
// it does fire elsewhere there may be no open client, so the re-subscribe POST
// would need the session cookie — but admin sessions have a 24-hour idle
// window and the cookie's Max-Age equals it (src/lib/sessionPolicy.ts), so the
// browser has usually dropped it by then. The POST would 401 and the handler
// would have no way to tell anyone. NotificationsCard reconciles from the
// client instead, on every visit to /admin/profile, and the 404/410 prune on
// the send side clears whatever is left.

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

/**
 * Network-only, with the precached /offline page as the failure answer.
 *
 * Deliberately NOT networkFirst: there is no cache read and no cache.put here,
 * because nothing from /admin may be stored. `caches.match` below is a read of
 * the precache — the same static page the marketing side falls back to.
 */
async function adminNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    throw new Error('Network error and no offline page available');
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Privacy + correctness: only ever touch safe GET requests. Form posts (the
  // contact/admin server actions) and analytics beacons go straight to the
  // network, never cached.
  if (request.method !== 'GET') return;
  if (!isSameOrigin(url)) return; // third-party scripts/analytics: leave alone

  // Auth endpoints and tokenized report share pages are hands-off entirely: no
  // caching, no fallback. A client's tokenized report must never land in shared
  // Cache Storage, and a revoked share must not stay readable from cache.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/share/')) {
    return;
  }

  // The authenticated admin area is NEVER CACHED either — no admin page, no RSC
  // payload, no streamed résumé/screenshot may land in shared Cache Storage.
  // Nothing below writes to a cache on this path.
  //
  // The one thing the worker does here is answer a FAILED document navigation
  // with the precached /offline page. That exists because the dashboard is an
  // installable app (public/dashboard.webmanifest): a standalone window has no
  // address bar, so the browser's native error page is a dead end with no way
  // out. Serving a static page we already hold leaks nothing.
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
    // Route handlers stay COMPLETELY untouched. A CSV export or a private
    // résumé/screenshot stream is a top-level navigation until its
    // Content-Disposition arrives, so without this they would start flowing
    // through the worker — precisely what the no-caching promise above is
    // about — and an offline export would 'download' the /offline HTML.
    if (/\/(export|resume|screenshot|presence)$/.test(url.pathname)) return;
    if (url.pathname.startsWith('/admin/avatars/')) return;

    // An RSC fetch has mode !== 'navigate', so it falls through to this bare
    // return exactly as before; the router hard-navigates on failure and that
    // navigation is what reaches the branch below.
    if (request.mode === 'navigate') {
      event.respondWith(adminNavigation(request));
    }
    return;
  }

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
