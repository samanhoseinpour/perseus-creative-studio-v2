#!/usr/bin/env node
/**
 * PageSpeed Insights runner — Lighthouse scores, lab metrics, and CrUX field
 * data for the live site, via Google's PSI v5 API.
 *
 *   npm run psi                        # homepage, mobile + desktop
 *   npm run psi -- /about /services    # specific path(s), or full https:// URLs
 *   npm run psi -- --strategy mobile   # mobile | desktop | both (default both)
 *
 * The npm script loads .env.local via --env-file, which provides PSI_API_KEY.
 * Without a key it still runs on the shared anonymous quota (expect 429s if
 * hammered). PSI fetches the DEPLOYED site — local changes don't show up in
 * these numbers until they ship.
 */

const SITE_URL = 'https://www.perseustudio.com';
const ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const CATEGORIES = ['PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO'];
const LAB_AUDITS = [
  ['first-contentful-paint', 'FCP'],
  ['speed-index', 'SI'],
  ['largest-contentful-paint', 'LCP'],
  ['total-blocking-time', 'TBT'],
  ['cumulative-layout-shift', 'CLS'],
];

const args = process.argv.slice(2);
const strategyFlag = args.findIndex((a) => a.startsWith('--strategy'));
let strategyArg = 'both';
if (strategyFlag >= 0) {
  strategyArg = args[strategyFlag].includes('=')
    ? args[strategyFlag].split('=')[1]
    : args[strategyFlag + 1];
}
if (!['mobile', 'desktop', 'both'].includes(strategyArg)) {
  console.error(`Unknown strategy "${strategyArg}". Use: mobile | desktop | both`);
  process.exit(1);
}
const strategies = strategyArg === 'both' ? ['mobile', 'desktop'] : [strategyArg];

const paths = args.filter(
  (a, i) => !a.startsWith('--') && !(strategyFlag >= 0 && i === strategyFlag + 1),
);
const urls = (paths.length ? paths : ['/']).map((p) => {
  if (p.startsWith('http')) return p;
  if (p.startsWith('/')) return `${SITE_URL}${p}`;
  console.error(`Path "${p}" must start with "/" (or be a full https:// URL).`);
  process.exit(1);
});

const key = process.env.PSI_API_KEY;
console.log(
  key
    ? 'Using PSI_API_KEY from .env.local.'
    : 'No PSI_API_KEY found — running on the shared anonymous quota.',
);

async function fetchPsi(params, attempt = 0) {
  let res;
  try {
    res = await fetch(`${ENDPOINT}?${params}`);
  } catch (err) {
    // Transient DNS/socket failures — retry a couple of times before giving up.
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 5_000));
      return fetchPsi(params, attempt + 1);
    }
    throw err;
  }
  if (!res.ok) {
    if (attempt < 2 && [429, 500, 503].includes(res.status)) {
      await new Promise((r) => setTimeout(r, 15_000));
      return fetchPsi(params, attempt + 1);
    }
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error?.message) msg += ` — ${body.error.message}`;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

function run(url, strategy) {
  const params = new URLSearchParams({ url, strategy });
  for (const c of CATEGORIES) params.append('category', c);
  if (key) params.set('key', key);
  return fetchPsi(params);
}

const score = (cat) => (cat?.score == null ? '—' : Math.round(cat.score * 100));
// PSI displayValues use non-breaking/narrow spaces; normalize for terminals.
const clean = (s) => (s ?? '—').replace(/[   ]/g, ' ').trim();

function fieldLine(le) {
  const m = le?.metrics ?? {};
  const lcp = m.LARGEST_CONTENTFUL_PAINT_MS?.percentile;
  const inp = m.INTERACTION_TO_NEXT_PAINT?.percentile;
  const cls = m.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile;
  if (lcp == null && inp == null && cls == null) return null;
  const parts = [];
  if (lcp != null) parts.push(`LCP ${(lcp / 1000).toFixed(1)} s`);
  if (inp != null) parts.push(`INP ${inp} ms`);
  if (cls != null) parts.push(`CLS ${(cls / 100).toFixed(2)}`);
  const scope = le.origin_fallback ? 'origin p75' : 'this page p75';
  return `Field (CrUX ${scope}):  ${parts.join(' · ')}  → ${le.overall_category}`;
}

let failed = false;
for (const url of urls) {
  const results = await Promise.all(
    strategies.map(async (s) => {
      try {
        return { strategy: s, data: await run(url, s) };
      } catch (err) {
        return { strategy: s, error: err.message };
      }
    }),
  );

  for (const { strategy, data, error } of results) {
    console.log(`\n── ${url} — ${strategy.toUpperCase()}`);
    if (error) {
      failed = true;
      console.log(`   FAILED: ${error}`);
      continue;
    }
    const lr = data.lighthouseResult;
    if (lr?.runtimeError?.code && lr.runtimeError.code !== 'NO_ERROR') {
      failed = true;
      console.log(`   Lighthouse runtime error: ${lr.runtimeError.message}`);
      continue;
    }
    const c = lr.categories;
    console.log(
      `   Performance ${score(c.performance)} · Accessibility ${score(c.accessibility)}` +
        ` · Best Practices ${score(c['best-practices'])} · SEO ${score(c.seo)}`,
    );
    console.log(
      `   Lab:  ${LAB_AUDITS.map(
        ([id, label]) => `${label} ${clean(lr.audits[id]?.displayValue)}`,
      ).join(' · ')}`,
    );
    const field = fieldLine(data.loadingExperience);
    if (field) console.log(`   ${field}`);
  }
}

if (failed) process.exit(1);
