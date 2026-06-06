import { authorsSection } from '@/lib/sitemap-sections';
import { buildUrlSet, xmlResponse } from '@/lib/sitemap';

export const dynamic = 'force-static';
export const revalidate = 3600;

/**
 * Author profile sitemap — clean author profile URLs only
 * (`/blogs/authors/{slug}`), one per Perseus author. Author pagination
 * (`?page=2`, …) is excluded — it stays crawlable through the profile's "More
 * articles" links, just not submitted in XML. `lastmod` reflects the author's
 * most recently updated post.
 */
export function GET() {
  return xmlResponse(buildUrlSet(authorsSection.build(), authorsSection.label));
}
