import Link from 'next/link';
import { LuArrowUpRight as ArrowUpRight } from 'react-icons/lu';

import Container from '@/components/ui/Container';
import Heading from '@/components/Heading';
import Img from '@/components/Img';
import { CATEGORIES } from '@/constants/services';
import { isBrandLogo, isMonoLogo } from '@/utils/images';
import type { ServiceSummary } from '@/components/Services/types';
import ServiceVisualCard from '@/components/Services/category/ServiceVisualCard';
import ServiceLogoTile from '@/components/Services/shared/ServiceLogoTile';
import { getServiceVisual } from '@/components/Services/visuals';
import type { ProjectCategoryContent, ProjectSummary } from '../types';
import { pad2 } from '../utils';
import { SlateTag } from '../SlateTag';
import ServiceShelf from './ServiceShelf';

interface ProjectCategoryServicesProps {
  data: ProjectCategoryContent;
  /** The category's public cards — threaded from the route's store fetch. */
  projects: ProjectSummary[];
}

/** How many of this category's projects carry a tag this service produced —
 *  tags ("Aerial") are shorthand for registry titles ("Aerial Production"). */
function projectsUsing(
  service: ServiceSummary,
  projects: ProjectSummary[],
): number {
  const title = service.title.toLowerCase();
  return projects.filter((p) =>
    (p.services ?? []).some((tag) => title.includes(tag.toLowerCase())),
  ).length;
}

const ProjectCategoryServices = ({
  data,
  projects,
}: ProjectCategoryServicesProps) => {
  const category = CATEGORIES[data.slug];
  if (!category || category.services.length === 0) return null;

  const total = pad2(category.services.length);

  // Card-treatment gate. A brand-logo mark or a bespoke code visual must never
  // be blown up to fill a photo card (object-cover crops the glyph huge) — so a
  // category renders the contained-card grid the /services bento uses whenever
  // *every* service is a visual (Social, Branding) or a brand logo (Websites,
  // Digital Marketing). Only a category of real photographs (Production) keeps
  // the full-bleed spotlight shelf, where covers fill edge to edge.
  const allContained = category.services.every(
    (service) =>
      getServiceVisual(category.slug, service.slug) ||
      isBrandLogo(service.imageUrl),
  );

  return (
    <section className="pt-16 sm:pt-24">
      <Heading
        titleTag="h2"
        seperatorTitle="The services behind this work"
        eyebrowRight={`${total} services`}
        title={`How ${data.title.toLowerCase()} work gets made.`}
        titleAccent="Every project traces back to these."
        description={`The ${data.title.toLowerCase()} services that produced this work — what each covers, and where to start when your project needs it.`}
        containerStyle="mb-10"
      />

      {allContained ? (
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {category.services.map((service) => {
              const used = projectsUsing(service, projects);
              const hero = service.slug === category.featuredServiceSlug;
              const href = service.available
                ? `/services/${category.slug}/${service.slug}`
                : '/contact';
              // "On NN projects here" — the shelf's project-usage signal, kept
              // as the card eyebrow.
              const usage =
                used > 0
                  ? `On ${pad2(used)} ${used === 1 ? 'project' : 'projects'} here`
                  : undefined;

              // Same visual→logo resolution as ServiceBentoCard: a bespoke code
              // artifact if one exists (Social, Branding), otherwise the
              // contained brand-logo tile (Websites, Digital Marketing) so the
              // mark sits centred instead of cropped full-bleed.
              const Visual = getServiceVisual(category.slug, service.slug);
              if (Visual) {
                return (
                  <ServiceVisualCard
                    key={service.slug}
                    href={href}
                    visual={<Visual />}
                    title={service.title}
                    tagline={service.tagline}
                    ariaLabel={`${service.title} — ${service.tagline}`}
                    featured={hero}
                    topLabel={usage}
                    className="min-h-[15rem]"
                  />
                );
              }

              return (
                <ServiceLogoTile
                  key={service.slug}
                  href={href}
                  logoSrc={service.imageUrl}
                  logoAlt={service.imageAlt}
                  title={service.title}
                  tagline={service.tagline}
                  topLabel={
                    usage ?? (service.available ? 'Available' : 'On request')
                  }
                  ariaLabel={`${service.title} — ${service.tagline}`}
                  scale={hero ? 'lg' : 'sm'}
                  invertOnDark={isMonoLogo(service.imageUrl)}
                  className="min-h-[15rem]"
                />
              );
            })}
          </div>
        </Container>
      ) : (
        <ServiceShelf>
          {category.services.map((service, i) => {
          const used = projectsUsing(service, projects);
          const hero = service.slug === category.featuredServiceSlug;
          const num = pad2(i + 1);

          return (
            <Link
              key={service.slug}
              href={
                service.available
                  ? `/services/${category.slug}/${service.slug}`
                  : '/contact'
              }
              className="shelf-dynamics group relative isolate flex h-96 w-full flex-col justify-end overflow-hidden rounded-[1.75rem] outline-none sm:h-112"
            >
              {/* The photograph carries the card, edge to edge. Sized for the
                  spotlight width — any card can become the wide one. */}
              <Img
                src={service.imageUrl}
                alt={service.imageAlt}
                fill
                sizes="(min-width: 640px) 576px, 320px"
                className="rounded-none object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
              {/* Scrims — a whisper up top for the slate, weight below the lockup */}
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-20 bg-linear-to-b from-scrim/60 to-transparent"
              />
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-scrim/85 via-scrim/35 to-transparent"
              />

              {/* Slate chrome — the archive's mono register */}
              <SlateTag
                as="div"
                size="xs"
                tracking="18"
                className="absolute inset-x-0 top-0 flex items-start justify-between p-5 text-on-media/75"
              >
                <span>
                  Service {num}
                  {hero && ' · Featured'}
                </span>
                <span className="text-on-media/55 tabular-nums">
                  {num} / {total}
                </span>
              </SlateTag>

              {/* Lockup — printed low on the photo, clear of the chip */}
              <div className="relative p-6 pr-16">
                {used > 0 && (
                  <SlateTag as="p" className="text-on-media/70 tabular-nums">
                    On {pad2(used)} {used === 1 ? 'project' : 'projects'} here
                  </SlateTag>
                )}
                {/* Type steps up when this card holds the shelf's spotlight —
                    keyed off the ServiceShelf wrapper's is-active class */}
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-on-media sm:in-[.is-active]:text-3xl">
                  {service.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-on-media/75 sm:in-[.is-active]:max-w-sm">
                  {service.tagline}
                </p>
              </div>

              {/* Circular open affordance — inverts on hover, Apple style */}
              <span
                aria-hidden
                className="absolute bottom-5 right-5 grid size-10 place-items-center rounded-full bg-on-media/15 text-on-media backdrop-blur-md transition-colors duration-300 group-hover:bg-on-media group-hover:text-scrim"
              >
                <ArrowUpRight className="size-4" />
              </span>
            </Link>
          );
        })}
        </ServiceShelf>
      )}
    </section>
  );
};

export default ProjectCategoryServices;
