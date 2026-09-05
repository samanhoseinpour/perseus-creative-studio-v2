#!/usr/bin/env node
// Service-worker routing self-check. No browser, no DB, no env.
//
// Usage:  node scripts/check-service-worker.mjs
//
// public/sw.js decides, per request, whether the worker touches it at all. Two
// of those decisions are privacy claims that OFFLINE.md makes in prose and that
// nothing else in the repo enforces:
//
//   1. NOTHING from /admin, /api/* or /share/* may ever be written to Cache
//      Storage — not a page, not an RSC payload, not a streamed résumé or
//      screenshot, not a tokenized client report.
//   2. The private route handlers (CSV exports, résumé/screenshot streams, the
//      presence heartbeat, avatar streaming) must not pass through the worker
//      AT ALL. They are top-level navigations until their Content-Disposition
//      arrives, so they would otherwise be caught by the /admin navigation
//      branch that exists to serve the offline page.
//
// Both failures are silent in a browser: the app keeps working and the leak is
// only visible by opening DevTools and looking. So they are pinned here.
//
// The harness loads the REAL public/sw.js in a fake ServiceWorkerGlobalScope
// and records every cache write, rather than re-implementing the rules.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const SW = path.join(ROOT, 'public', 'sw.js');
const ORIGIN = 'https://www.perseustudio.com';

let failures = 0;
const ok = (name) => console.log(`  ok    ${name}`);
const fail = (name, detail) => {
  failures++;
  console.log(`  FAIL  ${name}\n        ${detail}`);
};
function assert(cond, name, detail) {
  cond ? ok(name) : fail(name, detail ?? 'assertion failed');
}

/** Records every cache.put so a leak cannot pass unnoticed. */
function makeHarness({ offline = true, networkFails = false, windows = [] } = {}) {
  const puts = [];
  // Push-side recorders. `cacheOpens` matters as much as `puts`: it is what
  // makes "the push path touches Cache Storage at all" impossible to land.
  const shown = [];
  const opened = [];
  const focused = [];
  const navigated = [];
  let cacheOpens = 0;
  const mkResponse = (body, init = {}) => ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    body,
    clone() {
      return mkResponse(body, init);
    },
  });

  const cache = {
    put: (key, res) => {
      puts.push(String(key && key.url ? key.url : key));
      return Promise.resolve();
    },
    match: () => Promise.resolve(undefined),
    keys: () => Promise.resolve([]),
    delete: () => Promise.resolve(true),
    addAll: () => Promise.resolve(),
  };

  const caches = {
    open: () => {
      cacheOpens += 1;
      return Promise.resolve(cache);
    },
    keys: () => Promise.resolve([]),
    delete: () => Promise.resolve(true),
    match: (url) =>
      Promise.resolve(
        offline && String(url) === '/offline'
          ? mkResponse('OFFLINE_PAGE')
          : undefined,
      ),
  };

  // Badging: record every setAppBadge/clearAppBadge, and give the worker a
  // minimal IndexedDB so its counter has somewhere to live.
  const badges = [];
  let stored = 0;
  const fakeIdb = {
    open: () => {
      const req = {};
      queueMicrotask(() => {
        req.result = {
          objectStoreNames: { contains: () => true },
          createObjectStore: () => {},
          transaction: () => ({
            objectStore: () => ({
              get: () => {
                const r = {};
                queueMicrotask(() => {
                  r.result = stored;
                  if (r.onsuccess) r.onsuccess();
                });
                return r;
              },
              put: (v) => { stored = v; },
            }),
            get oncomplete() { return this._c; },
            set oncomplete(fn) { this._c = fn; queueMicrotask(fn); },
          }),
        };
        if (req.onupgradeneeded) req.onupgradeneeded();
        if (req.onsuccess) req.onsuccess();
      });
      return req;
    },
  };

  const mkClient = (url) => ({
    url,
    focus() {
      focused.push(url);
      return Promise.resolve(this);
    },
    navigate(next) {
      navigated.push(String(next));
      return Promise.resolve(this);
    },
  });

  const handlers = {};
  const self = {
    // `href` was not stubbed before; notificationclick reads location.origin
    // to decide whether an open window is a dashboard one.
    location: { origin: ORIGIN, href: `${ORIGIN}/` },
    addEventListener: (type, fn) => {
      handlers[type] = fn;
    },
    skipWaiting: () => Promise.resolve(),
    navigator: {
      setAppBadge: (n) => { badges.push(n); return Promise.resolve(); },
      clearAppBadge: () => { badges.push('clear'); return Promise.resolve(); },
    },
    registration: {
      scope: `${ORIGIN}/`,
      showNotification: (title, options) => {
        shown.push({ title, options });
        return Promise.resolve();
      },
    },
    clients: {
      claim: () => Promise.resolve(),
      matchAll: () => Promise.resolve(windows.map(mkClient)),
      openWindow: (url) => {
        opened.push(String(url));
        return Promise.resolve(mkClient(String(url)));
      },
    },
  };

  const context = {
    self,
    indexedDB: fakeIdb,
    caches,
    URL,
    Response: { error: () => mkResponse('ERROR', { ok: false, status: 0 }) },
    fetch: () =>
      networkFails
        ? Promise.reject(new Error('offline'))
        : Promise.resolve(mkResponse('NETWORK')),
    console,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(readFileSync(SW, 'utf8'), context, { filename: 'sw.js' });

  return {
    handlers,
    puts,
    mkResponse,
    shown,
    opened,
    focused,
    navigated,
    cacheOpens: () => cacheOpens,
    badges,
    storedCount: () => stored,
  };
}

/**
 * An event whose waitUntil actually KEEPS the promise, so the handler's work is
 * finished before anything is asserted.
 *
 * ⚠️ The original dispatcher had `waitUntil() {}`, which DISCARDED it, and the
 * consequence is subtler than "nothing runs" — it is that results become
 * TIMING-DEPENDENT. An `async` IIFE executes synchronously up to its first
 * `await`, so the push handler still reaches showNotification (the await is on
 * its return value) and those assertions happen to pass; but
 * notificationclick awaits `clients.matchAll()` FIRST, so whether the focus
 * and navigate calls have happened by assertion time depends on how many
 * microtask ticks the dispatcher happens to burn. Measured against the real
 * file, reverting to the discarding stub turns the focus assertion red and
 * leaves its neighbours passing by luck — which is the worst possible state for
 * a check script, because it is green on a good day.
 *
 * Safe for the existing fetch tests: nothing in the fetch handler routes
 * through waitUntil (trimCache is fire-and-forget inside networkFirst).
 */
function makeEvent(extra) {
  const waits = [];
  return {
    ...extra,
    waitUntil(p) {
      waits.push(Promise.resolve(p));
    },
    settle: () => Promise.all(waits),
  };
}

/** Dispatch a push event and wait for its work to finish. */
async function dispatchPush(harness, data) {
  const event = makeEvent({
    data:
      data === undefined
        ? null
        : {
            json: () => {
              if (data === '__throws__') throw new SyntaxError('bad json');
              return data;
            },
            text: () => '__RAW_PAYLOAD_TEXT__',
          },
  });
  await harness.handlers.push(event);
  await event.settle();
}

/** Dispatch a notificationclick and wait for its work to finish. */
async function dispatchClick(harness, data) {
  let closed = 0;
  const event = makeEvent({
    notification: {
      data,
      close: () => {
        closed += 1;
      },
    },
  });
  await harness.handlers.notificationclick(event);
  await event.settle();
  return { closed };
}

/** Dispatch one fetch event; report whether the worker claimed it. */
async function dispatch(harness, req) {
  let claimed = false;
  let settled;
  const request = {
    url: req.url.startsWith('http') ? req.url : ORIGIN + req.url,
    method: req.method ?? 'GET',
    mode: req.mode ?? 'navigate',
    destination: req.destination ?? 'document',
    headers: { get: (k) => req.headers?.[k.toLowerCase()] ?? null },
  };
  const event = {
    request,
    respondWith(p) {
      claimed = true;
      settled = p;
    },
    waitUntil() {},
  };
  await harness.handlers.fetch(event);
  const response = settled ? await settled.catch((e) => ({ error: e })) : null;
  return { claimed, response };
}

console.log('\nservice worker — routing and cache-write rules\n');

// ---------------------------------------------------------------------------
console.log('/admin is never written to Cache Storage');
{
  const h = makeHarness();
  const cases = [
    { label: 'admin document navigation', url: '/admin' },
    { label: 'admin sub-page navigation', url: '/admin/tasks?view=digest' },
    {
      label: 'admin RSC payload',
      url: '/admin/tasks?_rsc=abc',
      mode: 'cors',
      destination: 'empty',
      headers: { rsc: '1' },
    },
    // The blog draft preview is the one /admin route that renders a whole
    // MARKETING page: the real Navbar, the article, the real Footer. It is the
    // exact shape a caching rule would reach for, and it must not be cached,
    // because an unpublished draft in Cache Storage outlives the session that
    // was allowed to read it.
    {
      label: 'blog draft preview',
      url: '/admin/blogs/6f1d2b1e-0b8f-4a2c-9d3e-5a7c8b9d0e1f/preview',
    },
    {
      label: 'blog draft preview pinned to a version',
      url: '/admin/blogs/6f1d2b1e-0b8f-4a2c-9d3e-5a7c8b9d0e1f/preview?revision=8c2e3f4a-1d5b-4c6e-8f7a-9b0c1d2e3f40',
    },
  ];
  for (const c of cases) await dispatch(h, c);
  assert(
    h.puts.length === 0,
    'no cache.put for any /admin request',
    `wrote: ${JSON.stringify(h.puts)}`,
  );
}

// ---------------------------------------------------------------------------
console.log('\nprivate route handlers bypass the worker entirely');
{
  const h = makeHarness();
  const bypass = [
    ['CSV export', '/admin/costs/export?month=2026-06'],
    ['tasks export', '/admin/tasks/export'],
    ['payroll export', '/admin/payroll/export'],
    ['report export', '/admin/reports/acme/export'],
    ['résumé stream', '/admin/applications/42/resume'],
    ['screenshot stream', '/admin/tickets/7/screenshot'],
    ['avatar stream', '/admin/avatars/user_123'],
  ];
  for (const [label, url] of bypass) {
    const { claimed } = await dispatch(h, { url });
    assert(!claimed, `${label} not claimed by the worker`, `${url} was claimed`);
  }
  const { claimed: beat } = await dispatch(h, {
    url: '/admin/presence',
    method: 'POST',
  });
  assert(!beat, 'presence heartbeat (POST) not claimed');
  assert(h.puts.length === 0, 'no cache writes from any of them');
}

// ---------------------------------------------------------------------------
console.log('\n/api and /share stay fully ignored');
{
  const h = makeHarness();
  for (const url of [
    '/api/auth/session',
    '/api/cron/due-reminders',
    '/share/reports/Xk2n-token',
  ]) {
    const { claimed } = await dispatch(h, { url });
    assert(!claimed, `${url} not claimed`);
  }
  assert(h.puts.length === 0, 'no cache writes for /api or /share');
}

// ---------------------------------------------------------------------------
console.log('\nadmin navigation falls back to /offline when the network dies');
{
  const online = makeHarness();
  const r1 = await dispatch(online, { url: '/admin' });
  assert(r1.claimed, 'admin navigation IS claimed (so it can fall back)');
  assert(
    r1.response?.body === 'NETWORK',
    'online admin navigation returns the network response',
    `got ${JSON.stringify(r1.response?.body)}`,
  );
  assert(online.puts.length === 0, 'still no cache write on the success path');

  const down = makeHarness({ networkFails: true });
  const r2 = await dispatch(down, { url: '/admin/tasks' });
  assert(
    r2.response?.body === 'OFFLINE_PAGE',
    'offline admin navigation returns the precached /offline page',
    `got ${JSON.stringify(r2.response?.body)}`,
  );
  assert(down.puts.length === 0, 'no cache write on the failure path either');

  // An RSC fetch must NOT be answered with the offline HTML — the router would
  // try to parse a document as a flight payload. It hard-navigates instead.
  const rsc = makeHarness({ networkFails: true });
  const r3 = await dispatch(rsc, {
    url: '/admin/tasks',
    mode: 'cors',
    destination: 'empty',
    headers: { rsc: '1' },
  });
  assert(!r3.claimed, 'offline admin RSC fetch is left to fail, not given HTML');
}

// ---------------------------------------------------------------------------
console.log('\nthe marketing site still caches as before (no collateral damage)');
{
  const h = makeHarness();
  const r = await dispatch(h, { url: '/services' });
  assert(r.claimed, 'marketing navigation is claimed');
  assert(
    h.puts.some((u) => u.includes('/services')),
    'marketing navigation IS written to the page cache',
    `wrote: ${JSON.stringify(h.puts)}`,
  );

  const img = makeHarness();
  await dispatch(img, {
    url: '/images/hero.avif',
    mode: 'no-cors',
    destination: 'image',
  });
  assert(img.puts.length === 1, 'marketing image still cached');

  const down = makeHarness({ networkFails: true });
  const off = await dispatch(down, { url: '/about' });
  assert(
    off.response?.body === 'OFFLINE_PAGE',
    'marketing offline fallback still works',
  );
}

// ---------------------------------------------------------------------------
console.log('\nnotifications — push and notificationclick');
{
  // Both handlers must exist. The harness keeps ONE handler per event type, so
  // registering two `push` listeners would silently lose the first.
  const h = makeHarness();
  assert(
    typeof h.handlers.push === 'function',
    'a push listener is registered',
    'deleting it in a refactor must fail here, not at 3am',
  );
  assert(
    typeof h.handlers.notificationclick === 'function',
    'a notificationclick listener is registered',
  );
}

{
  const h = makeHarness();
  await dispatchPush(h, {
    title: 'Work needs your attention',
    body: '2 tasks are overdue.',
    url: '/admin/tasks',
    tag: 'perseus-due',
  });
  assert(h.shown.length === 1, 'a well-formed push shows exactly one notification', `shown ${h.shown.length}`);
  assert(h.shown[0]?.title === 'Work needs your attention', 'title comes from the payload');
  assert(h.shown[0]?.options.body === '2 tasks are overdue.', 'body comes from the payload');
  assert(h.shown[0]?.options.data.url === '/admin/tasks', 'data.url carries the deep link');
  assert(h.shown[0]?.options.tag === 'perseus-due', 'tag collapses repeats');
  assert(h.shown[0]?.options.badge === '/dashboard-badge-96.png', 'the Android badge is set');
}

{
  // THE one that stops Chrome revoking the permission.
  const h = makeHarness();
  await dispatchPush(h, undefined);
  assert(h.shown.length === 1, 'a push with NO data still shows a notification', `shown ${h.shown.length}`);
  assert(h.shown[0]?.title === 'Perseus Dashboard', 'falls back to a generic title');
  assert(h.shown[0]?.options.data.url === '/admin', 'falls back to /admin');
}

{
  const h = makeHarness();
  await dispatchPush(h, '__throws__');
  assert(h.shown.length === 1, 'a push with UNPARSEABLE data still shows a notification');
  const body = h.shown[0]?.options.body ?? '';
  assert(
    !body.includes('__RAW_PAYLOAD_TEXT__'),
    'a parse failure never dumps the raw payload into the body',
    'event.data.text() on a lock screen is how a malformed push becomes a privacy incident',
  );
}

{
  const bad = [
    ['https://evil.example/x', 'absolute off-origin'],
    ['//evil.example', 'protocol-relative'],
    ['/admin\tfoo', 'control character'],
    ['/login', 'outside /admin'],
    ['/adminx', 'prefix that is not a path boundary'],
    ['', 'empty'],
    [undefined, 'missing'],
  ];
  for (const [url, label] of bad) {
    const h = makeHarness();
    await dispatchPush(h, { title: 't', body: 'b', url });
    assert(
      h.shown[0]?.options.data.url === '/admin',
      `url guard rejects ${label}`,
      `got ${h.shown[0]?.options.data.url}`,
    );
  }
  const h = makeHarness();
  await dispatchPush(h, { title: 't', body: 'b', url: '/admin/tasks?assignee=x&sort=due' });
  assert(
    h.shown[0]?.options.data.url === '/admin/tasks?assignee=x&sort=due',
    'url guard keeps a legitimate /admin deep link with a query',
  );
}

{
  const h = makeHarness({ windows: [`${ORIGIN}/admin/inquiries`] });
  const { closed } = await dispatchClick(h, { url: '/admin/tasks' });
  assert(closed === 1, 'the notification is closed on click');
  assert(h.focused.length === 1, 'an existing dashboard window is focused');
  assert(h.navigated[0] === '/admin/tasks', 'and steered to the deep link');
  assert(h.opened.length === 0, 'no duplicate window is opened');
}

{
  const h = makeHarness({ windows: [`${ORIGIN}/about`] });
  await dispatchClick(h, { url: '/admin/tickets' });
  assert(h.opened.length === 1, 'a marketing tab does not count as the dashboard');
  assert(h.opened[0] === '/admin/tickets', 'so a new window opens on the deep link');
  assert(h.focused.length === 0, 'and nothing is focused');
}

{
  const h = makeHarness({ windows: [] });
  await dispatchClick(h, { url: '/admin/tasks' });
  assert(h.opened.length === 1 && h.opened[0] === '/admin/tasks', 'with no windows open, exactly one opens');
}

{
  const h = makeHarness({ windows: [] });
  await dispatchClick(h, { url: 'https://evil.example/steal' });
  assert(h.opened[0] === '/admin', 'notificationclick re-guards the url');
}

{
  // THE invariant that keeps the "/admin is never cached" promise intact.
  const h = makeHarness({ windows: [`${ORIGIN}/admin`] });
  await dispatchPush(h, { title: 't', body: 'b', url: '/admin/tasks' });
  await dispatchClick(h, { url: '/admin/tasks' });
  assert(h.puts.length === 0, 'the push path writes NOTHING to any cache', `wrote ${h.puts.join(', ')}`);
  assert(h.cacheOpens() === 0, 'the push path does not even OPEN a cache', `opened ${h.cacheOpens()}`);
}

{
  // The app-icon badge counts UP on each push and is cleared by the page.
  const h = makeHarness();
  await dispatchPush(h, { title: 't', body: 'b', url: '/admin' });
  assert(h.badges.length === 1 && h.badges[0] === 1, 'the first push sets the app badge to 1', JSON.stringify(h.badges));
  await dispatchPush(h, { title: 't', body: 'b', url: '/admin' });
  assert(h.badges[1] === 2, 'a second push counts UP rather than overwriting', JSON.stringify(h.badges));
  assert(h.storedCount() === 2, 'the running total is persisted for the next worker start', String(h.storedCount()));
  assert(h.shown.length === 2, 'and the notifications still showed', String(h.shown.length));
  // THE invariant the badge must not break.
  assert(h.puts.length === 0 && h.cacheOpens() === 0,
    'counting the badge touches NO Cache Storage (it uses IndexedDB)',
    `puts=${h.puts.length} opens=${h.cacheOpens()}`);
}

{
  const h = makeHarness({ windows: [] });
  await dispatchPush(h, { title: 't', body: 'b', url: '/admin' });
  await dispatchClick(h, { url: '/admin/tasks' });
  assert(h.badges.includes('clear'), 'tapping a notification clears the badge', JSON.stringify(h.badges));
  assert(h.storedCount() === 0, 'and zeroes the stored count', String(h.storedCount()));
}

{
  const src = readFileSync(SW, 'utf8');
  assert(/self\.addEventListener\('push'/.test(src), 'source still registers a push listener');
  assert(
    /self\.addEventListener\('notificationclick'/.test(src),
    'source still registers a notificationclick listener',
  );
  assert(
    !/addEventListener\('pushsubscriptionchange'/.test(src),
    'pushsubscriptionchange is deliberately NOT handled',
    'Safari never fires it; elsewhere the session cookie has usually expired by then — the client reconciles instead',
  );
  const i = src.indexOf('PRECACHE_URLS');
  const precache = src.slice(i, i + 400);
  assert(
    !/badge/.test(precache) && !/dashboard-icon/.test(precache),
    'the notification icon and badge stay OUT of PRECACHE_URLS',
    'cache.addAll is atomic: one 404 leaves the OLD worker — the one with no push handler — in charge for ever',
  );
}

// ---------------------------------------------------------------------------
console.log('\nversion + precache invariants');
{
  const src = readFileSync(SW, 'utf8');
  const version = src.match(/const VERSION = '([^']+)'/)?.[1];
  assert(!!version, 'VERSION is declared');
  assert(
    !/PRECACHE_URLS = \[[^\]]*dashboard/s.test(src),
    'dashboard manifest/icons are NOT in the atomic precache list',
    'a 404 there would silently brick the worker install',
  );
  assert(
    /const PRECACHE_URLS = \[[^\]]*'\/offline'|OFFLINE_URL,/s.test(src),
    '/offline is precached (the admin fallback depends on it)',
  );
}

console.log(
  failures === 0
    ? '\nAll service-worker checks passed.\n'
    : `\n${failures} check(s) FAILED.\n`,
);
process.exitCode = failures === 0 ? 0 : 1;
