import Link from 'next/link';
import { LuArrowUpRight as ArrowUpRight } from 'react-icons/lu';

import Breadcrumb from '@/components/Breadcrumb';
import Container from '@/components/ui/Container';
import type { Crumb } from '@/components/Breadcrumb';
import { pad2 as pad, yearRange } from '@/components/Projects/utils';
import { SlateTag } from '@/components/Projects/SlateTag';
import CategoryVisual from '@/components/Services/visuals/CategoryVisual';
import { PROJECT_CATEGORIES } from '@/constants/projects';

interface ArchiveStacksProps {
  crumbs: Crumb[];
}

/**
 * The whole /projects hub in one viewport: five floor-to-ceiling panels seen
 * edge-on, butted seamlessly, filling everything below the fixed navbar. Every
 * panel face shows its discipline's CategoryVisual photograph behind a dimming
 * veil, with the position index and the title running vertically up the
 * spine. The breadcrumb + tally register is an overlay band across the top of
 * the wall. Hover/focus pulls a panel open — the column eases
 * wider (animated flex-grow), the veil thins so the photo comes up to full
 * brightness, and the description slides out while sibling panels dim. Below
 * lg the panels stack as five rows in the same viewport. CSS-only reveal, so
 * this stays a server component. The panels are real photographs, so the wall
 * is `media-pinned` — on-media ink stays light and the scrim veils stay dark
 * in both themes (no per-theme flip).
 */
const ArchiveStacks = ({ crumbs }: ArchiveStacksProps) => {
  const categories = Object.values(PROJECT_CATEGORIES);
  const projectCount = categories.reduce((n, c) => n + c.projects.length, 0);

  // Below lg the viewport is a minimum, not a cage: rows never shrink below
  // their text (short windows scroll a little instead of clipping the tallies
  // into the row below). lg+ keeps the exact one-viewport panel wall.
  return (
    <section className="flex min-h-svh flex-col pt-(--header-row-height) lg:h-svh lg:min-h-[560px]">
      <h1 className="sr-only">
        Projects — the Perseus archive, filed by discipline
      </h1>

      <div className="media-pinned relative flex-1 lg:min-h-0">
        {/* Register band — overlay across the top of the panel wall, riding
            the wall's pinned light on-media ink in both themes */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-4 sm:px-6">
          <Container className="flex items-baseline justify-between gap-4">
            <div className="pointer-events-auto">
              <Breadcrumb crumbs={crumbs} onMedia />
            </div>
            <SlateTag as="p" className="whitespace-nowrap text-on-media/55">
              {pad(categories.length)} categories · {pad(projectCount)} projects
            </SlateTag>
          </Container>
        </div>

        {/* The stacks */}
        <ul className="group/stacks flex h-full flex-col bg-scrim lg:flex-row">
          {categories.map((c, i) => {
            const range = yearRange(c);
            const live = c.projects.length > 0;

            return (
              <li
                key={c.slug}
                className="basis-0 grow transition-[flex-grow,opacity] lg:min-h-0 duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] lg:hover:grow-[2.4] lg:has-focus-visible:grow-[2.4] lg:group-has-[li:hover]/stacks:not-[&:hover]:opacity-50 lg:group-has-[li:has(:focus-visible)]/stacks:not-[&:hover]:opacity-50 lg:has-focus-visible:opacity-100!"
              >
                <Link
                  href={`/projects/${c.slug}`}
                  className="group/col relative isolate block h-full overflow-hidden outline-none"
                >
                  {/* Panel face — the discipline's photograph behind a
                      dimming veil that thins on hover (the photo "brightens") */}
                  <div aria-hidden className="absolute inset-0 -z-10">
                    <CategoryVisual slug={c.slug} variant="card" />
                    <span className="absolute inset-0 bg-scrim/55 transition-colors duration-700 ease-out group-hover/col:bg-scrim/10 group-focus-visible/col:bg-scrim/10" />
                    <span className="absolute inset-0 bg-linear-to-t from-scrim/80 via-scrim/25 to-transparent" />
                  </div>

                  {/* Only the first row sits under the register band below lg;
                      every column reaches it on lg+. Below lg the text column
                      nests in the same outer-pad + Container pair as the
                      navbar so titles share its left edge; lg+ columns stay
                      full-bleed (vertical spines), so the container is
                      neutralized there. */}
                  <div
                    className={`h-full px-4 sm:px-6 lg:px-0 ${
                      i === 0 ? 'pt-12 lg:pt-0' : ''
                    }`}
                  >
                    <Container className="flex h-full flex-col pt-4 pb-6 lg:max-w-none lg:p-6 lg:pt-16">
                      {/* Spine label — the category's position in the set */}
                      <SlateTag
                        as="div"
                        aria-hidden
                        className="text-on-media/55 transition-colors duration-500 group-hover/col:text-on-media/85 group-focus-visible/col:text-on-media/85"
                      >
                        {pad(i + 1)} / {pad(categories.length)}
                      </SlateTag>

                      {/* Title — horizontal row below lg, vertical spine on lg+ */}
                      <h2 className="mt-auto text-3xl font-semibold tracking-tighter text-on-media/90 transition-colors duration-500 group-hover/col:text-on-media group-focus-visible/col:text-on-media sm:text-4xl lg:rotate-180 lg:[writing-mode:vertical-rl] xl:text-5xl">
                        {c.title}
                      </h2>

                      {/* Category description — slides open on hover/focus (lg+) */}
                      <div className="hidden lg:grid lg:grid-rows-[0fr] lg:transition-[grid-template-rows] lg:duration-700 lg:ease-[cubic-bezier(0.76,0,0.24,1)] lg:group-hover/col:grid-rows-[1fr] lg:group-focus-visible/col:grid-rows-[1fr]">
                        <div className="overflow-hidden">
                          <p className="w-72 pt-5 text-sm text-on-media/0 transition-colors delay-100 duration-400 group-hover/col:text-on-media/85 group-focus-visible/col:text-on-media/85 xl:w-80">
                            {c.description}
                          </p>
                        </div>
                      </div>

                      {/* Tally line */}
                      <div className="flex items-end justify-between gap-3 pt-3 lg:pt-5">
                        {live ? (
                          <SlateTag
                            tracking="18"
                            className="whitespace-nowrap text-on-media/55 transition-colors duration-500 group-hover/col:text-on-media/85 group-focus-visible/col:text-on-media/85"
                          >
                            {pad(c.projects.length)} projects
                            {range ? ` · ${range}` : ''}
                          </SlateTag>
                        ) : (
                          <SlateTag className="-rotate-2 rounded-sm border border-dashed border-on-media/35 px-2 py-1 whitespace-nowrap text-on-media/65 transition-colors duration-500 group-hover/col:border-on-media/55 group-hover/col:text-on-media/90 group-focus-visible/col:border-on-media/55 group-focus-visible/col:text-on-media/90">
                            In production
                          </SlateTag>
                        )}
                        <span
                          aria-hidden
                          className="text-on-media/60 lg:grid lg:size-9 lg:shrink-0 lg:place-items-center lg:rounded-full lg:bg-on-media/10 lg:text-on-media lg:opacity-0 lg:backdrop-blur-sm lg:transition-opacity lg:delay-100 lg:duration-300 lg:group-hover/col:opacity-100 lg:group-focus-visible/col:opacity-100"
                        >
                          <ArrowUpRight className="size-4" />
                        </span>
                      </div>
                    </Container>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default ArchiveStacks;
