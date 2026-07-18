import Link from 'next/link';
import { LuArrowUpRight as ArrowUpRight } from 'react-icons/lu';

import Button from '@/components/Button';
import Img from '@/components/Img';
import type { ProjectSummary } from '@/components/Projects/types';

interface ProjectBillboardProps {
  project: ProjectSummary;
  categorySlug: string;
  /** Discipline name for the eyebrow, e.g. "Production" / "Websites". */
  categoryTitle: string;
  /** First billboard above the fold — makes its cover the LCP candidate. */
  priority?: boolean;
}

/**
 * The large cinematic card in the homepage gallery — the Apple "billboard":
 * one full-bleed cover with the work's identity overlaid on it (discipline
 * eyebrow, title, one-line summary, a solid pill affordance) and the client's
 * mark in the top corner, echoing Apple's service logo. The card is photo-dark
 * under a scrim, so text rides the pinned on-media tokens in both themes.
 *
 * The whole card is the link — the case study once the project has detail
 * content (`hasDetail`), else the discipline page (same target the category
 * chips use). The "View work" Button is decorative (type=button, tabIndex -1,
 * aria-hidden), so it isn't a focusable control nested in the card link — a
 * click just bubbles up to the card's anchor.
 */
const ProjectBillboard = ({
  project,
  categorySlug,
  categoryTitle,
  priority = false,
}: ProjectBillboardProps) => {
  return (
    <Link
      href={
        project.hasDetail
          ? `/projects/${categorySlug}/${project.slug}`
          : `/projects/${categorySlug}`
      }
      aria-label={`${project.client} — ${project.title}`}
      className="group relative isolate block aspect-4/5 overflow-hidden rounded-[1.75rem] sm:aspect-16/10 lg:aspect-video"
    >
      {/* Cover */}
      <Img
        src={project.coverImageUrl}
        alt={project.coverImageAlt}
        fill
        priority={priority}
        sizes="(min-width: 1500px) 960px, (min-width: 1024px) 64vw, (min-width: 640px) 72vw, 86vw"
        className="rounded-none object-cover transition-transform duration-1200 ease-out group-hover:scale-[1.04]"
      />

      {/* Bottom scrim — carries the overlaid copy */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-scrim/85 via-scrim/25 to-transparent"
      />

      {/* Overlay copy */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-3 p-6 sm:p-8 lg:p-10">
        <p className="eyebrow text-[11px] text-on-media/70">
          {categoryTitle}
        </p>
        <h3 className="max-w-xl text-2xl font-semibold tracking-tight text-on-media drop-shadow-sm sm:text-3xl lg:text-4xl">
          {project.title}
        </h3>
        <p className="line-clamp-1 max-w-md text-sm text-on-media/75">
          {project.summary}
        </p>
        <Button
          variant="secondary"
          size="small"
          icon={ArrowUpRight}
          type="button"
          tabIndex={-1}
          aria-hidden
          className="mt-1 bg-white/85 hover:bg-white/95"
        >
          View work
        </Button>
      </div>
    </Link>
  );
};

export default ProjectBillboard;
