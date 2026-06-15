import Link from 'next/link';

import { Button, Container, Heading } from '@/components';
import CaseSlateCard from '@/components/Projects/category/CaseSlateCard';
import { latestYear, pad2 } from '@/components/Projects/utils';
import { PROJECT_CATEGORIES } from '@/constants/projects';
import FeatureProjectShelf from './FeatureProjectShelf';

// How many of each category's newest projects reach the home shelf.
const PER_CATEGORY = 2;

// The newest couple of projects from every category that has work, grouped by
// discipline. Fully data-driven: empty categories contribute nothing, and
// adding a case study to any category updates the home shelf on the next build.
const FEATURED = Object.values(PROJECT_CATEGORIES).flatMap((category) =>
  [...category.projects]
    .sort((a, b) => latestYear(b.year) - latestYear(a.year))
    .slice(0, PER_CATEGORY)
    .map((project) => ({ project, categorySlug: category.slug })),
);

const FeatureProjects = () => {
  if (FEATURED.length === 0) return null;

  return (
    <section className="py-16">
      <Heading
        titleTag="h2"
        seperatorTitle="05 — Selected Work"
        eyebrowRight={`${pad2(FEATURED.length)} projects`}
        title="Selected work, on the record."
        titleAccent="Pulled from the studio archive."
        description="Real client engagements, documented as case studies — the brief, the build, and what shipped. Drag the shelf, or open a project."
        containerStyle="mb-10"
      />

      <FeatureProjectShelf>
        {FEATURED.map(({ project, categorySlug }, i) => (
          <CaseSlateCard
            key={`${categorySlug}-${project.slug}`}
            project={project}
            categorySlug={categorySlug}
            priority={i === 0}
          />
        ))}
      </FeatureProjectShelf>

      {/* The way into the full projects hub */}
      <Container className="mt-10 flex justify-center">
        <Link href="/projects" aria-label="Browse projects by category">
          <Button size="medium" tabIndex={-1}>
            Browse by category
          </Button>
        </Link>
      </Container>
    </section>
  );
};

export default FeatureProjects;
