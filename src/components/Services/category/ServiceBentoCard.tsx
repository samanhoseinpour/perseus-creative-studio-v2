import Link from 'next/link';
import { LuArrowUpRight } from 'react-icons/lu';
import { twMerge } from 'tailwind-merge';

import { Img } from '@/components';
import { isBrandLogo } from '@/utils/images';
import type { ServiceSummary } from '../types';
import ServiceLogoTile from '../shared/ServiceLogoTile';

interface ServiceBentoCardProps {
  service: ServiceSummary;
  /** Owning category slug — builds the detail href for available services. */
  categorySlug: string;
  /** Grid placement (col/row spans) supplied by the parent layout. */
  className?: string;
  /** Responsive `sizes` for the fill image. */
  sizes?: string;
  /** Hint Next/Image to eager-load (use on the featured cell only). */
  priority?: boolean;
}

/**
 * A single photographic service cell in the bento. Available services link to
 * their detail page; everything else routes to /contact so the demo never
 * dead-ends on a 404. Hover is a slow image push-in + arrow nudge — no
 * grayscale, no shadow.
 */
const ServiceBentoCard = ({
  service,
  categorySlug,
  className,
  sizes = '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw',
  priority,
}: ServiceBentoCardProps) => {
  const href = service.available
    ? `/services/${categorySlug}/${service.slug}`
    : '/contact';

  const isFeatured = Boolean(service.featured);

  // Digital-marketing channels carry a brand mark, not a photo — render the
  // contained logo tile instead of a cropped full-bleed cover.
  if (isBrandLogo(service.imageUrl)) {
    return (
      <ServiceLogoTile
        href={href}
        logoSrc={service.imageUrl}
        logoAlt={service.imageAlt}
        title={service.title}
        tagline={service.tagline}
        topLabel={service.available ? 'Available' : 'On request'}
        ariaLabel={`${service.title} — ${service.tagline}`}
        scale={
          isFeatured ? 'lg' : className?.includes('col-span-2') ? 'md' : 'sm'
        }
        className={className}
      />
    );
  }

  return (
    <Link
      href={href}
      aria-label={`${service.title} — ${service.tagline}`}
      className={twMerge(
        'group relative flex min-h-[14rem] flex-col justify-end overflow-hidden rounded-3xl',
        className,
      )}
    >
      <Img
        src={service.imageUrl}
        alt={service.imageAlt}
        fill
        sizes={sizes}
        priority={priority}
        className={twMerge(
          'rounded-none object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]',
          service.imagePosition,
        )}
      />

      {/* Legibility scrim — sits on a photo, not glass. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-scrim/75 via-scrim/20 to-scrim/5" />

      {/* Top-row status tag */}
      <span className="absolute left-5 top-5 font-mono text-[10px] uppercase tracking-[0.18em] text-on-media/75">
        {service.available ? 'Available' : 'On request'}
      </span>

      <div className="relative flex items-end justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0">
          <h3
            className={twMerge(
              'font-semibold tracking-tight text-on-media',
              isFeatured ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl',
            )}
          >
            {service.title}
          </h3>
          <p
            className={twMerge(
              'mt-1.5 text-on-media/70',
              isFeatured ? 'max-w-md text-sm sm:text-base' : 'text-xs sm:text-sm',
            )}
          >
            {service.tagline}
          </p>
        </div>

        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-on-media/12 text-on-media backdrop-blur-[2px] transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        >
          <LuArrowUpRight className="size-4" />
        </span>
      </div>
    </Link>
  );
};

export default ServiceBentoCard;
