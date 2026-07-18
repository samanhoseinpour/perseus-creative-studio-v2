import { SITEMAP_SECTIONS, navFor } from '@/lib/sitemap-sections';
import { buildSitemapIndex, xmlResponse, type SitemapIndexEntry } from '@/lib/sitemap';

export const dynamic = 'force-static';
export const revalidate = 3600;

/**
 * Sitemap **index** at `/sitemap.xml` — links the per-content child sitemaps,
 * Rank Math style. Each entry carries its label and live URL count (computed
 * from the same registry the child routes use), so the browser view shows a
 * per-label breakdown and a total. Empty sections are omitted automatically.
 * Submit this single URL to Search Console.
 */
export async function GET() {
  const entries: SitemapIndexEntry[] = (
    await Promise.all(
      SITEMAP_SECTIONS.map(async (section) => ({
        path: section.path,
        label: section.label,
        count: (await section.build()).length,
        lastmod: await section.lastmod(),
      })),
    )
  ).filter((entry) => (entry.count ?? 0) > 0);

  return xmlResponse(buildSitemapIndex(entries, await navFor()));
}
