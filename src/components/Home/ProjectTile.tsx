import Link from 'next/link';
import { LuArrowUpRight as ArrowUpRight } from 'react-icons/lu';

import Button from '@/components/Button';
import Img from '@/components/Img';
import type { ProjectSummary } from '@/components/Projects/types';

interface ProjectTileProps {
  project: ProjectSummary;
  categorySlug: string;
  /** Discipline name for the micro-eyebrow. */
  categoryTitle: string;
}

/**
 * The small card in the gallery's second rail — Apple's row of supporting
 * tiles that scrolls in lock-step beneath the billboards. A compact cover with
 * a tight label; quieter than the billboard by design. Same link target as the
 * billboard (the discipline page) until project detail routes return.
 */
const ProjectTile = ({
  project,
  categorySlug,
  categoryTitle,
}: ProjectTileProps) => {
  return (
    <Link
      href={`/projects/${categorySlug}`}
      aria-label={`${project.client} — ${project.title}`}
      className="group relative isolate block aspect-[4/3] overflow-hidden rounded-2xl"
    >
      <Img
        src={project.coverImageUrl}
        alt={project.coverImageAlt}
        fill
        sizes="(min-width: 1024px) 31vw, (min-width: 640px) 35vw, 42vw"
        className="rounded-none object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-scrim/80 via-scrim/15 to-transparent"
      />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4">
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-on-media/60">
            {categoryTitle}
          </p>
          <p className="truncate text-sm font-medium text-on-media">
            {project.title}
          </p>
        </div>
        <Button
          variant="secondary"
          size="small"
          icon={ArrowUpRight}
          type="button"
          tabIndex={-1}
          aria-hidden
          className="shrink-0 px-2.5 bg-white/85 hover:bg-white/95"
        />
      </div>
    </Link>
  );
};

export default ProjectTile;
