import Link from 'next/link';
import type { IconType } from 'react-icons';
import {
  LuChevronLeft as ChevronLeft,
  LuChevronRight as ChevronRight,
} from 'react-icons/lu';

import {
  Breadcrumb,
  ClearFilters,
  Container,
  FilterRail,
  Heading,
  PaginationScroll,
  ResultCount,
} from '@/components';
import type { Crumb } from '@/components';
import { cn } from '@/lib/utils';
import { PROJECT_CATEGORIES } from '@/constants/projects';
import { getPageNumbers } from '@/utils/pagination';
import {
  ALL_FACET_ICON,
  getIndustryIcon,
  getServiceIcon,
  LOCATION_FACET_ICON,
} from '@/utils/projectFilterIcons';
import type { ProjectCategoryContent, ProjectSummary } from '../types';
import { latestYear, pad2, slugify } from '../utils';
import CaseSlateCard from './CaseSlateCard';

interface CaseFileIndexProps {
  data: ProjectCategoryContent;
  crumbs: Crumb[];
  /** Server-read URL state (?service= / ?industry= / ?location=) — keeps the
   *  filtered grid in the initial HTML without a useSearchParams() CSR bailout. */
  initialService?: string;
  initialIndustry?: string;
  initialLocation?: string;
  /** Server-read ?page= — the grid pages at 9 projects, like the /blogs hub. */
  initialPage?: number;
}

// Order of the category set — drives the editorial index chip (e.g. 03 / 05).
const ORDER = Object.keys(PROJECT_CATEGORIES);

// Projects per page — the grid pages once a category carries more than this.
const PROJECT_PAGE_SIZE = 9;

interface Facet {
  slug: string;
  label: string;
  count: number;
}

/** Distinct facet values with counts, in first-appearance order. */
function buildFacets(values: string[]): Facet[] {
  const map = new Map<string, Facet>();
  for (const label of values) {
    const slug = slugify(label);
    const existing = map.get(slug);
    if (existing) existing.count += 1;
    else map.set(slug, { slug, label, count: 1 });
  }
  return Array.from(map.values());
}

/** Keep the active pill on its rail even when the cross-filter zeroes it out,
 *  so an empty combination still shows a deselectable selection (count 0)
 *  instead of the pill vanishing. Label recovered from the full value list. */
function ensureActive(
  facets: Facet[],
  activeSlug: string,
  allValues: string[],
): Facet[] {
  if (!activeSlug || facets.some((f) => f.slug === activeSlug)) return facets;
  const label = allValues.find((v) => slugify(v) === activeSlug) ?? activeSlug;
  return [...facets, { slug: activeSlug, label, count: 0 }];
}

/**
 * The category's full project index and the page's opening band — owns the
 * breadcrumb and the <h1>. Every project, filterable by the services on the
 * engagement and the industry it served. Filters are URL state (?service= /
 * ?industry=) carried by plain links — the server re-renders the grid, so the
 * filtered list is always in the HTML; the only client JS is FilterRail's
 * re-center of the active pill. Each group is a single-line scroll rail (never
 * wraps). Sorted newest-first. Anchored (#case-files) for in-page links.
 */
const CaseFileIndex = ({
  data,
  crumbs,
  initialService = '',
  initialIndustry = '',
  initialLocation = '',
  initialPage = 1,
}: CaseFileIndexProps) => {
  if (data.projects.length === 0) return null;

  const position = ORDER.indexOf(data.slug) + 1;

  const basePath = `/projects/${data.slug}`;

  // Filter tokens are honoured as-is: a service, industry, or location the
  // category doesn't hold yet (e.g. an industry linked from the home carousel
  // before that project is published) renders the "no projects match · clear
  // filters" empty state rather than silently falling back to the full grid.
  const activeService = initialService;
  const activeIndustry = initialIndustry;
  const activeLocation = initialLocation;

  // Faceted drill-down across three groups (service · industry · location).
  // Each rail's options are conditioned on the *other two* rails' active
  // filters, so a selection in one group narrows the choices in the others
  // (and never produces a dead, zero-result combination). A group is
  // intentionally NOT scoped by its own filter, so picking a service still
  // shows every sibling service available for the active industry/location.
  const matchService = (p: ProjectSummary) =>
    !activeService ||
    (p.services ?? []).some((s) => slugify(s) === activeService);
  const matchIndustry = (p: ProjectSummary) =>
    !activeIndustry || slugify(p.industry) === activeIndustry;
  const matchLocation = (p: ProjectSummary) =>
    !activeLocation ||
    (p.location ? slugify(p.location) === activeLocation : false);

  // Each group's options come from the projects matching the *other two*
  // active filters. Facets absent from the scoped subset simply don't appear,
  // and the remaining counts are contextual to the active cross-filters.
  // `ensureActive` keeps the current selection on its rail even when the
  // cross-filter zeroes it out.
  const serviceFacets = ensureActive(
    buildFacets(
      data.projects
        .filter((p) => matchIndustry(p) && matchLocation(p))
        .flatMap((p) => p.services ?? []),
    ),
    activeService,
    data.projects.flatMap((p) => p.services ?? []),
  );
  const industryFacets = ensureActive(
    buildFacets(
      data.projects
        .filter((p) => matchService(p) && matchLocation(p))
        .map((p) => p.industry),
    ),
    activeIndustry,
    data.projects.map((p) => p.industry),
  );
  // Location is optional per project, so the rail is built only from the ones
  // that disclose a place. The group is rendered (below) only when the
  // category holds ≥2 distinct locations — a single-location rail isn't worth
  // a row.
  const locationValues = data.projects
    .map((p) => p.location)
    .filter((l): l is string => Boolean(l));
  const locationFacets = ensureActive(
    buildFacets(
      data.projects
        .filter((p) => matchService(p) && matchIndustry(p))
        .map((p) => p.location)
        .filter((l): l is string => Boolean(l)),
    ),
    activeLocation,
    locationValues,
  );
  const showLocation = new Set(locationValues.map(slugify)).size >= 2;

  const filtered = data.projects
    .filter((p) => matchService(p) && matchIndustry(p) && matchLocation(p))
    .sort((a, b) => latestYear(b.year) - latestYear(a.year));

  const activeFilterCount = [
    activeService,
    activeIndustry,
    activeLocation,
  ].filter(Boolean).length;
  const filtering = activeFilterCount > 0;

  // Page the filtered set at 9. activePage is clamped so a stale ?page= (or a
  // filter that shrank the list) snaps to the last real page instead of an
  // empty grid.
  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PROJECT_PAGE_SIZE),
  );
  const activePage = Math.min(Math.max(1, Math.floor(initialPage)), totalPages);
  const paginated = filtered.slice(
    (activePage - 1) * PROJECT_PAGE_SIZE,
    activePage * PROJECT_PAGE_SIZE,
  );

  /** Pill href — swaps one group's value, preserves the others, drops "all". */
  const createHref = (
    group: 'service' | 'industry' | 'location',
    slug: string | null,
  ) => {
    const params = new URLSearchParams();
    const service = group === 'service' ? slug : activeService;
    const industry = group === 'industry' ? slug : activeIndustry;
    const location = group === 'location' ? slug : activeLocation;
    if (service) params.set('service', service);
    if (industry) params.set('industry', industry);
    if (location) params.set('location', location);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  /** Page href — keeps the active filters, drops ?page= for page 1. */
  const createPageHref = (page: number) => {
    const params = new URLSearchParams();
    if (activeService) params.set('service', activeService);
    if (activeIndustry) params.set('industry', activeIndustry);
    if (activeLocation) params.set('location', activeLocation);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const pillClass = (active: boolean) =>
    cn(
      'inline-flex shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[10px] transition-colors',
      active
        ? 'bg-black text-white'
        : 'bg-black/10 text-black hover:bg-black/20',
    );

  const filterGroups: {
    key: 'service' | 'industry' | 'location';
    label: string;
    facets: Facet[];
    active: string;
    /** Resolves a pill's leading glyph from its label. */
    icon: (label: string) => IconType;
  }[] = [
    {
      key: 'service',
      label: 'Service',
      facets: serviceFacets,
      active: activeService,
      icon: getServiceIcon,
    },
    {
      key: 'industry',
      label: 'Industry',
      facets: industryFacets,
      active: activeIndustry,
      icon: getIndustryIcon,
    },
    // Location only when the category spans ≥2 places — no lonely one-pill rail.
    ...(showLocation
      ? [
          {
            key: 'location' as const,
            label: 'Location',
            facets: locationFacets,
            active: activeLocation,
            icon: () => LOCATION_FACET_ICON,
          },
        ]
      : []),
  ];

  return (
    <section id="case-files" className="scroll-mt-24">
      {/* Breadcrumb + index chip — the page's opening row */}
      <Container className="mb-8 sm:mb-10">
        <div className="flex items-start justify-between gap-4">
          <div className="[&_nav]:mb-0">
            <Breadcrumb crumbs={crumbs} />
          </div>
          <span
            aria-hidden
            className="shrink-0 rounded-full px-3 py-1 text-[10px] tabular-nums text-black/60"
          >
            {pad2(position)} / {pad2(ORDER.length)}
          </span>
        </div>
      </Container>

      <Heading
        titleTag="h1"
        seperatorTitle="Selected work"
        eyebrowRight={`${pad2(data.projects.length)} projects`}
        title={`${data.title} work, on the record.`}
        titleAccent="Filter by service, industry, or location."
        description={data.description}
        containerStyle="mb-10"
      />

      <Container>
        {/* Filter rails — one single-line scroll strip per facet group, so
            the rows never wrap no matter how many projects the category holds */}
        <div className="flex flex-col gap-3 border-t border-black/10 pt-6">
          {filterGroups.map((group) => (
            <div key={group.key} className="flex items-center gap-2 sm:gap-3">
              <span className="w-20 shrink-0 text-[10px] text-black/45">
                {group.label}
              </span>
              <FilterRail activeSlug={group.active}>
                <Link
                  href={createHref(group.key, null)}
                  scroll={false}
                  data-active={!group.active}
                  className={pillClass(!group.active)}
                >
                  <ALL_FACET_ICON
                    className="size-3 shrink-0 opacity-70"
                    aria-hidden
                  />
                  All
                </Link>
                {group.facets.map((f) => {
                  const Icon = group.icon(f.label);
                  return (
                    <Link
                      key={f.slug}
                      href={createHref(group.key, f.slug)}
                      scroll={false}
                      data-active={group.active === f.slug}
                      className={pillClass(group.active === f.slug)}
                    >
                      <Icon
                        className="size-3 shrink-0 opacity-70"
                        aria-hidden
                      />
                      <span className="leading-none">{f.label}</span>
                      <span
                        className={`leading-none tabular-nums ${
                          group.active === f.slug
                            ? 'text-white/60'
                            : 'text-black/50'
                        }`}
                      >
                        {f.count}
                      </span>
                    </Link>
                  );
                })}
              </FilterRail>
            </div>
          ))}
        </div>

        {/* Tally line + a clear that drops every active slug at once */}
        <div className="mt-6 flex items-center justify-between gap-3 border-b border-black/10 pb-4">
          <ResultCount
            page={activePage}
            pageSize={PROJECT_PAGE_SIZE}
            total={filtered.length}
            noun="project"
          />
          {filtering && <ClearFilters href={basePath} />}
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center sm:py-24">
            <p className="text-sm font-semibold text-black/60">
              {activeFilterCount > 1
                ? 'No projects match this combination'
                : 'Nothing here yet'}
            </p>
            <p className="mt-3 text-sm text-black/60">
              {activeFilterCount > 1
                ? 'Nothing matches these filters at once — clear one and look again.'
                : 'Nothing’s filed here yet — clear the filter to see everything.'}
            </p>
            <ClearFilters href={basePath} variant="solid" className="mt-6" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-x-5 gap-y-10 pt-10 sm:grid-cols-2 lg:grid-cols-3">
              {paginated.map((p, i) => (
                <CaseSlateCard
                  key={p.slug}
                  project={p}
                  categorySlug={data.slug}
                  priority={!filtering && activePage === 1 && i === 0}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <nav
                aria-label="Project pagination"
                className="mt-12 flex flex-wrap items-center justify-center gap-1.5"
              >
                {activePage > 1 && (
                  <Link
                    href={createPageHref(activePage - 1)}
                    scroll={false}
                    rel="prev"
                    aria-label="Previous page"
                    className="inline-flex items-center gap-1 rounded-full bg-black/10 px-3 py-1.5 text-[10px] text-black transition-colors hover:bg-black/20"
                  >
                    <ChevronLeft className="h-3 w-3" aria-hidden />
                    Prev
                  </Link>
                )}

                {getPageNumbers(activePage, totalPages).map((p, i) =>
                  p === 'ellipsis' ? (
                    <span
                      key={`ellipsis-${i}`}
                      aria-hidden
                      className="px-1 text-[10px] text-black/40"
                    >
                      …
                    </span>
                  ) : p === activePage ? (
                    <span
                      key={p}
                      aria-current="page"
                      aria-label={`Page ${p}, current`}
                      className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-black px-2 text-[10px] tabular-nums text-white"
                    >
                      {p}
                    </span>
                  ) : (
                    <Link
                      key={p}
                      href={createPageHref(p)}
                      scroll={false}
                      aria-label={`Page ${p}`}
                      className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-black/10 px-2 text-[10px] tabular-nums text-black transition-colors hover:bg-black/20"
                    >
                      {p}
                    </Link>
                  ),
                )}

                {activePage < totalPages && (
                  <Link
                    href={createPageHref(activePage + 1)}
                    scroll={false}
                    rel="next"
                    aria-label="Next page"
                    className="inline-flex items-center gap-1 rounded-full bg-black/10 px-3 py-1.5 text-[10px] text-black transition-colors hover:bg-black/20"
                  >
                    Next
                    <ChevronRight className="h-3 w-3" aria-hidden />
                  </Link>
                )}
              </nav>
            )}

            <PaginationScroll page={activePage} targetId="case-files" />
          </>
        )}
      </Container>
    </section>
  );
};

export default CaseFileIndex;
