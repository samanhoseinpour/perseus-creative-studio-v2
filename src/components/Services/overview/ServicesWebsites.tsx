import Link from 'next/link';
import { LuArrowUpRight as ArrowUpRight } from 'react-icons/lu';

import Button from '@/components/Button';
import Container from '@/components/ui/Container';
import Heading from '@/components/Heading';
import Img from '@/components/Img';
import { CATEGORIES } from '@/constants/services';
import { isMonoLogo } from '@/utils/images';
import { cn } from '@/lib/utils';
import ServiceLogoTile from '../shared/ServiceLogoTile';
import DottedFrame from '../shared/DottedFrame';

// The websites overview band. Service set + titles + order come from CATEGORIES
// (single source of truth — kept in sync with /services/websites, all eight
// disciplines, each carrying the real tool/platform mark from our stack).
//
// Rather than a flat grid of identical tiles, this reads as a "survey sheet":
// the shared DottedFrame (the same device the paid-growth band uses, so both
// overview bands read as one family) wraps a mono register line and a spotlight
// lineup. The featured discipline (Website Design / Figma) gets a 2×2 spotlight
// card; the other seven keep the shared ServiceLogoTile; a quiet "one team" spec
// cell closes the grid to a clean 4×3. Mono marks (Next.js, WordPress) flip to
// white on the dark card.
const websitesCategory = CATEGORIES.websites;

type WebsiteService = (typeof websitesCategory.services)[number];

const websiteHref = (service: WebsiteService) =>
  service.available
    ? `/services/${websitesCategory.slug}/${service.slug}`
    : '/contact';

/**
 * The spotlight for the featured discipline — the ServiceLogoTile anatomy
 * (eyebrow + arrow, contained mark, name + tagline) re-proportioned for a 2×2
 * cell, over a faint design-canvas dot grid that reads as the surface web work
 * is drawn on. Hover lift + arrow nudge + mark press-in mirror the tile.
 */
const FeaturedDisciplineCard = ({
  service,
  href,
}: {
  service: WebsiteService;
  href: string;
}) => (
  <Link
    href={href}
    aria-label={`${service.title} — ${service.tagline}`}
    className="group relative isolate flex h-full flex-col justify-between overflow-hidden rounded-3xl bg-background-contrast p-6 transition-transform duration-300 ease-out hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-8"
  >
    {/* Faint design-canvas dot grid — currentColor = foreground, so it reads in
        both themes; kept at ~5% so it never tips into a busy blueprint. */}
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 text-foreground opacity-[0.05] bg-[radial-gradient(currentColor_1px,transparent_1px)] bg-size-[16px_16px]"
    />

    {/* Top row — featured eyebrow + status pill + arrow affordance. */}
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Featured
        </span>
        <span className="rounded-full bg-foreground/6 px-2.5 py-1 text-[10px] text-muted-foreground">
          {service.available ? 'Available' : 'On request'}
        </span>
      </div>
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground/6 text-foreground transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
      >
        <ArrowUpRight className="size-4" />
      </span>
    </div>

    {/* The mark — contained + centred, gentle press-in on hover. */}
    <div className="flex min-h-0 flex-1 items-center justify-center py-4">
      <Img
        src={service.imageUrl}
        alt={service.imageAlt}
        width={320}
        height={320}
        className={cn(
          'aspect-square h-full w-auto max-h-28 object-contain transition-transform duration-700 ease-out group-hover:scale-95 motion-reduce:transform-none sm:max-h-36',
          isMonoLogo(service.imageUrl) && 'dark:invert',
        )}
      />
    </div>

    {/* Footer — discipline name + full tagline. */}
    <div>
      <h3 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {service.title}
      </h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground sm:text-base">
        {service.tagline}
      </p>
    </div>
  </Link>
);

/**
 * The typographic cell that closes the grid — a quiet "one senior team"
 * statement (no link), the same contained-tile ground as the marks.
 */
const SpecCell = () => (
  <div className="flex h-full flex-col justify-between rounded-3xl bg-background-contrast p-6">
    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      One team
    </span>
    <div>
      <p className="text-2xl font-semibold tracking-tight text-foreground">
        One senior team
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Design, build, and ship — no handoffs.
      </p>
    </div>
  </div>
);

const ServicesWebsites = () => {
  const featured =
    websitesCategory.services.find((service) => service.featured) ??
    websitesCategory.services[0];
  const rest = websitesCategory.services.filter(
    (service) => service !== featured,
  );
  const count = websitesCategory.services.length;

  return (
    <section className="overflow-hidden py-16">
      <Container className="relative flex flex-col items-center md:px-0 lg:pt-8">
        <Heading
          titleTag="h2"
          seperatorTitle="Web Design & Development"
          eyebrowRight="UX · Performance · Conversion"
          title="Web Design & Development"
          titleAccent="Built for performance, clarity, and growth."
          description="Design and development that looks premium and performs. We create modern, conversion-focused websites and landing pages that align with your brand and support your growth strategy."
          containerStyle="px-0 md:px-0 mb-10 w-full"
          titleStyle="max-w-4xl"
          descStyle="max-w-3xl"
        />

        <DottedFrame className="w-full px-2 py-10">
          {/* Register line — the sheet's header, printed inside the frame. */}
          <div className="mb-6 flex items-center justify-between gap-3 px-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>the websites lineup</span>
            <span>{String(count).padStart(2, '0')} services</span>
          </div>

          {/* Spotlight + lineup. Featured spans 2×2; seven marks + one spec cell
              close a 4×3 grid on desktop, 2-up on tablet, single column on
              mobile (featured first). grid-flow-dense keeps it gapless. */}
          <div className="grid grid-flow-row-dense auto-rows-[14rem] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="h-full sm:col-span-2 sm:row-span-2 lg:col-span-2 lg:row-span-2">
              <FeaturedDisciplineCard
                service={featured}
                href={websiteHref(featured)}
              />
            </div>

            {rest.map((service) => (
              <div key={service.slug} className="h-full">
                <ServiceLogoTile
                  href={websiteHref(service)}
                  logoSrc={service.imageUrl}
                  logoAlt={service.imageAlt}
                  title={service.title}
                  tagline={service.tagline}
                  topLabel={service.available ? 'Available' : 'On request'}
                  ariaLabel={`${service.title} — ${service.tagline}`}
                  scale="sm"
                  invertOnDark={isMonoLogo(service.imageUrl)}
                />
              </div>
            ))}

            <div className="h-full">
              <SpecCell />
            </div>
          </div>
        </DottedFrame>

        <div className="mt-10 flex justify-center">
          <Link href={`/services/${websitesCategory.slug}`}>
            <Button variant="secondary" icon={ArrowUpRight}>
              Explore {websitesCategory.title}
            </Button>
          </Link>
        </div>
      </Container>
    </section>
  );
};

export { ServicesWebsites };
