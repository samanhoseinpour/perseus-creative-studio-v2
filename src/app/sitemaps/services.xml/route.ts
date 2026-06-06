import { servicesSection } from '@/lib/sitemap-sections';
import { buildUrlSet, xmlResponse } from '@/lib/sitemap';

export const dynamic = 'force-static';
export const revalidate = 3600;

/**
 * Services sitemap — service category landing pages (`/services/{category}`) and
 * every per-service detail page (`/services/{category}/{service}`), generated
 * from the service registries so adding a service needs no sitemap edit and no
 * listed URL can 404.
 */
export function GET() {
  return xmlResponse(buildUrlSet(servicesSection.build(), servicesSection.label));
}
