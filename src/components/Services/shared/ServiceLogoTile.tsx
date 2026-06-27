import Link from 'next/link';
import { LuArrowUpRight } from 'react-icons/lu';

import { Img } from '@/components';
import { cn } from '@/lib/utils';

/**
 * The logo-tile treatment for service cards whose artwork is a brand/platform
 * mark (digital-marketing channels) rather than a photo. Used wherever a
 * service surfaces as a card — the category bento, "Most Requested", and the
 * cross-category "More from the studio" grid — so the same six marks read
 * identically across the site and never get cropped under a photo scrim.
 *
 * The mark sits contained (`object-contain`) and centred on a
 * `bg-background-contrast` tile with the label below — the same card the
 * homepage paid-growth carousel uses. Tile + ink are theme tokens, so it reads
 * in light and dark; the full-colour marks sit fine on either ground. The
 * caller owns grid placement (and any `min-h`) via `className`.
 */

export type ServiceLogoTileScale = 'sm' | 'md' | 'lg';

const SCALE: Record<
  ServiceLogoTileScale,
  { logo: string; title: string; tagline: string }
> = {
  sm: {
    logo: 'max-h-16 sm:max-h-20',
    title: 'text-lg sm:text-xl',
    tagline: 'text-xs sm:text-sm',
  },
  md: {
    logo: 'max-h-20 sm:max-h-24',
    title: 'text-xl sm:text-2xl',
    tagline: 'text-xs sm:text-sm',
  },
  lg: {
    logo: 'max-h-28 sm:max-h-32',
    title: 'text-2xl sm:text-3xl',
    tagline: 'max-w-md text-sm sm:text-base',
  },
};

interface ServiceLogoTileProps {
  href: string;
  /** A `/images/shared/logos/...` mark. */
  logoSrc: string;
  logoAlt: string;
  title: string;
  tagline: string;
  /** Eyebrow in the top-left — a status ("Available") or owning category. */
  topLabel: string;
  ariaLabel: string;
  scale?: ServiceLogoTileScale;
  /**
   * Title element — `h3` (default) for grids whose cards are headings; `p`
   * where the host band already owns the heading and cards are plain copy.
   */
  titleAs?: 'h3' | 'p';
  /** Grid placement + any min-height from the host layout. */
  className?: string;
}

const ServiceLogoTile = ({
  href,
  logoSrc,
  logoAlt,
  title,
  tagline,
  topLabel,
  ariaLabel,
  scale = 'sm',
  titleAs = 'h3',
  className,
}: ServiceLogoTileProps) => {
  const s = SCALE[scale];
  const titleClassName = cn(
    'font-semibold tracking-tight text-foreground',
    s.title,
  );

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn(
        'group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl bg-background-contrast p-5 transition-transform duration-300 ease-out hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-6',
        className,
      )}
    >
      {/* Top row — eyebrow + arrow affordance. */}
      <div className="flex items-start justify-between gap-4">
        <span className="eyebrow text-[10px] text-muted-foreground">
          {topLabel}
        </span>
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground/[0.06] text-foreground transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0"
        >
          <LuArrowUpRight className="size-4" />
        </span>
      </div>

      {/* The mark — contained + centred, gentle press-in on hover. It scales to
          whatever room the copy leaves (h-full, capped by s.logo) and the cell
          can shrink it (min-h-0), so the tagline below is never clipped in a
          short cell. */}
      <div className="flex min-h-0 flex-1 items-center justify-center py-2">
        <Img
          src={logoSrc}
          alt={logoAlt}
          width={200}
          height={200}
          className={cn(
            'aspect-square h-full w-auto object-contain transition-transform duration-700 ease-out group-hover:scale-95 motion-reduce:transform-none',
            s.logo,
          )}
        />
      </div>

      {/* Footer — service name + tagline. */}
      <div>
        {titleAs === 'h3' ? (
          <h3 className={titleClassName}>{title}</h3>
        ) : (
          <p className={titleClassName}>{title}</p>
        )}
        <p className={cn('mt-1 text-muted-foreground', s.tagline)}>
          {tagline}
        </p>
      </div>
    </Link>
  );
};

export default ServiceLogoTile;
