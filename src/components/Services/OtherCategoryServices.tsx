import Link from 'next/link';
import { LuArrowUpRight } from 'react-icons/lu';

import { Container, Heading, ImageKit } from '@/components';
import { CATEGORIES } from '@/constants/services';
import type { ServiceCategoryContent, ServiceSummary } from './types';

interface OtherCategoryServicesProps {
  /** Current category slug — its own services are excluded. */
  currentCategorySlug: string;
}

/** Services still awaiting real artwork ship with this logo placeholder. */
const PLACEHOLDER_IMAGE = '/logo-black.png';

/**
 * Cross-category discovery for the service detail pages: up to two services
 * from each *other* category — the featured service plus the next sibling that
 * has real artwork — photographic and labelled with the category they belong
 * to. The second pick requires a real image (placeholders are skipped) so every
 * card looks intentional; a category with only one well-imaged service shows
 * one. Reads CATEGORIES directly, so it stays in sync as services gain art.
 */
const OtherCategoryServices = ({
  currentCategorySlug,
}: OtherCategoryServicesProps) => {
  const others = Object.values(CATEGORIES).filter(
    (c) => c.slug !== currentCategorySlug,
  );

  const items: { category: ServiceCategoryContent; service: ServiceSummary }[] =
    [];

  for (const category of others) {
    const featured =
      category.services.find((s) => s.slug === category.featuredServiceSlug) ??
      category.services[0];
    if (!featured) continue;
    items.push({ category, service: featured });

    // Second pick: the next sibling that has real artwork (skip placeholders).
    const second = category.services.find(
      (s) => s.slug !== featured.slug && s.imageUrl !== PLACEHOLDER_IMAGE,
    );
    if (second) items.push({ category, service: second });
  }

  if (items.length === 0) return null;

  return (
    <section className="pb-16 sm:pb-24">
      <Heading
        titleTag="h2"
        seperatorTitle="More from the studio"
        eyebrowRight={`${others.length} more disciplines`}
        title="Other things we make."
        titleAccent="One team, every discipline."
        description="Most projects touch more than one discipline — here are a couple of highlights from each of the others."
        containerStyle="mb-10"
        titleStyle="max-w-3xl"
        descStyle="max-w-3xl"
      />

      <Container>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ category, service }) => {
            const href = service.available
              ? `/services/${category.slug}/${service.slug}`
              : `/services/${category.slug}`;

            return (
              <Link
                key={`${category.slug}-${service.slug}`}
                href={href}
                aria-label={`${service.title} — ${category.title}`}
                className="group relative flex min-h-[15rem] flex-col justify-end overflow-hidden rounded-3xl ring-1 ring-inset ring-black/[0.07]"
              >
                <ImageKit
                  src={service.imageUrl}
                  alt={service.imageAlt}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="rounded-none object-cover transition-transform duration-900 ease-out group-hover:scale-[1.04]"
                />

                {/* Legibility scrim — sits on a photo, not glass. */}
                <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-scrim/75 via-scrim/20 to-scrim/5" />

                {/* Category label, top-left */}
                <span className="absolute left-5 top-5 font-mono text-[10px] uppercase tracking-[0.18em] text-on-media/75">
                  {category.title}
                </span>

                <div className="relative flex items-end justify-between gap-4 p-5 sm:p-6">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold tracking-tight text-on-media sm:text-xl">
                      {service.title}
                    </h3>
                    <p className="mt-1.5 text-xs text-on-media/70 sm:text-sm">
                      {service.tagline}
                    </p>
                  </div>

                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-on-media/12 text-on-media ring-1 ring-inset ring-on-media/25 backdrop-blur-[2px] transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  >
                    <LuArrowUpRight className="size-4" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
};

export default OtherCategoryServices;
