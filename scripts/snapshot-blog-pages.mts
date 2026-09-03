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
 * (order-insensitive: a sitemap is an unordered set). Per URL there is also
 * `head`: <title>, the SEO / OG / Twitter / article <meta> tags and the
 * canonical / alternate <link> tags as sorted key=value pairs (added after the
 * baseline was taken; a key present on one side only is reported once as not
 * compared, never as a difference).
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
    // The category chips on /blogs derive isHot/isFresh from Date.now() too
    // (BlogPost.tsx). Two separate artifacts: the indicator span's `title`,
    // and the recency suffix appended to the chip link's `aria-label`.
    .replace(/<span[^>]*title="New post in the last \d+ days"[^>]*>[\s\S]*?<\/span>/g, '__recency_chip__')
    .replace(/, new in the last \d+ days(?=")/g, '__recency_label__')
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

/** The <meta> keys that are parity goals. Everything else in <head> (viewport,
 *  theme-color, icons, preloads, the manifest) is chrome. */
const HEAD_META_RE = /^(?:description|robots|googlebot|keywords)$|^(?:og|twitter|article):/i;

function attrOf(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'));
  return m ? m[1] : undefined;
}

/** <title>, the SEO / OG / Twitter / article <meta> tags and the canonical and
 *  alternate <link> tags, read from the RAW <head> as `key=value` pairs and
 *  sorted, so a tag-order change alone is not a difference. */
function extractHead(html: string): string[] {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
  const out: string[] = [];
  const title = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) out.push(`title=${title[1].replace(/\s+/g, ' ').trim()}`);
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const key = attrOf(tag, 'name') ?? attrOf(tag, 'property');
    if (!key || !HEAD_META_RE.test(key)) continue;
    out.push(`${key}=${attrOf(tag, 'content') ?? ''}`);
  }
  for (const [tag] of head.matchAll(/<link\b[^>]*>/gi)) {
    const rel = attrOf(tag, 'rel');
    if (rel !== 'canonical' && rel !== 'alternate') continue;
    out.push(`${rel}=${attrOf(tag, 'href') ?? ''}`);
  }
  return out.sort();
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
    const capture: Record<string, unknown> = { jsonld: extractJsonLd(html), main: extractMain(html), head: extractHead(html) };
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
    // Key-sorted: a sitemap is an unordered set, and JSON objects preserve
    // insertion order, so writing document order would diff on a reorder alone.
    writeFileSync(join(outDir, file), JSON.stringify({ sitemap: sortKeys(parsed) }, null, 2));
    index[path] = file;
  }
  writeFileSync(join(outDir, '_index.json'), JSON.stringify(index, null, 2));
  console.log(`\n${urls.length + SITEMAPS.length} captures written to ${outDir}; ${empty} empty capture(s)`);
  if (empty > 0) process.exit(1);
}

type Allow = { url: string; capture: string; reason: string };

/** Class-token whitespace is not a parity goal: every `class` value is
 *  compared trimmed with its internal runs collapsed to one space, on both
 *  sides. Strings only; the capture-time normalisers are untouched. */
function normaliseClassAttrs(value: unknown): unknown {
  return typeof value === 'string'
    ? value.replace(/class="([^"]*)"/g, (_, cls: string) => `class="${cls.trim().replace(/\s+/g, ' ')}"`)
    : value;
}

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
  const notCompared = new Map<string, number>();
  for (const url of Object.keys(before)) {
    if (!after[url]) {
      problems++;
      console.log(`MISSING  ${url}`);
      continue;
    }
    const b = JSON.parse(readFileSync(join(beforeDir, before[url]), 'utf8')) as Record<string, unknown>;
    const a = JSON.parse(readFileSync(join(afterDir, after[url]), 'utf8')) as Record<string, unknown>;
    for (const k of new Set([...Object.keys(b), ...Object.keys(a)])) {
      // A capture present on one side only (a `head` taken after the baseline
      // was) is counted and reported once at the end, never as a difference.
      if (!(k in b) || !(k in a)) {
        notCompared.set(k, (notCompared.get(k) ?? 0) + 1);
        continue;
      }
      // Both sides go through sortKeys so a baseline captured before the
      // sitemap sort landed stays valid. Idempotent for `main` (already
      // whitespace-normalised) and `jsonld` (already key-sorted); array order
      // is left alone, so a sitemap's `images` order is still compared.
      const bv = sortKeys(normaliseClassAttrs(b[k]));
      const av = sortKeys(normaliseClassAttrs(a[k]));
      if (JSON.stringify(bv) === JSON.stringify(av)) continue;
      if (allowed.has(`${url}|${k}`)) {
        allowedHits++;
        console.log(`ALLOWED  ${url}  ${k}`);
        continue;
      }
      problems++;
      console.log(`DIFF     ${url}  ${k}`);
      if (typeof bv === 'string' && typeof av === 'string') {
        const bs = bv;
        const as = av;
        let i = 0;
        while (i < bs.length && i < as.length && bs[i] === as[i]) i++;
        console.log(`  before …${bs.slice(Math.max(0, i - 80), i + 160)}`);
        console.log(`  after  …${as.slice(Math.max(0, i - 80), i + 160)}`);
      } else {
        console.log(`  before ${JSON.stringify(bv).slice(0, 400)}`);
        console.log(`  after  ${JSON.stringify(av).slice(0, 400)}`);
      }
    }
  }
  for (const url of Object.keys(after)) {
    if (!before[url]) console.log(`NEW      ${url} (not in the baseline)`);
  }
  for (const a of allow) {
    if (!Object.keys(before).includes(a.url)) console.log(`STALE ALLOW  ${a.url}  ${a.capture}`);
  }
  for (const [k, n] of notCompared) {
    console.log(`NOT COMPARED  ${k}  ${n} url(s): present on one side only`);
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
