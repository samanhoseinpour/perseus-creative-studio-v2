import Container from '@/components/ui/Container';
import type { ProjectStat } from '../types';
import { SlateTag } from '../SlateTag';
import { cn } from '@/lib/utils';

interface ProjectHighlightsProps {
  /** Rendered only when non-empty (the page gates the section). */
  stats: ProjectStat[];
}

/** md+ column count tracks the number of highlights (2–5); static classes so
 *  Tailwind sees them. */
const GRID_BY_COUNT: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
};

/**
 * The results row — outcome figures at display scale, the Apple "get the
 * highlights" opener translated into the archive's register. Values are free
 * display strings ("+48%", "3.1M", "6 weeks") entered in /admin, so this is
 * pure server HTML: no CountUp, zero client JS. Footnoted figures carry an
 * Apple-style superscript linking to the page-bottom Notes block
 * (ProjectFootnotes numbers the same stats the same way — both derive from
 * the stats array's order, so the indices always agree).
 */
const ProjectHighlights = ({ stats }: ProjectHighlightsProps) => {
  if (stats.length === 0) return null;

  const footnoted = stats.filter((s) => s.footnote);
  const cols = GRID_BY_COUNT[Math.min(stats.length, 5)];

  return (
    <section className="pt-16 sm:pt-24">
      <Container>
        <div className="flex items-center gap-4">
          <SlateTag as="h2" size="md" className="whitespace-nowrap text-black/60">
            Highlights
          </SlateTag>
          <span aria-hidden className="h-px flex-1 bg-black/10" />
          <SlateTag className="whitespace-nowrap text-black/45">
            By the numbers
          </SlateTag>
        </div>

        <dl className={cn('mt-8 grid grid-cols-2 border-y border-black/10', cols)}>
          {stats.map((stat, i) => {
            const footnoteNumber = stat.footnote
              ? footnoted.indexOf(stat) + 1
              : null;
            return (
              <div
                key={`${stat.label}-${i}`}
                className={cn(
                  'px-1 py-7 md:px-6',
                  // Column hairlines: skip each row's first cell. Two-up on
                  // mobile, one row of `stats.length` from md.
                  i % 2 !== 0 ? 'border-l border-black/10' : '',
                  i !== 0 ? 'md:border-l md:border-black/10' : 'md:border-l-0',
                )}
              >
                <SlateTag as="dt" tracking="18" className="text-black/50">
                  {stat.label}
                </SlateTag>
                <dd className="mt-3 text-4xl font-semibold tracking-tighter tabular-nums text-black sm:text-5xl lg:text-6xl">
                  {stat.value}
                  {footnoteNumber !== null && (
                    <sup className="ml-1 text-sm font-normal tracking-normal text-black/40">
                      <a
                        href={`#fn-${footnoteNumber}`}
                        aria-label={`Footnote ${footnoteNumber}`}
                        className="transition-colors hover:text-black"
                      >
                        {footnoteNumber}
                      </a>
                    </sup>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </Container>
    </section>
  );
};

export default ProjectHighlights;
