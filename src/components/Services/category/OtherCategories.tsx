import Link from 'next/link';
import { LuArrowUpRight } from 'react-icons/lu';

import { Container, Heading } from '@/components';
import { CATEGORIES } from '@/constants/services';
import CategoryVisual from '../visuals/CategoryVisual';

interface OtherCategoriesProps {
  /** Current category slug — excluded from the list. */
  currentSlug: string;
}

/**
 * Cross-links the other service categories so a visitor on one discipline can
 * discover the rest (funnel + internal linking). Each cell is backed by that
 * category's bespoke <CategoryVisual> (scrim + on-media type, with a push-in on
 * hover). Reads CATEGORIES directly, so it stays in sync as categories are
 * added or renamed.
 */
const OtherCategories = ({ currentSlug }: OtherCategoriesProps) => {
  const others = Object.values(CATEGORIES).filter(
    (c) => c.slug !== currentSlug,
  );
  if (others.length === 0) return null;

  return (
    <section className="pb-16 sm:pb-24">
      <Heading
        titleTag="h2"
        seperatorTitle="More from the studio"
        eyebrowRight={`${others.length} more services`}
        title="The rest of what we do."
        titleAccent="One team, end to end."
        description="Most projects touch more than one discipline — here’s everything else we cover under one roof."
        containerStyle="mb-10"
      />

      <Container>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
          {others.map((c) => (
            <Link
              key={c.slug}
              href={`/services/${c.slug}`}
              className="media-adaptive group relative isolate flex min-h-[14rem] flex-col justify-between overflow-hidden rounded-3xl p-6 ring-1 ring-inset ring-black/[0.07] sm:min-h-[15rem]"
            >
              {/* Code-rendered category artwork + scrim */}
              <div className="absolute inset-0 -z-10 transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]">
                <CategoryVisual slug={c.slug} variant="card" />
              </div>
              <span
                aria-hidden
                className="absolute inset-0 -z-10 bg-linear-to-t from-scrim/80 via-scrim/30 to-transparent"
              />

              <div className="flex items-start justify-between gap-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-media/75">
                  {c.eyebrow}
                </span>
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-on-media/10 text-on-media ring-1 ring-inset ring-on-media/25 backdrop-blur-sm transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                >
                  <LuArrowUpRight className="size-4" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-on-media">
                  {c.title}
                </h3>
                <p className="mt-1 text-sm text-on-media/70">
                  {c.services.length} services
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default OtherCategories;
