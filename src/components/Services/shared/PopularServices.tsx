import Link from 'next/link';
import { LuArrowUpRight } from 'react-icons/lu';
import { twMerge } from 'tailwind-merge';

import { Container, Heading, ImageKit } from '@/components';
import { CATEGORIES } from '@/constants/services';
import type { ServiceCategoryContent, ServiceSummary } from '../types';

/**
 * "Most Requested" — the studio's most-asked-for individual services, rendered
 * as a sub-band INSIDE `ServicesList` (between the category carousel and the
 * "View All Services" CTA), not as a standalone section. Each cell carries the
 * service's real `imageUrl` from `services.ts`, full-bleed, behind a scrim.
 *
 * Overlay colors use the theme-independent `on-media` / `scrim` tokens (NOT
 * `white` / `black`, which flip via `ink`/`surface` and would invert the scrim
 * over a photo in dark mode). The asymmetric bento differentiates it from the
 * full-bleed photo carousel above. Server component (no state).
 */

type Size = 'hero' | 'wide' | 'small';

interface Cell {
  categorySlug: string;
  slug: string;
  /** Tailwind span classes applied from `sm`/`lg` up; base is a single cell. */
  span: string;
  size: Size;
}

// Order + spans chosen so the grid is gapless at every breakpoint, and the two
// Websites cells (which share artwork) never sit adjacent.
const CELLS: Cell[] = [
  {
    categorySlug: 'production',
    slug: 'videography',
    span: 'sm:col-span-2 lg:row-span-2',
    size: 'hero',
  },
  {
    categorySlug: 'websites',
    slug: 'website-design',
    span: 'sm:col-span-2',
    size: 'wide',
  },
  { categorySlug: 'digital-marketing', slug: 'seo', span: '', size: 'small' },
  {
    categorySlug: 'digital-marketing',
    slug: 'meta-ads',
    span: '',
    size: 'small',
  },
  { categorySlug: 'production', slug: 'photography', span: '', size: 'small' },
  {
    categorySlug: 'social',
    slug: 'social-media-management',
    span: '',
    size: 'small',
  },
  {
    categorySlug: 'websites',
    slug: 'performance-seo-audit',
    span: 'sm:col-span-2',
    size: 'wide',
  },
];

interface PopularServicesProps {
  style?: string;
}

const PopularServices = ({ style }: PopularServicesProps) => {
  const tiles = CELLS.map((cell) => {
    const category: ServiceCategoryContent | undefined =
      CATEGORIES[cell.categorySlug];
    const service = category?.services.find((s) => s.slug === cell.slug);
    if (!category || !service) return null;
    return { cell, category, service };
  }).filter(Boolean) as {
    cell: Cell;
    category: ServiceCategoryContent;
    service: ServiceSummary;
  }[];

  return (
    <div className={twMerge('mt-12', style)}>
      {/* Reuses the Heading primitive (title + accent + description) with its
          separator row suppressed, so the sub-band matches the site's heading
          type minus the divider rule. titleStyle keeps it under the section H2. */}
      <Heading
        titleTag="h3"
        showSeparator={false}
        title="Most Requested Services"
        titleAccent="What brands come to us for."
        titleStyle="text-2xl sm:text-3xl"
        description="Video, websites, marketing, and social — the work brands book most."
      />
      <Container>
        <div className="mt-8 grid auto-rows-[12.5rem] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map(({ cell, category, service }) => (
            <BentoCell
              key={`${category.slug}-${service.slug}`}
              cell={cell}
              href={`/services/${category.slug}/${service.slug}`}
              eyebrow={category.title}
              title={service.title}
              tagline={service.tagline}
              imageUrl={service.imageUrl}
              imageAlt={service.imageAlt}
            />
          ))}
        </div>
      </Container>
    </div>
  );
};

/* ─────────────────────────────  one cell  ───────────────────────────── */

interface BentoCellProps {
  cell: Cell;
  href: string;
  eyebrow: string;
  title: string;
  tagline: string;
  imageUrl: string;
  imageAlt: string;
}

const BentoCell = ({
  cell,
  href,
  eyebrow,
  title,
  tagline,
  imageUrl,
  imageAlt,
}: BentoCellProps) => {
  const isHero = cell.size === 'hero';
  const isWide = cell.size === 'wide';
  const sizes =
    isHero || isWide
      ? '(min-width: 1024px) 600px, 100vw'
      : '(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw';

  return (
    <Link
      href={href}
      aria-label={`${title} — ${eyebrow}`}
      className={twMerge(
        'group relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 text-on-media transition-transform duration-300 ease-out hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-on-media/60 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-6',
        cell.span,
      )}
    >
      {/* Real service image (object-cover fill behind the copy). */}
      <ImageKit
        src={imageUrl}
        alt={imageAlt}
        fill
        sizes={sizes}
        className="-z-20 rounded-3xl object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transform-none"
      />

      {/* Legibility scrim — `scrim` stays dark in both themes (photos don't flip). */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 rounded-3xl bg-linear-to-b from-scrim/45 via-scrim/15 to-scrim/85"
      />

      {/* Header row — category eyebrow + arrow affordance. */}
      <div className="relative flex items-start justify-between gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-media/70">
          {eyebrow}
        </span>
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full bg-on-media/10 ring-1 ring-inset ring-on-media/25 backdrop-blur-sm transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
        >
          <LuArrowUpRight className="size-4" />
        </span>
      </div>

      {/* Footer — service name + tagline. */}
      <div className="relative">
        <p
          className={twMerge(
            'font-semibold tracking-tight',
            isHero
              ? 'text-3xl sm:text-4xl'
              : isWide
                ? 'text-xl sm:text-2xl'
                : 'text-lg',
          )}
        >
          {title}
        </p>
        <p
          className={twMerge(
            'mt-1.5 line-clamp-2 text-sm text-on-media/70',
            isHero && 'max-w-sm',
          )}
        >
          {tagline}
        </p>
      </div>
    </Link>
  );
};

export default PopularServices;
