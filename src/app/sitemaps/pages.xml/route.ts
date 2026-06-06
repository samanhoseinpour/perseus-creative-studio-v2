import { pagesSection } from '@/lib/sitemap-sections';
import { buildUrlSet, xmlResponse } from '@/lib/sitemap';

export const dynamic = 'force-static';
export const revalidate = 3600;

/**
 * Static / core pages sitemap — hub and legal routes (incl. the /services hub).
 * Service, blog, and author URLs live in their own child sitemaps; nothing here
 * carries a query string, so no `?page=` / `?category=` URL can leak in.
 */
export function GET() {
  return xmlResponse(buildUrlSet(pagesSection.build(), pagesSection.label));
}
