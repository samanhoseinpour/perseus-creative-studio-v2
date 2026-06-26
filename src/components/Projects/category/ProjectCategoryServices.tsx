import Link from 'next/link';
import { LuArrowUpRight as ArrowUpRight } from 'react-icons/lu';

import { Heading, Img } from '@/components';
import { CATEGORIES } from '@/constants/services';
import type { ServiceSummary } from '@/components/Services/types';
import type { ProjectCategoryContent } from '../types';
import { pad2 } from '../utils';
import { SlateTag } from '../SlateTag';
import ServiceShelf from './ServiceShelf';

interface ProjectCategoryServicesProps {
  data: ProjectCategoryContent;
}

/** How many of this category's projects carry a tag this service produced —
 *  tags ("Aerial") are shorthand for registry titles ("Aerial Production"). */
function projectsUsing(
  service: ServiceSummary,
  data: ProjectCategoryContent,
): number {
  const title = service.title.toLowerCase();
  return data.projects.filter((p) =>
    (p.services ?? []).some((tag) => title.includes(tag.toLowerCase())),
  ).length;
}

const ProjectCategoryServices = ({ data }: ProjectCategoryServicesProps) => {
  const category = CATEGORIES[data.slug];
  if (!category || category.services.length === 0) return null;

  const total = pad2(category.services.length);

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

      <ServiceShelf>
        {category.services.map((service, i) => {
          const used = projectsUsing(service, data);
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
    </section>
  );
};

export default ProjectCategoryServices;
