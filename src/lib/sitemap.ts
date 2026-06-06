import { SITE_URL } from '@/constants';

/**
 * Sitemap building blocks shared by the sitemap index (`/sitemap.xml`) and the
 * per-content child sitemaps (`/sitemaps/*.xml`).
 *
 * Hard rule enforced here, not at the call sites: **no URL containing a query
 * string (`?`) or fragment (`#`) is ever emitted.** Paginated and filtered blog
 * URLs (`?page=`, `?category=`) stay fully crawlable through on-page links —
 * they're simply never submitted in XML. `buildUrlSet`/`buildSitemapIndex`
 * filter by pattern, so future query-bearing routes are excluded automatically.
 */

export type ChangeFreq =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

export interface SitemapUrl {
  /** Absolute URL or site-root-relative path (e.g. `/about`). */
  path: string;
  lastmod?: string | Date;
  changefreq?: ChangeFreq;
  priority?: number;
}

export interface SitemapIndexEntry {
  /** Path to a child sitemap (e.g. `/sitemaps/blogs.xml`). */
  path: string;
  lastmod?: string | Date;
  /** Content-type name shown in the browser view (e.g. `Blogs`). */
  label?: string;
  /** How many URLs the child sitemap holds, for the per-label count. */
  count?: number;
}

/** Browser-friendly stylesheet processing instruction, prepended to every doc. */
const STYLESHEET = '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>';

const URLSET_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';

/** Resolve a relative path against the canonical origin; pass through absolutes. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** XML-escape text destined for a `<loc>` (handles `&`, `<`, `>`, quotes). */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toIso(input?: string | Date): string {
  if (!input) return new Date().toISOString();
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/** Only clean, canonical URLs belong in a sitemap — reject query/fragment URLs. */
export function isCleanPath(path: string): boolean {
  return !path.includes('?') && !path.includes('#');
}

/**
 * Serialize a `<urlset>` document (one child sitemap's worth of page URLs).
 *
 * `label` is the human content-type name for this sitemap (e.g. `Blogs`). It's
 * emitted as an XML comment that `sitemap.xsl` reads to show a `<count> <label>`
 * pill in the browser view — crawlers ignore comments, so the XML stays valid.
 * Any new child sitemap gets a typed count for free just by passing a label.
 */
export function buildUrlSet(urls: SitemapUrl[], label?: string): string {
  const body = urls
    .filter((u) => isCleanPath(u.path))
    .map((u) => {
      const lines = [
        `    <loc>${escapeXml(absoluteUrl(u.path))}</loc>`,
        `    <lastmod>${toIso(u.lastmod)}</lastmod>`,
      ];
      if (u.changefreq) lines.push(`    <changefreq>${u.changefreq}</changefreq>`);
      if (u.priority != null)
        lines.push(`    <priority>${u.priority.toFixed(1)}</priority>`);
      return `  <url>\n${lines.join('\n')}\n  </url>`;
    })
    .join('\n');

  // Strip any `-` runs from the label so it can't break the XML comment.
  const labelComment = label
    ? `<!-- sitemap-label: ${label.replace(/-+/g, ' ').trim()} -->\n`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>\n${STYLESHEET}\n${labelComment}<urlset xmlns="${URLSET_NS}">\n${body}\n</urlset>\n`;
}

/**
 * Serialize a `<sitemapindex>` document linking the child sitemaps. Each
 * entry's `label`/`count` ride along as an XML comment so `sitemap.xsl` can show
 * a per-label breakdown and a grand total in the browser — crawlers ignore the
 * comments, so the index stays schema-valid.
 */
export function buildSitemapIndex(sitemaps: SitemapIndexEntry[]): string {
  const clean = sitemaps.filter((s) => isCleanPath(s.path));

  const body = clean
    .map((s) => {
      // `-` and `|` are stripped from the label so it can't break the comment
      // or the `section: <label> | <count>` delimiter the stylesheet parses.
      const meta =
        s.label != null || s.count != null
          ? `  <!-- section: ${(s.label ?? '').replace(/[-|]+/g, ' ').trim()} | ${s.count ?? 0} -->\n`
          : '';
      return `${meta}  <sitemap>\n    <loc>${escapeXml(absoluteUrl(s.path))}</loc>\n    <lastmod>${toIso(s.lastmod)}</lastmod>\n  </sitemap>`;
    })
    .join('\n');

  const hasCounts = clean.some((s) => s.count != null);
  const total = clean.reduce((sum, s) => sum + (s.count ?? 0), 0);
  const totalComment = hasCounts ? `<!-- sitemap-total: ${total} -->\n` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>\n${STYLESHEET}\n${totalComment}<sitemapindex xmlns="${URLSET_NS}">\n${body}\n</sitemapindex>\n`;
}

/** Wrap a serialized sitemap in a `Response` with the canonical XML headers. */
export function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
