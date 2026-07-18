import { projectsSection, navFor } from '@/lib/sitemap-sections';
import { buildUrlSet, xmlResponse } from '@/lib/sitemap';

export const dynamic = 'force-static';
export const revalidate = 3600;

/**
 * Projects sitemap — the archive hub (`/projects`) and every category drawer
 * (`/projects/{category}`) from the chrome registry, plus every live case
 * study (`/projects/{category}/{project}`) from the DB-backed projectsStore
 * (public + detail-ready, real last-edit lastmod) — so publishing a case
 * study in /admin needs no sitemap edit and no listed URL can 404.
 */
export async function GET() {
  return xmlResponse(buildUrlSet(await projectsSection.build(), projectsSection.label, await navFor(projectsSection.path)));
}
