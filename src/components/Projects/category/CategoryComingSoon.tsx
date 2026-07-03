import Link from 'next/link';
import { LuCompass as Compass, LuSend as Send } from 'react-icons/lu';

import Breadcrumb from '@/components/Breadcrumb';
import Button from '@/components/Button';
import Container from '@/components/ui/Container';
import Heading from '@/components/Heading';
import type { Crumb } from '@/components/Breadcrumb';
import CategoryVisual from '@/components/Services/visuals/CategoryVisual';
import { PROJECT_CATEGORIES } from '@/constants/projects';
import type { ProjectCategoryContent } from '../types';
import { pad2, latestYear } from '../utils';
import { SlateTag } from '../SlateTag';
import CaseSlateCard from './CaseSlateCard';

interface CategoryComingSoonProps {
  data: ProjectCategoryContent;
  crumbs: Crumb[];
}

// Order of the category set — drives the editorial index chip (e.g. 03 / 05).
const ORDER = Object.keys(PROJECT_CATEGORIES);

// The single newest project from every OTHER category that has shipped work —
// the live counterpart to this still-empty file. Mirrors Home/FeatureProjects:
// fully data-driven, so it fills out as each discipline publishes its first
// case study (and empty categories contribute nothing).
const latestPerCategory = (currentSlug: string) =>
  Object.values(PROJECT_CATEGORIES)
    .filter((c) => c.slug !== currentSlug && c.projects.length > 0)
    .map((c) => ({
      project: [...c.projects].sort(
        (a, b) => latestYear(b.year) - latestYear(a.year),
      )[0],
      categorySlug: c.slug,
    }));

/**
 * The "coming soon" state for a category with no published case studies yet:
 * the discipline's artwork dimmed behind a dashed panel (headline + body +
 * routes to the matching service page and contact), followed by the studio's
 * real latest work — the newest shipped case study from every other discipline
 * — so an empty file still proves work rather than listing placeholder
 * engagements. Leads the page on empty categories, so it owns the breadcrumb
 * and an sr-only <h1> (the visible headlines stay h2, same pattern as the hub's
 * ArchiveStacks). Designed and indexable — never blank.
 */
const CategoryComingSoon = ({ data, crumbs }: CategoryComingSoonProps) => {
  const { comingSoon } = data;

  const position = ORDER.indexOf(data.slug) + 1;
  const latest = latestPerCategory(data.slug);

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
            className="shrink-0 rounded-full px-3 py-1.5 text-black/60"
          >
            {pad2(position)} / {pad2(ORDER.length)}
          </SlateTag>
        </div>
      </Container>

      <Container>
        <div className="media-adaptive relative isolate overflow-hidden rounded-3xl">
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

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href={comingSoon.serviceHref}>
                  <Button variant="primary" icon={Compass} className="w-full sm:w-auto">
                    See the {data.title} Services
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    variant="secondary"
                    icon={Send}
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

      {/* The live counterpart — newest shipped case study from each discipline,
          so an empty file still proves real work. Shares CaseFileIndex's ink
          and grid, so the empty and populated category pages read as one. */}
      {latest.length > 0 && (
        <>
          {/* Connective register: in-progress file ↔ work on the record. The
              shared Heading gives the same mono-eyebrow / hairline / accented
              title band the live category pages use. */}
          <Heading
            titleTag="h2"
            seperatorTitle="Meanwhile — on the record"
            eyebrowRight={`${pad2(latest.length)} ${
              latest.length === 1 ? 'entry' : 'entries'
            }`}
            title="The latest from the studio archive."
            description={`While the ${data.title} file is in production, here’s the newest case study from each discipline already on the record.`}
            containerStyle="mt-12 sm:mt-16"
          />

          <Container>
            <div className="grid grid-cols-1 gap-x-5 gap-y-10 pt-10 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map(({ project, categorySlug }) => (
                <CaseSlateCard
                  key={`${categorySlug}-${project.slug}`}
                  project={project}
                  categorySlug={categorySlug}
                />
              ))}
            </div>
          </Container>
        </>
      )}
    </section>
  );
};

export default CategoryComingSoon;
