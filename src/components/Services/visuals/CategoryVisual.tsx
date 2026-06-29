import Img from '@/components/Img';
import { cn } from '@/lib/utils';

/**
 * Category cover — a real Perseus photograph behind the service-category
 * surfaces (CategoryHero, the /services hub index, the OtherCategories grid,
 * and AboutServices). Every discipline ships a real cover now, so the root is
 * tagged `data-media="photo"` and globals.css pins the media tokens (light ink
 * + dark scrim, both themes) on any category cell that contains one — hosts
 * need no per-call change.
 *
 * Variants only tune image priority/sizes for context:
 *  - `hero`  — eager (CategoryHero, above the fold).
 *  - `card` / `thumb` — lazy (hub float preview, OtherCategories, mobile thumb).
 */

export type CategoryVisualVariant = 'hero' | 'card' | 'thumb';

interface CategoryVisualProps {
  slug: string;
  variant?: CategoryVisualVariant;
  className?: string;
}

/** Fine fractal-noise grain over the photo plate. */
const GRAIN_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Lower-left vignette that seats the on-media scrim + H1. */
const VIGNETTE_BG =
  'radial-gradient(95% 85% at 22% 102%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 58%)';

/** Per-discipline real photograph covers, keyed by category slug. */
const PHOTO: Record<string, { src: string; alt: string }> = {
  production: {
    src: '/images/categories/category-production.avif',
    alt: '',
  },
  websites: {
    src: '/images/categories/category-websites.avif',
    alt: '',
  },
  'digital-marketing': {
    src: '/images/categories/category-digital-marketing.avif',
    alt: '',
  },
  social: {
    src: '/images/categories/category-social.avif',
    alt: '',
  },
  branding: {
    src: '/images/categories/category-branding.avif',
    alt: '',
  },
};

/** True when a category has a cover photo (currently every category). */
export const isPhotoCategory = (slug: string): boolean => slug in PHOTO;

const CategoryVisual = ({ slug, variant = 'hero', className }: CategoryVisualProps) => {
  // Every category is in PHOTO; fall back to production for any unknown slug.
  const photo = PHOTO[slug] ?? PHOTO.production;

  return (
    <div
      data-media="photo"
      className={cn('absolute inset-0 overflow-hidden bg-[#0a0a0b]', className)}
    >
      <Img
        src={photo.src}
        alt={photo.alt}
        fill
        priority={variant === 'hero'}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw"
        className="h-full w-full rounded-none object-cover"
      />
      {/* light uniform darken so the on-media (light) chrome stays legible */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/15" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-soft-light"
        style={{ backgroundImage: GRAIN_BG }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: VIGNETTE_BG }}
      />
    </div>
  );
};

export default CategoryVisual;
