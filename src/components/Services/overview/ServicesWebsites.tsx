import Link from 'next/link';
import { LuArrowUpRight as ArrowUpRight } from 'react-icons/lu';

import { Container, Heading, ImageKit } from '@/components';
import { CATEGORIES } from '@/constants/services';

// Service set + titles + order come from CATEGORIES (single source of truth —
// kept in sync with /services/websites, all eight disciplines). The two lead
// services get a photo treatment; the rest render as typographic cards (the
// studio's category-grid style), so the full set stays consistent without
// repeating one stock photo across every card.
const websitesCategory = CATEGORIES.websites;

const websiteHref = (service: (typeof websitesCategory.services)[number]) =>
  service.available
    ? `/services/${websitesCategory.slug}/${service.slug}`
    : '/contact';

// Lead disciplines shown as large photo cards, keyed by slug. Everything not
// listed here falls through to a typographic card.
const LEAD_PHOTO_BY_SLUG: Record<string, string> = {
  'website-design':
    'https://cdn.cosmos.so/8b4526f6-a353-466e-ada2-ecedb14f50df?format=jpeg',
  'website-development':
    'https://cdn.cosmos.so/d66daca0-a142-45f4-80be-49da55112194?format=jpeg',
};

const websiteServices = websitesCategory.services.map((service, index) => ({
  ...service,
  index: index + 1,
}));
const leadServices = websiteServices.filter((s) => LEAD_PHOTO_BY_SLUG[s.slug]);
const restServices = websiteServices.filter((s) => !LEAD_PHOTO_BY_SLUG[s.slug]);

const ServicesWebsites = () => {
  return (
    <section className="py-16">
      <Container className="relative">
        <Heading
          titleTag="h2"
          seperatorTitle="01 — Web Design & Development"
          eyebrowRight="UX · Performance · Conversion"
          title="Web Design & Development"
          titleAccent="Built for performance, clarity, and growth."
          description="Design and development that looks premium and performs. We create modern, conversion-focused websites and landing pages that align with your brand and support your growth strategy."
          containerStyle="px-0 md:px-0 mb-10"
          titleStyle="max-w-4xl"
          descStyle="max-w-3xl"
        />

        {/* Lead disciplines — photo cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {leadServices.map((service) => (
            <Link
              key={service.slug}
              href={websiteHref(service)}
              className="group relative flex aspect-16/11 flex-col justify-end overflow-hidden rounded-3xl bg-background-contrast"
            >
              <ImageKit
                src={LEAD_PHOTO_BY_SLUG[service.slug]}
                alt={service.imageAlt}
                width={800}
                height={550}
                className="absolute inset-0 h-full w-full rounded-none object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <span
                aria-hidden
                className="absolute inset-0 bg-linear-to-t from-scrim/80 via-scrim/10 to-transparent"
              />
              <div className="relative flex items-end justify-between gap-4 p-6">
                <div>
                  <h3 className="text-3xl font-semibold tracking-tighter text-on-media">
                    {service.title}
                  </h3>
                  <p className="mt-1 max-w-sm text-sm text-on-media/75">
                    {service.tagline}
                  </p>
                </div>
                <span
                  aria-hidden
                  className="grid size-10 shrink-0 place-items-center rounded-full text-on-media ring-1 ring-inset ring-on-media/30 transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                >
                  <ArrowUpRight className="size-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Remaining disciplines — typographic cards */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {restServices.map((service) => (
            <Link
              key={service.slug}
              href={websiteHref(service)}
              className="group flex min-h-44 flex-col justify-between rounded-3xl bg-white p-6 ring-1 ring-inset ring-black/[0.07] transition-colors duration-300 hover:bg-background-contrast"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase tabular-nums text-black/40">
                  {String(service.index).padStart(2, '0')}
                </span>
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-full text-black ring-1 ring-inset ring-black/10 transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                >
                  <ArrowUpRight className="size-4" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-black">
                  {service.title}
                </h3>
                <p className="mt-1 text-sm text-black/55">{service.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
};

export { ServicesWebsites };
