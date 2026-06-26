import Link from 'next/link';
import { LuLayoutGrid as LayoutGrid } from 'react-icons/lu';

import { Button, Container, Heading } from '@/components';
import type { ProjectSummary } from '@/components/Projects/types';
import { latestYear, pad2 } from '@/components/Projects/utils';
import { PROJECT_CATEGORIES } from '@/constants/projects';
import FeatureProjectGallery from './FeatureProjectGallery';
import ProjectBillboard from './ProjectBillboard';
import ProjectTile from './ProjectTile';

// Each discipline contributes its 5 newest to the featured pool.
const POOL_PER_CATEGORY = 5;
// Cap the large billboards so the pagination dots stay scannable (Apple shows
// ~6). Keep this <= 7 so heroes×2 tiles still fit inside the pool — the two
// rails must be the same width for the gallery's loop to reset cleanly.
const MAX_HEROES = 6;

type Entry = {
  project: ProjectSummary;
  categorySlug: string;
  categoryTitle: string;
};

// Per-discipline, newest-first, capped to the pool depth. Fully data-driven —
// empty categories contribute nothing, and a new case study surfaces on the
// next build.
const perCategory: Entry[][] = Object.values(PROJECT_CATEGORIES).map((category) =>
  [...category.projects]
    .sort((a, b) => latestYear(b.year) - latestYear(a.year))
    .slice(0, POOL_PER_CATEGORY)
    .map((project) => ({
      project,
      categorySlug: category.slug,
      categoryTitle: category.title,
    })),
);

// Heroes — the large billboards. Round-robin across disciplines so every
// discipline gets a billboard before any gets a second one, capped at
// MAX_HEROES. The dot count tracks this list.
const HEROES: Entry[] = [];
for (let round = 0; HEROES.length < MAX_HEROES; round++) {
  const before = HEROES.length;
  for (const list of perCategory) {
    if (list[round] && HEROES.length < MAX_HEROES) HEROES.push(list[round]);
  }
  if (HEROES.length === before) break; // pool exhausted
}

// Tiles — the rest of the pool, re-sorted by recency across disciplines and
// trimmed to exactly heroes×2 so the tile rail is the same total width as the
// hero rail (both rows share one scroller and loop in lock-step).
const heroKey = (e: Entry) => `${e.categorySlug}-${e.project.slug}`;
const heroSet = new Set(HEROES.map(heroKey));
const TILES: Entry[] = perCategory
  .flat()
  .filter((e) => !heroSet.has(heroKey(e)))
  .sort((a, b) => latestYear(b.project.year) - latestYear(a.project.year))
  .slice(0, HEROES.length * 2);

const FeatureProjects = () => {
  if (HEROES.length === 0) return null;

  return (
    <section className="py-16">
      <Heading
        titleTag="h2"
        seperatorTitle="Selected Work"
        eyebrowRight={`${pad2(HEROES.length)} projects`}
        title="Selected work, on the record."
        titleAccent="Pulled from the studio archive."
        description="A reel of recent client engagements, documented as case studies. Swipe through the marquee, or open a discipline."
        containerStyle="mb-10"
      />

      <FeatureProjectGallery
        billboards={HEROES.map(({ project, categorySlug, categoryTitle }, i) => (
          <ProjectBillboard
            key={`${categorySlug}-${project.slug}`}
            project={project}
            categorySlug={categorySlug}
            categoryTitle={categoryTitle}
            priority={i === 0}
          />
        ))}
        tiles={TILES.map(({ project, categorySlug, categoryTitle }) => (
          <ProjectTile
            key={`${categorySlug}-${project.slug}`}
            project={project}
            categorySlug={categorySlug}
            categoryTitle={categoryTitle}
          />
        ))}
      />

      {/* The way into the full projects hub */}
      <Container className="mt-10 flex justify-center">
        <Link href="/projects" aria-label="Browse projects by category">
          <Button size="medium" icon={LayoutGrid} tabIndex={-1}>
            Browse by category
          </Button>
        </Link>
      </Container>
    </section>
  );
};

export default FeatureProjects;
