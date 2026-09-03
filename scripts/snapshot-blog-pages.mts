/**
 * Rendering-parity snapshot for the MDX → Postgres blog cutover.
 *
 * Run (against a running `next start`, default port 3000):
 *   node --import tsx scripts/snapshot-blog-pages.mts http://localhost:3000 .snapshots/before
 *   node --import tsx scripts/snapshot-blog-pages.mts http://localhost:3000 .snapshots/after
 *   node --import tsx scripts/snapshot-blog-pages.mts --diff .snapshots/before .snapshots/after
 *
 * Captures, per URL: every <script type="application/ld+json"> (parsed,
 * key-sorted, string values whitespace-normalised, in document order), the
 * normalised innerHTML of <main>, and once (on the first URL) the normalised
 * <header> nav markup. Sitemaps are captured as loc → { lastmod, images } maps
 * (order-insensitive: a sitemap is an unordered set).
 *
 * Normalisation of markup: comments stripped, <script> stripped, data-* and
 * nonce attributes removed, React useId tokens (`_R_…_`, `:r…:`) blanked,
 * recency badges and the authors index's "Days since last" figure blanked
 * (they read Date.now()), whitespace between tags removed, runs of whitespace
 * collapsed. Both passes MUST run on the same UTC day.
 *
 * Self-test: every capture on every URL must be non-empty on the BEFORE run,
 * or the diff is a check that cannot fire.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);

function normaliseMarkup(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/\s(?:data-[a-z0-9-]+|nonce)="[^"]*"/gi, '')
    // React useId tokens move when a tree is refactored; they are not content.
    .replace(/(?:_R_[a-z0-9_]+_|:r[a-z0-9]+:)/g, '__useid__')
    // Recency badge (BlogCard) and the "Days since last" figure (authors
    // index) both read Date.now().
    .replace(/<div aria-label="(?:Hot|New) post"[\s\S]*?<\/div>/g, '__recency__')
    .replace(/(Days since last<\/span>[\s\S]*?<dd[^>]*>)[\s\S]*?(<\/dd>)/g, '$1__days__$2')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((k) => [k, sortKeys(record[k])]),
    );
  }
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim();
  return value;
}

function extractJsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(sortKeys(JSON.parse(m[1])));
  return out;
}

function extractMain(html: string): string {
  const m = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  return m ? normaliseMarkup(m[1]) : '';
}

function extractHeader(html: string): string {
  const m = html.match(/<header\b[^>]*>([\s\S]*?)<\/header>/i);
  return m ? normaliseMarkup(m[1]) : '';
}

type SitemapMap = Record<string, { lastmod: string; images: string[] }>;

function parseSitemap(xml: string): SitemapMap {
  const out: SitemapMap = {};
  const entry = /<(?:url|sitemap)>([\s\S]*?)<\/(?:url|sitemap)>/g;
  let m: RegExpExecArray | null;
  while ((m = entry.exec(xml)) !== null) {
    const loc = m[1].match(/<loc>([^<]+)<\/loc>/)?.[1] ?? '';
    const lastmod = m[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] ?? '';
    const images = [...m[1].matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((x) => x[1]);
    out[loc] = { lastmod, images };
  }
  return out;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { accept: 'text/html,application/xml' } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

/** Posts and authors are discovered from the live sitemaps so the list
 *  follows the corpus; hub/author pagination is probed to a fixed depth. */
async function discoverUrls(base: string): Promise<string[]> {
  const blogs = parseSitemap(await fetchText(`${base}/sitemaps/blogs.xml`));
  const authors = parseSitemap(await fetchText(`${base}/sitemaps/authors.xml`));
  const postUrls = Object.keys(blogs).map((u) => new URL(u).pathname);
  const authorUrls = Object.keys(authors).map((u) => new URL(u).pathname);
  const urls: string[] = ['/'];
  for (const c of ['production', 'websites', 'digital-marketing', 'social', 'branding']) {
    urls.push(`/projects/${c}`, `/services/${c}`);
  }
  urls.push(
    '/services/production/videography',
    '/services/websites/website-development',
    '/services/digital-marketing/meta-ads',
    '/services/social/social-media-management',
    '/services/branding/logo-visual-identity',
  );
  urls.push('/blogs');
  for (let p = 2; p <= 4; p++) urls.push(`/blogs?page=${p}`);
  for (const c of ['production', 'websites', 'digital-marketing', 'social']) {
    urls.push(`/blogs?category=${c}`);
    for (let p = 2; p <= 3; p++) urls.push(`/blogs?category=${c}&page=${p}`);
  }
  urls.push('/blogs/authors');
  for (const a of authorUrls) {
    urls.push(a);
    for (let p = 2; p <= 3; p++) urls.push(`${a}?page=${p}`);
  }
  urls.push(...postUrls);
  return urls;
}

const SITEMAPS = ['/sitemap.xml', '/sitemaps/blogs.xml', '/sitemaps/authors.xml', '/sitemaps/pages.xml'];

function fileFor(url: string): string {
  return url.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'root';
}

async function snapshot(base: string, outDir: string) {
  mkdirSync(outDir, { recursive: true });
  const urls = await discoverUrls(base);
  const index: Record<string, string> = {};
  let empty = 0;
  for (const [i, url] of urls.entries()) {
    const html = await fetchText(`${base}${url}`);
    const capture: Record<string, unknown> = { jsonld: extractJsonLd(html), main: extractMain(html) };
    if (i === 0) capture.header = extractHeader(html);
    for (const [k, v] of Object.entries(capture)) {
      if ((Array.isArray(v) && v.length === 0) || v === '') {
        empty++;
        console.log(`EMPTY  ${url}  ${k}`);
      }
    }
    const file = `${fileFor(url)}.json`;
    writeFileSync(join(outDir, file), JSON.stringify(capture, null, 2));
    index[url] = file;
  }
  for (const path of SITEMAPS) {
    const parsed = parseSitemap(await fetchText(`${base}${path}`));
    if (Object.keys(parsed).length === 0) {
      empty++;
      console.log(`EMPTY  ${path}  sitemap`);
    }
    const file = `${fileFor(path)}.json`;
    writeFileSync(join(outDir, file), JSON.stringify({ sitemap: parsed }, null, 2));
    index[path] = file;
  }
  writeFileSync(join(outDir, '_index.json'), JSON.stringify(index, null, 2));
  console.log(`\n${urls.length + SITEMAPS.length} captures written to ${outDir}; ${empty} empty capture(s)`);
  if (empty > 0) process.exit(1);
}

type Allow = { url: string; capture: string; reason: string };

function diff(beforeDir: string, afterDir: string) {
  const before = JSON.parse(readFileSync(join(beforeDir, '_index.json'), 'utf8')) as Record<string, string>;
  const after = JSON.parse(readFileSync(join(afterDir, '_index.json'), 'utf8')) as Record<string, string>;
  let allow: Allow[] = [];
  try {
    allow = JSON.parse(readFileSync(join(afterDir, '_allowlist.json'), 'utf8')) as Allow[];
  } catch {
    allow = [];
  }
  const allowed = new Set(allow.map((a) => `${a.url}|${a.capture}`));
  let problems = 0;
  let allowedHits = 0;
  for (const url of Object.keys(before)) {
    if (!after[url]) {
      problems++;
      console.log(`MISSING  ${url}`);
      continue;
    }
    const b = JSON.parse(readFileSync(join(beforeDir, before[url]), 'utf8')) as Record<string, unknown>;
    const a = JSON.parse(readFileSync(join(afterDir, after[url]), 'utf8')) as Record<string, unknown>;
    for (const k of Object.keys(b)) {
      if (JSON.stringify(b[k]) === JSON.stringify(a[k])) continue;
      if (allowed.has(`${url}|${k}`)) {
        allowedHits++;
        console.log(`ALLOWED  ${url}  ${k}`);
        continue;
      }
      problems++;
      console.log(`DIFF     ${url}  ${k}`);
      if (typeof b[k] === 'string' && typeof a[k] === 'string') {
        const bs = b[k] as string;
        const as = a[k] as string;
        let i = 0;
        while (i < bs.length && i < as.length && bs[i] === as[i]) i++;
        console.log(`  before …${bs.slice(Math.max(0, i - 80), i + 160)}`);
        console.log(`  after  …${as.slice(Math.max(0, i - 80), i + 160)}`);
      } else {
        console.log(`  before ${JSON.stringify(b[k]).slice(0, 400)}`);
        console.log(`  after  ${JSON.stringify(a[k]).slice(0, 400)}`);
      }
    }
  }
  for (const url of Object.keys(after)) {
    if (!before[url]) console.log(`NEW      ${url} (not in the baseline)`);
  }
  for (const a of allow) {
    if (!Object.keys(before).includes(a.url)) console.log(`STALE ALLOW  ${a.url}  ${a.capture}`);
  }
  console.log(`\n${problems} unexplained difference(s), ${allowedHits} allowed`);
  if (problems > 0) process.exit(1);
}

if (args[0] === '--diff') {
  diff(args[1], args[2]);
} else {
  const base = (args[0] ?? 'http://localhost:3000').replace(/\/$/, '');
  const outDir = args[1] ?? '.snapshots/before';
  await snapshot(base, outDir);
}
