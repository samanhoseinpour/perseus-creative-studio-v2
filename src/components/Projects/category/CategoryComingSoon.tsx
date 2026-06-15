import Link from 'next/link';
import { LuArrowRight as ArrowRight } from 'react-icons/lu';

import { Breadcrumb, Button, Container } from '@/components';
import type { Crumb } from '@/components';
import CategoryVisual from '@/components/Services/visuals/CategoryVisual';
import { PROJECT_CATEGORIES } from '@/constants/projects';
import type { ProjectCategoryContent } from '../types';
import { pad2 } from '../utils';
import { SlateTag } from '../SlateTag';

interface CategoryComingSoonProps {
  data: ProjectCategoryContent;
  crumbs: Crumb[];
}

// Order of the category set — drives the editorial index chip (e.g. 03 / 05).
const ORDER = Object.keys(PROJECT_CATEGORIES);

/**
 * The "coming soon" state for a category with no published case studies yet:
 * the discipline's artwork dimmed behind a dashed panel that lists the
 * anonymized engagements currently underway, with routes to the matching
 * service page and contact. Leads the page on empty categories, so it owns the
 * breadcrumb and an sr-only <h1> (the visible headline stays an h2, same
 * pattern as the hub's ArchiveStacks). Designed and indexable — never blank.
 */
const CategoryComingSoon = ({ data, crumbs }: CategoryComingSoonProps) => {
  const { comingSoon } = data;

  const position = ORDER.indexOf(data.slug) + 1;

  return (
    <section id="case-files" className="scroll-mt-24">
      <h1 className="sr-only">{data.title} projects — coming soon</h1>

      {/* Breadcrumb + index chip — the page's opening row */}
      <Container className="mb-8 sm:mb-10">
        <div className="flex items-start justify-between gap-4">
          <div className="[&_nav]:mb-0">
            <Breadcrumb crumbs={crumbs} />
          </div>
          <SlateTag
            aria-hidden
            className="shrink-0 rounded-full px-3 py-1.5 text-black/60 ring-1 ring-inset ring-black/10"
          >
            {pad2(position)} / {pad2(ORDER.length)}
          </SlateTag>
        </div>
      </Container>

      <Container>
        <div className="media-adaptive relative isolate overflow-hidden rounded-3xl ring-1 ring-inset ring-black/10">
          {/* Dimmed category artwork */}
          <div aria-hidden className="absolute inset-0 -z-10 opacity-50">
            <CategoryVisual slug={data.slug} variant="card" />
          </div>
          <span
            aria-hidden
            className="absolute inset-0 -z-10 bg-linear-to-t from-scrim/90 via-scrim/70 to-scrim/45"
          />

          <div className="p-6 sm:p-10 lg:p-14">
            {/* Coming-soon panel */}
            <div className="rounded-2xl border border-dashed border-on-media/30 p-6 sm:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <SlateTag as="p" className="text-on-media/60">
                  {data.title} · In progress
                </SlateTag>
                <SlateTag className="-rotate-2 rounded-sm border border-dashed border-on-media/40 px-2.5 py-1 text-on-media/75">
                  Coming soon
                </SlateTag>
              </div>

              <h2 className="mt-6 max-w-2xl text-3xl font-semibold tracking-tighter text-on-media sm:text-4xl">
                {comingSoon.headline}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-on-media/70 sm:text-base">
                {comingSoon.body}
              </p>

              {/* In-production register */}
              <ul className="mt-10 border-t border-on-media/15">
                {comingSoon.inProduction.map((row, i) => (
                  <li
                    key={`${row.industry}-${i}`}
                    className="flex items-baseline gap-4 border-b border-on-media/15 py-4 sm:gap-8"
                  >
                    <SlateTag className="w-16 shrink-0 text-on-media/40 sm:w-24">
                      {pad2(i + 1)}
                    </SlateTag>
                    <span className="flex-1 text-base font-medium tracking-tight text-on-media sm:text-lg">
                      {row.industry}
                    </span>
                    <SlateTag
                      tracking="18"
                      className="flex shrink-0 items-center gap-2.5 text-on-media/65"
                    >
                      <span aria-hidden className="relative flex size-1.5">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-on-media/50" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-on-media/90" />
                      </span>
                      {row.stage}
                    </SlateTag>
                  </li>
                ))}
              </ul>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href={comingSoon.serviceHref}>
                  <Button variant="primary" className="w-full sm:w-auto">
                    See the {data.title} Services
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    variant="secondary"
                    icon={ArrowRight}
                    className="w-full bg-white sm:w-auto"
                  >
                    Start your project
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default CategoryComingSoon;
