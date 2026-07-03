import Link from 'next/link';
import {
  LuArrowUpRight as ArrowUpRight,
  LuLayoutGrid as LayoutGrid,
  LuMapPin as MapPin,
} from 'react-icons/lu';

import Button from '@/components/Button';
import Container from '@/components/ui/Container';
import Heading from '@/components/Heading';
import Img from '@/components/Img';
import type { FeaturedProjectEntry } from '@/components/Projects/types';
import { pad2 } from '@/components/Projects/utils';
import { cn } from '@/lib/utils';
import { clientLogoDisc } from '@/utils/images';

/**
 * Cross-route "latest projects" showcase — an Apple-style featured hero + trio.
 * The single most-recent project leads as a large cinematic tile; up to three
 * more sit beneath. Every tile is a real project cover rendered edge-to-edge
 * with the case-file register (mono DISCIPLINE · YEAR eyebrow, the client mark +
 * name, the project title, its one-line engagement summary, and location)
 * printed over a `from-scrim` gradient — so it reads in both themes on the
 * default photo polarity (light `on-media` ink, dark `scrim` veil), without
 * `.media-adaptive`.
 *
 * Server component (no hooks). Fed by the selectors in `@/constants/projects`
 * (`getLatestAcrossCategories` / `getCategoryProjects` / `getServiceProjects`), so the
 * scope — all disciplines, one discipline, or one service — is the caller's
 * choice. Renders nothing for an empty `entries`. Distinct from the home
 * marquee (`FeatureProjects`) and the dark inset-plate `CaseSlateCard`.
 *
 * Project detail routes are torn down, so each tile links to the live category
 * index `/projects/<categorySlug>`.
 */

interface ShowcaseCardProps {
  entry: FeaturedProjectEntry;
  /** The lead tile — larger frame and type, plus a "Latest" pill. */
  featured?: boolean;
  /** Lead the eyebrow with the discipline (mixed scopes) instead of the industry. */
  showDiscipline?: boolean;
}

const ShowcaseCard = ({
  entry,
  featured = false,
  showDiscipline = false,
}: ShowcaseCardProps) => {
  const { project, categorySlug, categoryTitle } = entry;
  // On a single-discipline scope the discipline is redundant, so the eyebrow
  // leads with the project's industry for variety; mixed scopes (About) lead
  // with the discipline. Year always trails.
  const label = showDiscipline ? categoryTitle : project.industry;
  // Mixed-polarity client marks: pick the disc ground that never clashes with
  // the logo's own (none / light / dark), the same rule CaseSlateCard uses.
  const logoDisc = clientLogoDisc(project.clientLogoUrl);

  return (
    <Link
      href={`/projects/${categorySlug}`}
      aria-label={`${project.title} — ${categoryTitle} project`}
      className={cn(
        'group relative isolate flex overflow-hidden rounded-3xl outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-black/40',
        featured
          ? 'aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/7]'
          : 'aspect-[4/3]',
      )}
    >
      <Img
        src={project.coverImageUrl}
        alt={project.coverImageAlt}
        fill
        sizes={
          featured
            ? '(min-width: 1240px) 1192px, 100vw'
            : '(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw'
        }
        className="rounded-none object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />

      {/* Scrims — a strong bottom veil for the title, a soft top one for the
          eyebrow. Default polarity keeps `scrim` dark on the photo in both themes. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-scrim/95 via-scrim/55 to-transparent"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-scrim/50 to-transparent"
      />

      <div
        className={cn(
          'relative z-10 flex w-full flex-col justify-between gap-4',
          featured ? 'p-6 sm:p-8' : 'p-5',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="eyebrow text-[10px] text-on-media/80">
            {label} · {project.year}
          </span>
          {featured && (
            <span className="shrink-0 rounded-full border border-on-media/30 bg-on-media/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-on-media/85 backdrop-blur-sm">
              Latest
            </span>
          )}
        </div>

        <div className="space-y-2.5">
          {/* Who it was for — client mark + name, mirroring the CaseSlateCard
              call sheet, so a tile reads as more than a bare project name. */}
          <div className="flex items-center gap-2">
            {project.clientLogoUrl && (
              <span
                className={cn(
                  'flex shrink-0 items-center justify-center overflow-hidden rounded-full',
                  featured ? 'size-7' : 'size-6',
                  logoDisc === 'light' && 'bg-on-media',
                  logoDisc === 'dark' && 'bg-scrim',
                )}
              >
                <Img
                  src={project.clientLogoUrl}
                  alt={`${project.client} logo`}
                  width={56}
                  height={56}
                  className="h-full w-full rounded-none object-contain"
                />
              </span>
            )}
            <span className="min-w-0 truncate text-[11px] text-on-media/70">
              {project.client}
            </span>
          </div>

          <div className="flex items-end justify-between gap-4">
            <h3
              className={cn(
                'font-semibold tracking-tight text-on-media',
                featured
                  ? 'max-w-2xl text-2xl sm:text-3xl lg:text-4xl'
                  : 'text-lg sm:text-xl',
              )}
            >
              {project.title}
            </h3>
            <span
              aria-hidden
              className={cn(
                'grid shrink-0 place-items-center rounded-full bg-on-media/15 text-on-media backdrop-blur-sm transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5',
                featured ? 'size-11' : 'size-9',
              )}
            >
              <ArrowUpRight className={featured ? 'size-5' : 'size-4'} />
            </span>
          </div>

          {/* The detail — the same engagement summary the slate cards carry,
              clamped so even busy covers stay readable. */}
          <p
            className={cn(
              'line-clamp-2 text-on-media/75',
              featured
                ? 'max-w-xl text-sm leading-relaxed'
                : 'text-xs leading-relaxed',
            )}
          >
            {project.summary}
          </p>

          {project.location && (
            <span className="inline-flex min-w-0 max-w-full items-center gap-1 text-[10px] text-on-media/60">
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{project.location}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

interface ProjectShowcaseProps {
  /** Already recency-sorted; the first is the hero, the next three the trio. */
  entries: FeaturedProjectEntry[];
  /** Mono separator label (left of the heading rule). */
  seperatorTitle?: string;
  /** Mono label right of the heading rule. Defaults to the project count. */
  eyebrowRight?: string;
  title: string;
  titleAccent?: string;
  description: string;
  /** Where "view all" leads, e.g. `/projects` or `/projects/<categorySlug>`. */
  viewAllHref: string;
  viewAllLabel?: string;
  /** Lead each tile's eyebrow with the discipline (on for mixed scopes). */
  showDiscipline?: boolean;
}

const ProjectShowcase = ({
  entries,
  seperatorTitle = 'Selected Work',
  eyebrowRight,
  title,
  titleAccent,
  description,
  viewAllHref,
  viewAllLabel = 'Browse all projects',
  showDiscipline = false,
}: ProjectShowcaseProps) => {
  if (entries.length === 0) return null;

  const [hero, ...rest] = entries;
  const trio = rest.slice(0, 3);

  // Match the trio's columns to its count so a short scope (e.g. Matterport's
  // three, or a two-tile fallback) stays balanced rather than leaving an empty
  // cell in a fixed 3-up grid.
  const trioCols =
    trio.length >= 3
      ? 'sm:grid-cols-2 lg:grid-cols-3'
      : trio.length === 2
        ? 'sm:grid-cols-2'
        : 'grid-cols-1';

  return (
    <section className="py-16">
      <Heading
        titleTag="h2"
        seperatorTitle={seperatorTitle}
        eyebrowRight={eyebrowRight ?? `${pad2(entries.length)} projects`}
        title={title}
        titleAccent={titleAccent}
        description={description}
        containerStyle="mb-10"
      />

      <Container>
        <div className="flex flex-col gap-3 sm:gap-4">
          <ShowcaseCard entry={hero} featured showDiscipline={showDiscipline} />
          {trio.length > 0 && (
            <div className={cn('grid gap-3 sm:gap-4', trioCols)}>
              {trio.map((entry) => (
                <ShowcaseCard
                  key={`${entry.categorySlug}-${entry.project.slug}`}
                  entry={entry}
                  showDiscipline={showDiscipline}
                />
              ))}
            </div>
          )}
        </div>
      </Container>

      <Container className="mt-10 flex justify-center">
        <Link href={viewAllHref} aria-label={viewAllLabel}>
          <Button size="medium" icon={LayoutGrid} tabIndex={-1}>
            {viewAllLabel}
          </Button>
        </Link>
      </Container>
    </section>
  );
};

export default ProjectShowcase;
