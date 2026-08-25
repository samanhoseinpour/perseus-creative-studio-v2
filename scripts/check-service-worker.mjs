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
function makeHarness({ offline = true, networkFails = false } = {}) {
  const puts = [];
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
    open: () => Promise.resolve(cache),
    keys: () => Promise.resolve([]),
    delete: () => Promise.resolve(true),
    match: (url) =>
      Promise.resolve(
        offline && String(url) === '/offline'
          ? mkResponse('OFFLINE_PAGE')
          : undefined,
      ),
  };

  const handlers = {};
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type, fn) => {
      handlers[type] = fn;
    },
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
  };

  const context = {
    self,
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

  return { handlers, puts, mkResponse };
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
