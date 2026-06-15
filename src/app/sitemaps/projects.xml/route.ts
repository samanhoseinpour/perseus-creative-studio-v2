import { projectsSection, navFor } from '@/lib/sitemap-sections';
import { buildUrlSet, xmlResponse } from '@/lib/sitemap';

export const dynamic = 'force-static';
export const revalidate = 3600;

/**
 * Projects sitemap — the archive hub (`/projects`), every category drawer
 * (`/projects/{category}`), and every case study
 * (`/projects/{category}/{project}`), generated from the project registry so
 * adding a case study needs no sitemap edit and no listed URL can 404.
 */
export function GET() {
  return xmlResponse(buildUrlSet(projectsSection.build(), projectsSection.label, navFor(projectsSection.path)));
}
