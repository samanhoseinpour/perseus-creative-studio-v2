import Link from 'next/link';

import Img from '@/components/Img';
import Container from '@/components/ui/Container';
import type { FeaturedProjectEntry } from '../types';
import { SlateTag } from '../SlateTag';

interface NextFileFooterProps {
  /** The next case study in the same drawer — the page picks it (newest-first
   *  order, wrap-around) and omits the footer when no sibling exists. */
  entry: FeaturedProjectEntry;
}

/**
 * The page's last frame: the next file's cover bleeding in full-width, so the
 * archive reads as one continuous reel instead of dead-ending. One link over
 * the whole band, honoring the curated-rollout gate — a sibling without
 * detail content routes to its category showcase, never a 404. Cover ink is
 * pinned on-media/scrim (photograph underneath, both themes). Card summaries
 * resolve static covers only; an /admin-uploaded cover shows the shared
 * placeholder here, consistent with every card until the snapshot learns
 * uploads.
 */
const NextFileFooter = ({ entry }: NextFileFooterProps) => {
  const { project, categorySlug, categoryTitle } = entry;
  const href = project.hasDetail
    ? `/projects/${categorySlug}/${project.slug}`
    : `/projects/${categorySlug}`;

  return (
    <section className="pt-16 sm:pt-24">
      <Container>
        <div className="flex items-center gap-4">
          <SlateTag as="h2" size="md" className="whitespace-nowrap text-black/60">
            Next file
          </SlateTag>
          <span aria-hidden className="h-px flex-1 bg-black/10" />
          <SlateTag className="whitespace-nowrap text-black/45">
            {categoryTitle}
          </SlateTag>
        </div>
      </Container>

      <Link
        href={href}
        aria-label={`Next file: ${project.title}`}
        className="group relative mt-8 block h-[380px] overflow-hidden sm:h-[480px]"
      >
        <Img
          src={project.coverImageUrl}
          alt={project.coverImageAlt}
          fill
          sizes="100vw"
          className="rounded-none object-cover transition-transform duration-1200 ease-out group-hover:scale-[1.03]"
        />
        <div aria-hidden className="absolute inset-0 bg-scrim/45" />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-scrim/80 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0">
          <Container className="pb-10 sm:pb-14">
            <SlateTag as="p" className="text-on-media/60">
              {project.client}
              <span aria-hidden className="mx-2">
                ·
              </span>
              <span className="tabular-nums">{project.year}</span>
            </SlateTag>
            <p className="mt-3 max-w-3xl text-3xl font-semibold tracking-tighter text-on-media sm:text-5xl">
              {project.title}
            </p>
            <SlateTag
              aria-hidden
              as="p"
              className="mt-4 inline-flex items-center gap-2 text-on-media/70"
            >
              Open file
              <span className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                →
              </span>
            </SlateTag>
          </Container>
        </div>
      </Link>
    </section>
  );
};

export default NextFileFooter;
