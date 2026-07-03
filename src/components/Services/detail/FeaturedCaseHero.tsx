import Link from 'next/link';
import {
  LuArrowUpRight as ArrowUpRight,
  LuMapPin as MapPin,
} from 'react-icons/lu';

import BorderBeam from '@/components/ui/BorderBeam';
import Img from '@/components/Img';
import { cn } from '@/lib/utils';
import { clientLogoDisc } from '@/utils/images';
import type { ProjectSummary } from '../../Projects/types';
import { slugify } from '../../Projects/utils';

interface FeaturedCaseHeroProps {
  /** The case study fronting the hero, resolved from the live websites archive. */
  project: ProjectSummary;
}

/**
 * Websites service hero — a real shipped project as the "wow", in the film-slate
 * treatment lifted from the Projects archive (CaseSlateCard) and re-proportioned
 * for a hero: one photo-dark ambient surface (the cover blown out, blurred, and
 * scrimmed) carries a sharp inset cover plate, with a one-line call sheet printed
 * on the ambience below — client mark, client + title, where/when, the
 * engagement's discipline, and a link into the filtered archive. Leads a service
 * with proof instead of a placeholder browser frame; a service with no featured
 * project falls back to the SiteViewport chrome (see WebsitesServiceDetail).
 *
 * Shares the archive's DNA (Img blur/scrim layering, clientLogoDisc, BorderBeam)
 * so the two read as one family, and rides on-media tokens so ink stays legible
 * on the photo-dark surface in both themes. The project title is a styled
 * non-heading element on purpose — the page <h1> is the service headline, so an
 * <h3> here would trip the same H1→H3 order audit the blog pages guard against.
 * Stills only, by design.
 */
const FeaturedCaseHero = ({ project }: FeaturedCaseHeroProps) => {
  const logoDisc = clientLogoDisc(project.clientLogoUrl);

  // "View work" lands on the live websites archive filtered by this engagement's
  // discipline — the same token CaseFileIndex's service rail sets, so it's never
  // an empty view. Falls back to the bare archive when no service is tagged.
  const primaryService = project.services?.[0];
  const workHref = primaryService
    ? `/projects/websites?service=${slugify(primaryService)}`
    : '/projects/websites';

  return (
    <article className="group relative isolate overflow-hidden rounded-2xl sm:rounded-3xl">
      {/* Ambient backdrop — the cover blown out and blurred, under a scrim */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <Img
          src={project.coverImageUrl}
          alt=""
          fill
          sizes="(min-width: 1280px) 1240px, 100vw"
          className="rounded-none object-cover scale-110 blur-2xl"
        />
        <span className="absolute inset-0 bg-scrim/55" />
        <span className="absolute inset-0 bg-linear-to-t from-scrim/90 via-scrim/45 to-scrim/25" />
      </div>

      <div className="p-3 sm:p-4">
        {/* Register line — printed on the ambience above the plate */}
        <div className="flex items-center justify-between gap-3 px-1.5 pb-3 pt-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-on-media/60">
            Featured build · {project.year}
          </span>
          {project.location && (
            <span className="inline-flex min-w-0 items-center gap-1 text-[10px] text-on-media/60">
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{project.location}</span>
            </span>
          )}
        </div>

        {/* Sharp plate — the cover itself (the hero's LCP candidate) */}
        <div className="relative aspect-video overflow-hidden rounded-xl sm:rounded-2xl">
          <Img
            src={project.coverImageUrl}
            alt={project.coverImageAlt}
            fill
            priority
            sizes="(min-width: 1280px) 1200px, 100vw"
            className="rounded-none object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-black/35 to-transparent"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/45 to-transparent"
          />
        </div>

        {/* Call sheet — client identity + the way into the archive */}
        <div className="flex flex-col gap-4 px-1.5 pb-1 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {project.clientLogoUrl && (
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full',
                  logoDisc === 'light' && 'bg-on-media',
                  logoDisc === 'dark' && 'bg-scrim',
                )}
              >
                <Img
                  src={project.clientLogoUrl}
                  alt={`${project.client} logo`}
                  width={96}
                  height={96}
                  className="h-full w-full rounded-none object-contain"
                />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[11px] text-on-media/60">
                {project.client}
              </p>
              {/* Deliberately not a heading — see the component doc. */}
              <p className="truncate text-lg font-medium tracking-tight text-on-media sm:text-xl">
                {project.title}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {primaryService && (
              <span className="rounded-full bg-on-media/10 px-3 py-1.5 text-[11px] text-on-media/75">
                {primaryService}
              </span>
            )}
            <Link
              href={workHref}
              className="inline-flex items-center gap-1.5 text-[11px] text-on-media/70 outline-none transition-colors hover:text-on-media"
            >
              View work
              <ArrowUpRight className="size-3.5 transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Animated edge — a faint light sweep on the photo-dark surface */}
      <BorderBeam
        duration={14}
        size={300}
        colorFrom="var(--color-on-media)"
        colorTo="transparent"
      />
    </article>
  );
};

export default FeaturedCaseHero;
