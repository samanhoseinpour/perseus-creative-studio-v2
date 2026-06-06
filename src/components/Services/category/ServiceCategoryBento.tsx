import Link from 'next/link';
import { LuArrowUpRight, LuShapes, LuLayers } from 'react-icons/lu';

import { Container, Heading } from '@/components';
import ServiceBentoCard from './ServiceBentoCard';
import type { ServiceCategoryContent } from '../types';

// Shared shell for the flat (non-photo) accent cells.
const CELL =
  'h-full overflow-hidden rounded-3xl ring-1 ring-inset ring-black/[0.07]';

interface ServiceCategoryBentoProps {
  data: ServiceCategoryContent;
}

const ServiceCategoryBento = ({ data }: ServiceCategoryBentoProps) => {
  const bySlug = (slug: string) => data.services.find((s) => s.slug === slug);

  const featured = bySlug(data.featuredServiceSlug) ?? data.services[0];
  const rest = data.services.filter((s) => s.slug !== featured.slug);

  // The grid renders every service regardless of count. One photo cell sits
  // before the spec cell; the remainder flow after it. Every 5th non-featured
  // cell (index 1, 6, 11…) spans two columns to break up the photo rhythm —
  // this reproduces Production's approved layout exactly at 6 services and
  // keeps the mosaic tight as categories grow.
  const firstRest = rest[0];
  const laterRest = rest.slice(1);
  const isWide = (restIndex: number) => restIndex % 5 === 1;
  const wideSizes =
    '(min-width: 1024px) 50vw, (min-width: 640px) 100vw, 100vw';

  // Close the 4-column grid into a clean rectangle at any service count. Count
  // the single-column "units" every cell occupies (featured 2×2 = 4, the two
  // col-span-2 accents = 2 each, each wide service = 2), then absorb the
  // trailing gap by widening the spec and/or capabilities accent cells. `fill`
  // is the number of extra columns needed (the capabilities cell is always
  // present, so the minimum addition is 1). 6/9-service grids need +1 (no
  // change); 5/8 need +2 (wide capabilities); 4 needs +3 (wide spec too).
  const wideServiceCount = laterRest.filter((_, i) => isWide(i + 1)).length;
  const unitsBeforeCapabilities =
    4 + 2 + 1 + 2 + (firstRest ? 1 : 0) + laterRest.length + wideServiceCount;
  const need = (4 - (unitsBeforeCapabilities % 4)) % 4;
  const fill = need === 0 ? 4 : need;
  const capabilitiesWide = fill >= 2;
  const specWide = fill >= 3;

  return (
    <section id="services" className="scroll-mt-24 pt-14 pb-16 sm:pt-20 sm:pb-24">
      <Heading
        titleTag="h2"
        seperatorTitle={data.eyebrow}
        eyebrowRight={`${data.services.length} services`}
        title={`The ${data.title} services.`}
        description={data.specLabel}
      />

      <Container className="mt-12 sm:mt-16">
        <div className="grid auto-rows-[16rem] grid-flow-row-dense grid-cols-1 gap-2.5 sm:auto-rows-[13rem] sm:grid-cols-2 sm:gap-3 lg:auto-rows-[13.5rem] lg:grid-cols-4">
          {/* Featured */}
          <ServiceBentoCard
            service={featured}
            categorySlug={data.slug}
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="sm:col-span-2 sm:row-span-2 lg:col-span-2 lg:row-span-2"
          />

          {/* Positioning — typographic */}
          <article
            className={`${CELL} flex flex-col justify-between bg-background-contrast p-6 text-black sm:col-span-2 lg:col-span-2 sm:p-7`}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/45">
              The approach
            </span>
            <p className="text-balance text-xl font-medium leading-snug tracking-tight sm:text-2xl">
              {data.positioning}
            </p>
          </article>

          {/* First service cell */}
          {firstRest && (
            <ServiceBentoCard
              service={firstRest}
              categorySlug={data.slug}
              className="lg:col-span-1"
            />
          )}

          {/* Spec — big number (widens to help close the grid on small counts) */}
          <article
            className={`${CELL} flex flex-col justify-between bg-white p-6 text-black sm:p-7 ${
              specWide ? 'sm:col-span-2 lg:col-span-2' : ''
            }`}
          >
            <LuLayers className="size-5 text-black/35" aria-hidden />
            <div>
              <p className="text-5xl font-semibold tracking-tighter sm:text-6xl">
                {String(data.services.length).padStart(2, '0')}
              </p>
              <p className="mt-1 text-sm text-black/55">{data.specLabel}</p>
            </div>
          </article>

          {/* Remaining service cells — every 5th spans two columns */}
          {laterRest.map((service, i) => {
            const wide = isWide(i + 1);
            return (
              <ServiceBentoCard
                key={service.slug}
                service={service}
                categorySlug={data.slug}
                sizes={wide ? wideSizes : undefined}
                className={wide ? 'sm:col-span-2 lg:col-span-2' : 'lg:col-span-1'}
              />
            );
          })}

          {/* Capabilities — typographic (widens to fill the grid at 5 services) */}
          <article
            className={`${CELL} flex flex-col justify-between bg-white p-6 text-black sm:p-7 ${
              capabilitiesWide ? 'sm:col-span-2 lg:col-span-2' : ''
            }`}
          >
            <LuShapes className="size-5 text-black/35" aria-hidden />
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/45">
                Capabilities
              </span>
              <p className="mt-2 text-xl font-medium leading-snug tracking-tight sm:text-2xl">
                {data.eyebrow}
              </p>
            </div>
          </article>

          {/* CTA — dark cell */}
          <Link
            href={data.cta.primaryHref}
            className={`${CELL} group flex flex-col justify-between bg-black p-6 text-white ring-white/[0.08] sm:col-span-2 lg:col-span-2 sm:p-7`}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
              {data.cta.eyebrow}
            </span>
            <div className="flex items-end justify-between gap-4">
              <p className="max-w-sm text-2xl font-semibold tracking-tight sm:text-3xl">
                {data.cta.headline}
              </p>
              <span
                aria-hidden
                className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-black transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              >
                <LuArrowUpRight className="size-5" />
              </span>
            </div>
          </Link>
        </div>
      </Container>
    </section>
  );
};

export default ServiceCategoryBento;
