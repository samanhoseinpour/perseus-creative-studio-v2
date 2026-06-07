# Offline & PWA behavior

Perseus Creative Studio is an installable Progressive Web App with real offline
support. This document explains exactly what works offline, how offline contact
submissions are queued and synced, and how to verify it all locally.

## How it's built

- **Manifest** — `src/app/manifest.json` (Next metadata-file convention, served
  at `/manifest.json`; the `<link rel="manifest">` is injected automatically).
  Declares name, short_name, description, `id`/`start_url`/`scope`,
  `display: standalone`, theme/background colors, and both `any` and `maskable`
  icons (192/512).
- **Service worker** — `public/sw.js`, hand-written (no `next-pwa` / `serwist`).
  This keeps it **bundler-agnostic**: Next 16 builds with Turbopack by default,
  where webpack-based PWA plugins are unreliable, and it adds zero dependencies.
- **Registration** — `src/components/Pwa/ServiceWorkerRegister.tsx`, mounted once
  in `layout.tsx`. Registers **browser-only and production-only** (disabled in
  `npm run dev` so it doesn't cache HMR assets or fight fast refresh).
- **Offline indicator** — `src/components/Pwa/OfflineBanner.tsx`, a slim top
  banner shown while `navigator.onLine` is false; also the driver that flushes
  the contact outbox on reconnect.
- **Outbox** — `src/lib/offlineDb.ts` (tiny zero-dependency IndexedDB wrapper)
  and `src/lib/contactOutbox.ts` (queue + replay via EmailJS).

## Caching strategy

| Request | Strategy | Cache |
| --- | --- | --- |
| App shell (`/offline`, manifest, icons, favicon) | Precached on install | `pcs-v1-precache` |
| Page navigations + RSC payloads (same-origin GET) | Network-first → cache → `/offline` | `pcs-v1-pages` |
| `/_next/static/*` and same-origin css/js/fonts | Cache-first (content-hashed = immutable) | `pcs-v1-static` |
| ImageKit images (`ik.imagekit.io`) | Stale-while-revalidate, capped at 60 entries | `pcs-v1-images` |
| Non-GET requests, EmailJS API, analytics/3rd-party | **Never cached** (network only) | — |

**Cache versioning & cleanup.** Every cache name is prefixed with `VERSION`
(`pcs-v1`) in `public/sw.js`. On `activate` the SW deletes any cache that doesn't
match the current version, so bumping `VERSION` invalidates everything and old
caches can't accumulate. The image cache is additionally trimmed to 60 entries
(oldest evicted first) to bound disk usage.

**Privacy.** The SW only ever reads/stores **safe GET requests for public
marketing content**. Form submissions (non-GET), the EmailJS API
(`api.emailjs.com`), and analytics beacons bypass the cache entirely, so nothing
user-specific is written to shared cache storage. The site has no authenticated
or private API responses.

## What works offline

- Re-opening the app after a first online visit (app shell is precached).
- Navigating to any page you've already visited (served from the pages cache).
- Static assets — JS/CSS bundles, fonts, and previously viewed ImageKit images.
- Submitting the contact form: the inquiry is **saved locally and sent
  automatically when you reconnect** (see below).

## What does NOT work offline

- **First visit to a page you've never opened** — shows the branded `/offline`
  fallback (not the browser's network error). It works as soon as you've loaded
  it once online.
- **Immediate delivery of a contact inquiry** — it's queued, not sent, until
  you're back online.
- **Fresh content** — newly published blog posts / updated pages only appear
  after a successful online load (network-first refreshes the cache).
- **Analytics and third-party scripts** — intentionally not cached.

## Offline writes: queue & sync

The contact form (`src/components/Contact/ContactForm.tsx`) is the site's only
client-side mutation. Flow:

1. **On submit while offline** (or if the send fails because the connection
   dropped mid-request), the form fields are serialized to a plain object and
   stored in IndexedDB (`pcs-offline` → `outbox` store) via `queueInquiry()`. The
   visitor sees a *"Saved offline"* toast and the form resets.
2. **On reconnect** — the `OfflineBanner` listens for the `online` event (and also
   runs once on mount, covering a reload that happens after you're back online)
   and calls `flushOutbox()`, which replays each record with
   `emailjs.send(...)`. Successfully sent records are deleted; a *"Queued message
   sent"* toast confirms delivery.

**Delivery semantics & conflicts.** Delivery is **at-least-once**: a record is
removed only after EmailJS confirms the send, so an interrupted flush retries
rather than drops. Each record carries a client-generated `id` (the IndexedDB
key), which is also sent to EmailJS as `client_id` — use it to de-duplicate on
the receiving side if a retry ever double-delivers. Inquiries are **append-only**
with no shared server state, so there are no write/write conflicts to reconcile
(there is no last-write-wins decision to make). Background Sync API is *not* used
because Safari and Firefox don't support it; the app-level `online`-event flush
works across all browsers.

## How to test locally

The service worker only runs in a production build:

```bash
npm run build
npm run start          # http://localhost:3000
```

Then, in Chrome (Incognito recommended to avoid stale SWs):

1. **Install / manifest** — DevTools → **Application → Manifest**: no errors,
   "Installable". The install icon appears in the address bar.
2. **SW active** — Application → **Service Workers**: `sw.js` is *activated and
   running*.
3. **Open offline** — load `/`, `/about`, `/contact`. Set DevTools → **Network →
   Offline**, then reload: the app still opens and those pages still navigate.
4. **Navigation fallback** — while offline, visit a route you never opened →
   branded `/offline` page (not the browser error).
5. **Static assets offline** — confirm styles/scripts/images on visited pages
   still render offline (Application → Cache Storage shows `pcs-v1-*`).
6. **Local data persists** — refresh while offline; everything still loads.
7. **Queued write** — while offline, submit the contact form → "Saved offline"
   toast; confirm a record under Application → **IndexedDB → pcs-offline →
   outbox**.
8. **Sync on reconnect** — Network back to **Online** → the outbox flushes, the
   record disappears from IndexedDB, a success toast appears, and the inquiry
   lands in the EmailJS dashboard.
9. **Cache cleanup** — bump `VERSION` in `public/sw.js`, rebuild, reload twice →
   old `pcs-v*` caches are gone from Application → Cache Storage.

### Lighthouse / PWA audit

Run Lighthouse (DevTools → **Lighthouse**) against the **production** build in an
Incognito window. Expect installability checks to pass (manifest, icons,
`start_url`, theme color, service worker controlling the page). The
best-practices/SEO categories cover the rest; offline reachability is verified by
steps 3–4 above.
