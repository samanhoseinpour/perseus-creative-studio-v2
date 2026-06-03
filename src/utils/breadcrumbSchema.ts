import { SITE_URL } from '@/constants';
import type { Crumb } from '@/components/Breadcrumb';

/**
 * Build a schema.org BreadcrumbList node from the same Crumb[] that <Breadcrumb>
 * renders, so breadcrumb data lives in one place per page (no duplicate trail).
 *
 * Relative hrefs are absolutized against SITE_URL; the current (hrefless) crumb
 * uses the page canonical. The node `@id` is `${canonical}#breadcrumb` to match
 * the `breadcrumb: { '@id': … }` references on each page's WebPage/Article node.
 */
export function buildBreadcrumbList(crumbs: Crumb[], canonical: string) {
  const toItem = (href?: string) =>
    !href ? canonical : href === '/' ? SITE_URL : `${SITE_URL}${href}`;

  return {
    '@type': 'BreadcrumbList' as const,
    '@id': `${canonical}#breadcrumb`,
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem' as const,
      position: i + 1,
      name: c.label,
      item: toItem(c.href),
    })),
  };
}
