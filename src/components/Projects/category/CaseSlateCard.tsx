import Link from 'next/link';
import {
  LuArrowUpRight as ArrowUpRight,
  LuMapPin as MapPin,
} from 'react-icons/lu';

import { BorderBeam, Img } from '@/components';
import { cn } from '@/lib/utils';
import { clientLogoDisc } from '@/utils/images';
import type { ProjectSummary } from '../types';
import { slugify } from '../utils';

interface CaseSlateCardProps {
  project: ProjectSummary;
  categorySlug: string;
  /** First card above the fold — makes its frame the LCP candidate. */
  priority?: boolean;
}

/**
 * A case study as a film slate: one dark ambient surface — the cover blown
 * out, blurred, and scrimmed — carries the whole card. The sharp cover sits
 * on it as a clean inset plate, and the call sheet prints straight onto the
 * ambience below: client mark, client + industry, title, the engagement
 * summary, the location/year line, and a footer of the engagement's
 * service(s). The backdrop is always photo-dark, so ink rides the pinned
 * on-media tokens in both themes. Shared by the category project index and the
 * related-projects strip on detail pages. Stills only, by design: the archive
 * loads light.
 *
 * A title `::after` overlay spans the whole card (it shows a pointer but does
 * not navigate yet — project detail pages are being rebuilt), so the industry
 * chip and the footer service chips can each sit *above* it as their own links
 * — filtering the category by that industry or service — without nesting one
 * anchor inside another. Restore the overlay as a <Link> when
 * /projects/[category]/[project] returns.
 */
const CaseSlateCard = ({
  project,
  categorySlug,
  priority = false,
}: CaseSlateCardProps) => {
  const industryHref = `/projects/${categorySlug}?industry=${slugify(
    project.industry,
  )}`;
  // Each service chip filters the category by that service — same token the
  // project index's service rail sets, so a chip lands on the exact filter.
  const serviceHref = (service: string) =>
    `/projects/${categorySlug}?service=${slugify(service)}`;

  // Mixed-polarity client marks: pick the circular ground that never clashes
  // with the logo's own — no disc / light disc / dark disc (see clientLogoDisc).
  const logoDisc = clientLogoDisc(project.clientLogoUrl);

  return (
    <article className="group relative isolate flex h-full flex-col overflow-hidden rounded-2xl">
      {/* Ambient backdrop — the cover blown out and blurred, under a scrim */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <Img
          src={project.coverImageUrl}
          alt=""
          fill
          sizes="256px"
          className="rounded-none object-cover scale-110 blur-2xl"
        />
        <span className="absolute inset-0 bg-scrim/55" />
        <span className="absolute inset-0 bg-linear-to-t from-scrim/85 via-scrim/35 to-scrim/20" />
      </div>

      {/* Sharp plate — the cover itself */}
      <div className="relative m-2 aspect-video overflow-hidden rounded-xl sm:m-2.5">
        <Img
          src={project.coverImageUrl}
          alt={project.coverImageAlt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="rounded-none object-cover transition-transform duration-1200 ease-out group-hover:scale-[1.03]"
        />
        {/* Plate chrome */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-linear-to-b from-black/40 to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-black/45 to-transparent"
        />
      </div>

      {/* Call sheet — printed straight on the ambience */}
      <div className="flex flex-1 flex-col px-4 pb-5 pt-2 sm:px-5">
        <div className="flex items-center gap-2.5">
          {project.clientLogoUrl && (
            // Fully-rounded client mark. The disc never clashes with the logo's
            // own ground: opaque marks that carry their own dark ground float
            // with no disc, a near-white wordmark gets a dark disc, and every
            // other mark a light disc — each keeping contrast on the dark card.
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full',
                logoDisc === 'light' &&
                  'bg-on-media',
                logoDisc === 'dark' &&
                  'bg-scrim',
              )}
            >
              <Img
                src={project.clientLogoUrl}
                alt={`${project.client} logo`}
                width={80}
                height={80}
                className="h-full w-full rounded-none object-contain"
              />
            </span>
          )}
          <p className="min-w-0 truncate text-[10px] text-on-media/60">
            {project.client}
          </p>
          {/* Industry — its own register chip, and its own link: sits at z-20
              above the title's card-spanning overlay, so it filters the
              category by this industry instead of opening the project. */}
          <Link
            href={industryHref}
            className="relative z-20 ml-auto shrink-0 rounded-full bg-on-media/10 px-2.5 py-1 text-[10px] text-on-media/70 outline-none transition-colors hover:bg-on-media/20 hover:text-on-media"
          >
            {project.industry}
          </Link>
        </div>

        <h3 className="mt-3 text-base font-medium tracking-tight text-on-media transition-colors duration-300 group-hover:text-on-media/75 sm:text-lg">
          {/* No project detail route yet (/projects/[category]/[project] is being
              rebuilt). The ::after still spans the whole card (the card is
              `relative`) and shows a pointer, but it doesn't navigate — swap this
              span back to a <Link href={`/projects/${categorySlug}/${project.slug}`}>
              once detail pages return. */}
          <span className="after:absolute after:inset-0 after:z-10 after:cursor-pointer after:rounded-2xl">
            {project.title}
          </span>
        </h3>
        <p className="mb-4 mt-1.5 line-clamp-2 text-xs leading-relaxed text-on-media/65">
          {project.summary}
        </p>

        {/* Where and when it was shot */}
        <div className="mb-3 flex items-center justify-between gap-2 text-on-media/55">
          {project.location ? (
            <span className="inline-flex min-w-0 items-center gap-1 text-[10px]">
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{project.location}</span>
            </span>
          ) : (
            <span />
          )}
          <span className="shrink-0 text-[10px] tabular-nums">
            {project.year}
          </span>
        </div>

        {/* Footer — the engagement's service(s) on the left, view affordance on
            the right. Each service is its own filter link (sits at z-20 above
            the title's card-spanning overlay), so a click filters the category
            by that service instead of opening the project. A quiet outlined chip
            carries the discipline without crowding the title or sitting over the
            cover. */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-on-media/15 pt-3">
          {project.services && project.services.length > 0 ? (
            <span className="flex flex-wrap gap-1.5">
              {project.services.map((service) => (
                <Link
                  key={service}
                  href={serviceHref(service)}
                  className="relative z-20 shrink-0 rounded-full bg-on-media/10 px-2.5 py-1 text-[10px] text-on-media/75 outline-none transition-colors hover:bg-on-media/20 hover:text-on-media"
                >
                  {service}
                </Link>
              ))}
            </span>
          ) : (
            <span />
          )}
          <span
            aria-hidden
            className="flex items-center gap-1.5 text-[10px] text-on-media/55"
          >
            View project
            <ArrowUpRight className="size-3.5 text-on-media/70 transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>

      {/* Animated edge — reads as a faint light sweep on the photo-dark surface */}
      <BorderBeam
        duration={12}
        size={200}
        colorFrom="var(--color-on-media)"
        colorTo="transparent"
      />
    </article>
  );
};

export default CaseSlateCard;
