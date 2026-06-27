import Link from 'next/link';
import { LuArrowUpRight } from 'react-icons/lu';

import { Container, Heading } from '@/components';
import CategoryVisual from '@/components/Services/visuals/CategoryVisual';
import { PROJECT_CATEGORIES } from '@/constants/projects';
import type { ProjectCategoryContent } from '../types';
import { pad2 } from '../utils';
import { SlateTag } from '../SlateTag';

interface OtherProjectCategoriesProps {
  /** Current category slug — excluded from the list. */
  currentSlug: string;
}

// Register order — spines keep their position number even when one is filtered out.
const ORDER = Object.keys(PROJECT_CATEGORIES);

/** "4 projects" / "In production" — the category's one-line status. */
function categoryStatus(c: ProjectCategoryContent): string {
  return c.projects.length > 0
    ? `${c.projects.length} projects`
    : 'In production';
}

/**
 * Cross-links the other categories as a rail of closed category fronts: narrow
 * vertical spines (position index, vertical title, register number) that pull
 * open on hover/focus — the spine grows, the discipline's bespoke
 * <CategoryVisual> fades in behind a scrim, and the title swings horizontal
 * with the project count. CSS-only (flex-grow + opacity transitions), so the
 * section stays a server component. Below lg the rail stacks into compact
 * ledger rows — no hover dependence on touch.
 */
const OtherProjectCategories = ({
  currentSlug,
}: OtherProjectCategoriesProps) => {
  const others = Object.values(PROJECT_CATEGORIES).filter(
    (c) => c.slug !== currentSlug,
  );
  if (others.length === 0) return null;

  return (
    <section className="pb-16 pt-16 sm:pb-24 sm:pt-24">
      <Heading
        titleTag="h2"
        seperatorTitle="More from the archive"
        eyebrowRight={`${others.length} more categories`}
        title="Browse another category."
        titleAccent="The rest of the studio's work."
        description="Most engagements touch more than one discipline — here's what the other categories hold."
        containerStyle="mb-10"
      />

      <Container>
        {/* lg+: the spine rail — hovered/focused category pulls open */}
        <div className="hidden h-[24rem] gap-2.5 lg:flex">
          {others.map((c) => {
            const num = pad2(ORDER.indexOf(c.slug) + 1);

            return (
              <Link
                key={c.slug}
                href={`/projects/${c.slug}`}
                className="media-adaptive group relative isolate flex-1 overflow-hidden rounded-3xl border border-black/10 bg-background-contrast outline-none transition-[flex-grow] duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] hover:flex-[2.5] focus-visible:flex-[2.5]"
              >
                {/* Open-category backdrop — artwork + scrim */}
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  <CategoryVisual slug={c.slug} variant="card" />
                  <span className="absolute inset-0 bg-linear-to-t from-scrim/80 via-scrim/30 to-transparent" />
                </div>

                {/* Closed category front — the accessible content */}
                <div className="flex h-full flex-col items-center justify-between py-6 transition-opacity duration-500 group-hover:opacity-0 group-focus-visible:opacity-0">
                  <SlateTag className="text-black/45">{num}</SlateTag>
                  <h3 className="whitespace-nowrap text-xl font-semibold tracking-tight text-black [writing-mode:vertical-rl]">
                    {c.title}
                  </h3>
                  <span aria-hidden className="font-mono text-[11px] text-black/30">
                    {pad2(ORDER.length)}
                  </span>
                </div>

                {/* Open-category contents — fades in after the pull */}
                <div
                  aria-hidden
                  className="absolute inset-0 flex flex-col justify-between p-6 opacity-0 transition-opacity delay-100 duration-400 group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  <div className="flex items-start justify-between gap-4">
                    <SlateTag className="text-on-media/75">
                      {num} / {pad2(ORDER.length)}
                    </SlateTag>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-on-media/10 text-on-media backdrop-blur-sm">
                      <LuArrowUpRight className="size-4" />
                    </span>
                  </div>
                  <div>
                    <span className="block whitespace-nowrap text-2xl font-semibold tracking-tight text-on-media">
                      {c.title}
                    </span>
                    <span className="mt-1 block whitespace-nowrap text-sm text-on-media/70">
                      {categoryStatus(c)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* <lg: compact ledger rows */}
        <ul className="border-t border-black/10 lg:hidden">
          {others.map((c) => (
            <li key={c.slug} className="border-b border-black/10">
              <Link
                href={`/projects/${c.slug}`}
                className="group flex items-center gap-4 py-5"
              >
                <SlateTag className="w-20 shrink-0 text-black/45">
                  {pad2(ORDER.indexOf(c.slug) + 1)} / {pad2(ORDER.length)}
                </SlateTag>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold tracking-tight text-black">
                    {c.title}
                  </h3>
                  <span className="mt-0.5 block text-sm text-black/55">
                    {categoryStatus(c)}
                  </span>
                </div>
                <LuArrowUpRight
                  aria-hidden
                  className="size-4 shrink-0 text-black/40 transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
};

export default OtherProjectCategories;
