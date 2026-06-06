import { blogsSection } from '@/lib/sitemap-sections';
import { buildUrlSet, xmlResponse } from '@/lib/sitemap';

export const dynamic = 'force-static';
export const revalidate = 3600;

/**
 * Blog posts sitemap — clean individual article URLs only (`/blogs/{slug}`).
 * No pagination (`?page=`) or category filter (`?category=`) URLs are emitted;
 * those stay crawlable via on-page links but are kept out of the XML. `lastmod`
 * uses each post's real updated date, falling back to its publish date.
 */
export function GET() {
  return xmlResponse(buildUrlSet(blogsSection.build(), blogsSection.label));
}
