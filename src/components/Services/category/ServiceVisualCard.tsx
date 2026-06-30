import Link from 'next/link';
import type { ReactNode } from 'react';
import { LuArrowUpRight } from 'react-icons/lu';

import { cn } from '@/lib/utils';

interface ServiceVisualCardProps {
  href: string;
  /** The cell-filling artifact (from `socialBentoVisuals`). */
  visual: ReactNode;
  title: string;
  tagline: string;
  ariaLabel: string;
  /** Featured cells render the title a step larger. */
  featured?: boolean;
  /**
   * Optional top-left eyebrow (e.g. the owning category) — used in the
   * cross-category grid so visual cells carry the same discipline label as the
   * photo/logo cells beside them. Omitted in same-category grids.
   */
  topLabel?: string;
  /** Grid placement (col/row spans) supplied by the parent layout. */
  className?: string;
}

/**
 * A bento service cell whose media is a bespoke code visual rather than a photo
 * — used by the Social category, where the work *is* a content plan / reporting
 * board / creator roster, not a stock image. Shares the `bg-background-contrast`
 * ground and hover-lift of `ServiceLogoTile` so it reads as the same family of
 * card, and the title/tagline/arrow footer of the photographic `ServiceBentoCard`
 * so a row of mixed cells stays coherent. The artifact owns the cell above the
 * footer; this component never crops or scrims it.
 */
const ServiceVisualCard = ({
  href,
  visual,
  title,
  tagline,
  ariaLabel,
  featured,
  topLabel,
  className,
}: ServiceVisualCardProps) => (
  <Link
    href={href}
    aria-label={ariaLabel}
    className={cn(
      'group relative flex h-full min-h-[14rem] flex-col justify-between gap-5 overflow-hidden rounded-3xl bg-background-contrast p-5 transition-transform duration-300 ease-out hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-6',
      className,
    )}
  >
    {topLabel && (
      <span className="eyebrow text-[10px] text-muted-foreground">
        {topLabel}
      </span>
    )}

    {/* The artifact — fills the room the footer leaves; can shrink (min-h-0) so
        a short cell never clips the label below. */}
    <div className="flex min-h-0 flex-1 items-center justify-center">
      {visual}
    </div>

    {/* Footer — service name + tagline + arrow affordance. */}
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h3
          className={cn(
            'font-semibold tracking-tight text-foreground',
            featured ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl',
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            'mt-1 text-muted-foreground',
            featured ? 'max-w-md text-sm sm:text-base' : 'text-xs sm:text-sm',
          )}
        >
          {tagline}
        </p>
      </div>

      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground/[0.06] text-foreground transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
      >
        <LuArrowUpRight className="size-4" />
      </span>
    </div>
  </Link>
);

export default ServiceVisualCard;
