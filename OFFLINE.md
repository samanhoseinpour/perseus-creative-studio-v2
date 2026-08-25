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
- **A second manifest** — `public/dashboard.webmanifest`, linked only from the
  `(admin)` layout (`metadata.manifest`, which overrides the root file
  convention). It is a SEPARATE installable app: `id`/`start_url` `/admin`,
  `scope: "/admin"`, its own ink icons. A browser installs whichever manifest the
  page you are on links, so installing from `/admin/login` gives the team a
  dashboard app that launches into `/admin`, while installing from the public
  site still gives the unchanged marketing app that launches into `/`. Nothing on
  the public site references `/admin`. It lives at the ROOT rather than under
  `/admin` because the manifest is fetched WITHOUT credentials in production, so
  a `/admin/*` URL would be bounced to the login page by `src/proxy.ts` and the
  install would fail.
- **Service worker** — `public/sw.js`, hand-written (no `next-pwa` / `serwist`).
  This keeps it **bundler-agnostic**: Next 16 builds with Turbopack by default,
  where webpack-based PWA plugins are unreliable, and it adds zero dependencies.
- **Registration** — `src/components/Pwa/ServiceWorkerRegister.tsx`, mounted in the
  **`(marketing)` layout and the `(admin)` layout** — not the root layout, so
  `/share/*` still never registers a worker. `/admin` registers one because the
  dashboard is itself installable and Chrome wants a worker before it will offer
  to install; that is a REGISTRATION change only. What `/admin` may cache is
  enforced inside the fetch handler, and the answer is still nothing — see the
  strategy table. (A member who had browsed the public site was always served by
  the same `/`-scoped worker on `/admin` anyway; this only makes it deterministic.)
  Registers **browser-only and production-only** (disabled in `npm run dev` so it
  doesn't cache HMR assets or fight fast refresh).
- **Offline indicator** — `src/components/Pwa/OfflineBanner.tsx`, a slim top
  banner shown while `navigator.onLine` is false; also the driver that flushes
  the contact outbox on reconnect.
- **Outbox** — `src/lib/offlineDb.ts` (tiny zero-dependency IndexedDB wrapper)
  and `src/lib/contactOutbox.ts` (queue + replay through the `submitContact`
  server action in `src/app/(marketing)/contact/actions.ts`).

## Caching strategy

| Request | Strategy | Cache |
| --- | --- | --- |
| App shell (`/offline`, marketing manifest, icons, favicon) | Precached on install | `pcs-v9-precache` |
| Page navigations + RSC payloads (same-origin GET) | Network-first → cache → `/offline` | `pcs-v9-pages` |
| `/_next/static/*` and same-origin css/js/fonts | Cache-first (content-hashed = immutable) | `pcs-v9-static` |
| Self-hosted images (`/images/` + `/_next/image`) | Stale-while-revalidate, capped at 60 entries | `pcs-v9-images` |
| Router prefetches (`Next-Router-(Segment-)Prefetch` header) | **Never cached** (partial payloads) | — |
| Non-GET requests (incl. server actions), analytics/3rd-party | **Never cached** (network only) | — |
| `/api/*` + `/share/*` (auth endpoints + tokenized report links) | **Ignored entirely** (network only, no offline fallback) | — |
| `/admin/*` exports, résumé/screenshot/avatar streams, presence | **Ignored entirely** (they are navigations until `Content-Disposition` lands) | — |
| Other `/admin` document navigations | **Never cached**; on network failure only, answered with the precached `/offline` | — |
| `/admin` RSC payloads | **Ignored entirely** (never cached, never given the offline HTML) | — |

**Cache versioning & cleanup.** Every cache name is prefixed with `VERSION`
(`pcs-v9`) in `public/sw.js`. On `activate` the SW deletes any cache that doesn't
match the current version, so bumping `VERSION` invalidates everything and old
caches can't accumulate. The image cache is additionally trimmed to 60 entries
and the page cache to 40 (oldest evicted first) to bound disk usage.

**Page-cache keys are normalized.** Next's router appends a cache-busting
`_rsc=<hash>` search param to every client-side RSC fetch — unique per
navigation, so caching by the raw URL would store entries no later request
could ever match. `pageCacheKey()` in `public/sw.js` strips `_rsc` and stores
RSC payloads under a separate `_sw-rsc=1` marker key, so in-app navigations to
a previously visited route are served from cache offline, and a flight payload
is never served for a document navigation (or vice versa).

**Privacy.** The SW only ever *stores* **safe GET requests for public marketing
content**. Form submissions (server actions are POSTs) and analytics beacons
bypass the cache entirely; `/api/*` and the tokenized `/share/*` report links are
never intercepted at all; and while an `/admin` document navigation now passes
through the worker so it can be answered with `/offline` when the network dies,
**nothing on that path is ever written to a cache** — not the page, not the RSC
payload, and the private route handlers (CSV exports, résumé/screenshot/avatar
streams, the presence heartbeat) are bypassed before that branch is even reached.
So no admin page, RSC payload, streamed private file (résumés, avatars, ticket
screenshots), or client report can land in Cache Storage (and a revoked share
link can't stay readable from cache). This is pinned by
`node scripts/check-service-worker.mjs`, which loads the real `public/sw.js` in a
fake worker scope and records every cache write. Nothing
user-specific is ever written to shared cache storage.

## What works offline

- Re-opening the app after a first online visit (app shell is precached).
- Navigating **within the app** to any page you've already visited (RSC
  payloads served from the pages cache under normalized keys).
- Hard-reloading / directly opening a page that has been **hard-loaded online
  at least once** (its HTML document is cached under the bare URL; a page only
  ever visited via in-app links falls back to `/offline` on a direct open).
- Static assets — JS/CSS bundles, fonts, and previously viewed images.
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
- **The `/admin` dashboard** — deliberately online-only: nothing from it is ever
  cached, so offline you get the branded `/offline` page (with dashboard-specific
  copy and an in-scope "Back to the dashboard" link), never a cached admin page.
  The fallback exists because the dashboard is installable and a standalone
  window has no address bar to escape a browser error page from.

## Offline writes: queue & sync

The contact form (`src/components/Contact/ContactHub.tsx`) is the site's only
client-side mutation. Submissions go through the `submitContact` server action
(`src/app/(marketing)/contact/actions.ts`), which validates with Zod, stores the row in
Neon Postgres, uploads a career application's resume to Vercel Blob, and sends
a notification email via Resend. Flow when offline:

1. **On submit while offline** (or if the send fails because the connection
   dropped mid-request), the payload — including a **byte snapshot** of the
   resume for career applications (not the live `File`, whose on-disk backing
   could move before the flush) — is stored in IndexedDB (`pcs-offline` →
   `outbox` store) via `queueSubmission()`. The write only counts once the
   IDB transaction *commits* (quota aborts reject and surface an error toast
   instead of a false "saved"). The visitor sees a *"Saved offline"* toast
   and the form resets.
2. **On reconnect** — the `OfflineBanner` listens for the `online` event (and also
   runs once on mount, covering a reload that happens after you're back online)
   and calls `flushOutbox()`, which rebuilds each record's `FormData` and replays
   it through `submitContact`. Successfully sent records are deleted; a *"Queued
   message sent"* toast confirms delivery. A single-flight guard (`inflightFlush`)
   stops a reconnect that fires both the `online` event and a mount from replaying
   the queue twice.

**localStorage fast-path.** Opening IndexedDB just to learn the queue is empty
would cost an open + `getAll` on every page load (and *create* the DB on a
first visit — flagged by Lighthouse as stored data). `queueSubmission()` sets
`pcs.outbox.pending` in localStorage; `OfflineBanner` checks that flag before
touching IndexedDB and a fully-drained flush clears it. A one-time
`reconcileOutboxFlag()` (idle, uses `indexedDB.databases()` so it never
creates the DB) migrates pre-flag visitors: re-sets the flag if their old
`pcs-offline` DB still holds records, deletes the DB if it's empty. Worst-case
flag drift (localStorage cleared while IDB survives) delays a flush until the
next queue event — acceptable for an at-least-once outbox, never data loss.

**Delivery semantics & conflicts.** Delivery is **at-least-once**: a record is
removed only after the server action confirms it, so an interrupted flush
retries rather than drops. Each record's `id` (the IndexedDB key) IS the
submission's `client_id`, and the `contact_submissions` table has a unique
constraint on it — a replayed duplicate resolves to `duplicate: true`
server-side instead of a second row + second email, so retries are safe.
Records the action *deterministically rejects* (validation failures) are
dropped rather than retried, so one bad record can't poison the queue.
Inquiries are **append-only** with no shared server state, so there are no
write/write conflicts to reconcile. Background Sync API is *not* used because
Safari and Firefox don't support it; the app-level `online`-event flush works
across all browsers.

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
3. **Open offline** — load `/`, then click through to `/about` and `/contact`
   via the site nav. Set DevTools → **Network → Offline**, then reload `/`:
   the app opens, and clicking to `/about` / `/contact` still navigates (their
   RSC payloads come from `pcs-v9-pages` under `?_sw-rsc=1` keys).
4. **Navigation fallback** — while offline, visit a route you never opened →
   branded `/offline` page (not the browser error).
5. **Static assets offline** — confirm styles/scripts/images on visited pages
   still render offline (Application → Cache Storage shows `pcs-v9-*`).
6. **Local data persists** — refresh while offline; everything still loads.
7. **Queued write** — while offline, submit the contact form → "Saved offline"
   toast; confirm a record under Application → **IndexedDB → pcs-offline →
   outbox**, and `pcs.outbox.pending = 1` under **Local storage**.
8. **Sync on reconnect** — Network back to **Online** → the outbox flushes, the
   record disappears from IndexedDB, a success toast appears, and the inquiry
   lands as a row in Neon (with a notification email via Resend). Replaying the
   same record twice must NOT create a second row — the unique `client_id`
   constraint dedups it.
9. **Cache cleanup** — bump `VERSION` in `public/sw.js`, rebuild, reload twice →
   old `pcs-v*` caches are gone from Application → Cache Storage.
10. **Two apps, not one** — on `/`, Application → Manifest shows
    `Perseus Creative Studio` (`start_url: /`). Navigate to `/admin/login`: the
    same panel now shows `Perseus Dashboard` (`start_url: /admin`,
    `scope: /admin`), the ink icon, and "Installable". Install from each page and
    confirm **both** apps appear and launch to different places. The
    `InstallDashboardCard` on `/admin/login` should offer a working Install
    button on Chromium and Share → Add to Home Screen wording on iOS Safari.
11. **Admin never cached** — click through several admin pages, then Application →
    **Cache Storage**: no `/admin` URL in any `pcs-v*` cache. Go offline and
    reload an admin page → the `/offline` page with dashboard copy and a "Back to
    the dashboard" link. Then click a CSV export online and confirm it still
    downloads a file (not the offline HTML). The headless equivalent of this
    step is `node scripts/check-service-worker.mjs`.
12. **Standalone chrome** — in the installed dashboard app on a notched iPhone,
    the admin top bar must clear the status bar / Dynamic Island (it pads by
    `env(safe-area-inset-top)`, which only resolves because the root layout sets
    `viewportFit: 'cover'`).

### Lighthouse / PWA audit

Run Lighthouse (DevTools → **Lighthouse**) against the **production** build in an
Incognito window. Expect installability checks to pass (manifest, icons,
`start_url`, theme color, service worker controlling the page). The
best-practices/SEO categories cover the rest; offline reachability is verified by
steps 3–4 above.
