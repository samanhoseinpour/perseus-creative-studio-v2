#!/usr/bin/env node
/**
 * Manual IndexNow submission — the companion to src/lib/indexnow.ts (which
 * pings automatically when /admin edits a project). Blog and services content
 * ships via deploy, so after a deploy that adds or meaningfully updates
 * content, run:
 *
 *   npm run indexnow -- /blogs/my-new-post            # explicit path(s)
 *   npm run indexnow -- --sitemap blogs               # every URL in a child sitemap
 *   npm run indexnow -- --sitemap all --dry-run       # preview the payload
 *
 * Child sitemap names: pages | services | projects | blogs | authors | all.
 *
 * Deliberately NOT wired to a deploy hook: auto-pinging every deploy would
 * announce "changed" for identical URL lists — the same false-freshness
 * antipattern the sitemap lastmod cleanup removed. Ping when content actually
 * changed. The key is public by protocol (engines fetch /<key>.txt), so it
 * lives in public/ and is discovered from there — no env vars.
 */
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SITE_URL = 'https://www.perseustudio.com';
const SITEMAP_NAMES = ['pages', 'services', 'projects', 'blogs', 'authors'];

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const keyFile = readdirSync(publicDir).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) {
  console.error('No IndexNow key file (32-hex .txt) found in public/.');
  process.exit(1);
}
const key = keyFile.replace(/\.txt$/, '');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const sitemapFlag = args.indexOf('--sitemap');
const sitemapArg = sitemapFlag >= 0 ? args[sitemapFlag + 1] : undefined;
// The sitemap name is the token after --sitemap; when the flag is absent
// (-1) nothing is excluded — an unguarded `sitemapFlag + 1` used to silently
// drop the FIRST path of every plain `npm run indexnow -- /a /b` call.
const sitemapNameIndex = sitemapFlag >= 0 ? sitemapFlag + 1 : -1;
const explicitPaths = args.filter(
  (a, i) => !a.startsWith('--') && i !== sitemapNameIndex,
);

async function sitemapUrls(name) {
  const res = await fetch(`${SITE_URL}/sitemaps/${name}.xml`);
  if (!res.ok) throw new Error(`GET /sitemaps/${name}.xml → ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

const urls = new Set(explicitPaths.map((p) => `${SITE_URL}${p}`));
if (sitemapArg) {
  const names = sitemapArg === 'all' ? SITEMAP_NAMES : [sitemapArg];
  for (const name of names) {
    if (!SITEMAP_NAMES.includes(name)) {
      console.error(`Unknown sitemap "${name}". Use: ${SITEMAP_NAMES.join(' | ')} | all`);
      process.exit(1);
    }
    for (const url of await sitemapUrls(name)) urls.add(url);
  }
}

if (urls.size === 0) {
  console.error('Nothing to submit. Pass path(s) or --sitemap <name|all>.');
  process.exit(1);
}

const payload = {
  host: new URL(SITE_URL).host,
  key,
  keyLocation: `${SITE_URL}/${key}.txt`,
  urlList: [...urls],
};

if (dryRun) {
  console.log(JSON.stringify(payload, null, 2));
  console.log(`\n--dry-run: ${urls.size} URL(s), nothing submitted.`);
  process.exit(0);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload),
});
// 200 = submitted; 202 = key validation pending — both are success.
console.log(`IndexNow: ${res.status} ${res.statusText} (${urls.size} URL(s))`);
if (!res.ok && res.status !== 202) process.exit(1);
