import Link from 'next/link';
import { LuLayoutGrid as LayoutGrid } from 'react-icons/lu';

import Button from '@/components/Button';
import Container from '@/components/ui/Container';
import Heading from '@/components/Heading';
import type { FeaturedProjectEntry } from '../types';
import CaseSlateCard from '../category/CaseSlateCard';

interface RelatedProjectsProps {
  entries: FeaturedProjectEntry[];
  categorySlug: string;
  categoryTitle: string;
}

/**
 * The same drawer, other files — the newest public case studies from this
 * project's discipline as an Apple-shelf rail: snap-scrolling CaseSlateCards
 * with the next card peeking, so the ending holds up to six siblings without
 * the vertical cost of a grid. Pure CSS scroll (overflow + scroll-snap) —
 * zero client JS, and every card link stays in the initial HTML for crawlers.
 * Entries arrive pre-filtered (self excluded) from the route; renders nothing
 * when the category holds no siblings yet.
 */
const RelatedProjects = ({
  entries,
  categorySlug,
  categoryTitle,
}: RelatedProjectsProps) => {
  if (entries.length === 0) return null;

  return (
    <section className="pt-16 sm:pt-24">
      <Heading
        titleTag="h2"
        seperatorTitle="From the same drawer"
        eyebrowRight={`${entries.length === 1 ? '1 file' : `${entries.length} files`}`}
        title={`More ${categoryTitle.toLowerCase()} work, on the record.`}
        titleAccent="Pulled from the same category."
        description={`Other ${categoryTitle.toLowerCase()} engagements from the archive — the files this one sits beside.`}
        containerStyle="mb-10"
      />

      <Container>
        <div className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-2">
          {entries.map(({ project }) => (
            <div
              key={project.slug}
              className="w-[85%] shrink-0 snap-start sm:w-[46%] lg:w-[31.5%]"
            >
              <CaseSlateCard project={project} categorySlug={categorySlug} />
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href={`/projects/${categorySlug}`}
            aria-label={`All ${categoryTitle} projects`}
          >
            <Button size="medium" icon={LayoutGrid} tabIndex={-1}>
              All {categoryTitle} projects
            </Button>
          </Link>
        </div>
      </Container>
    </section>
  );
};

export default RelatedProjects;
