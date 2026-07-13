'use client';

import ImgClient from '@/components/ImgClient';
import { cn } from '@/lib/utils';

type AdminAvatarProps = {
  /** Resolved `/images/...` photo path, or undefined for the initials fallback. */
  src?: string;
  /** Blur-up placeholder threaded from a server parent (`blurFor(src)`). */
  blur?: string;
  /** `src` is the brand wordmark, not a photo — contain it on a chip instead of cropping. */
  mark?: boolean;
  name: string;
  /** Rendered square edge, in px. */
  size?: number;
  className?: string;
};

/** First letters of the first and last words of a name, e.g. "Perseus Studio" → "PS". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/**
 * Round avatar for the admin chrome. Renders the admin's Team photo when one is
 * resolved (via `resolveAdminAvatar`), the Perseus wordmark chip when the
 * resolver flags `mark` (the org account), otherwise a token-styled initials
 * monogram — so any future admin without a roster photo still gets a clean
 * mark instead of a broken image. Client-graph safe: the photo goes through
 * `<ImgClient>` with its blur passed in as a prop.
 */
export default function AdminAvatar({
  src,
  blur,
  mark,
  name,
  size = 40,
  className,
}: AdminAvatarProps) {
  if (src && mark) {
    // Brand-mark mode (the org account): the wordmark is wide and
    // black-on-transparent, so face-cropping it like a photo would clip it to
    // gibberish and lose it entirely on dark glass. Instead it sits contained
    // on the same muted chip as the monogram, inverted in dark mode exactly
    // like the sidebar/navbar renderings of this asset. Percentage padding
    // scales the inset with `size`, so the 36px sidebar chip and the 64px
    // profile chip keep the same proportions.
    return (
      <span
        style={{ width: size, height: size }}
        className={cn(
          'relative inline-block shrink-0 overflow-hidden rounded-full',
          'bg-muted ring-1 ring-border',
          className,
        )}
      >
        <ImgClient
          src={src}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full rounded-none object-contain p-[15%] dark:invert"
        />
      </span>
    );
  }

  if (src) {
    // Fixed square wrapper we fully control: `overflow-hidden rounded-full`
    // clips any non-square source to a perfect circle and the ring traces the
    // circular container (not the image box), so the ring reads as a true
    // circle regardless of the photo's intrinsic aspect. ImgClient forwards
    // `className` but not `style`, hence the box lives on this span.
    return (
      <span
        style={{ width: size, height: size }}
        className={cn(
          'relative inline-block shrink-0 overflow-hidden rounded-full ring-1 ring-border',
          className,
        )}
      >
        <ImgClient
          src={src}
          alt={name}
          width={size}
          height={size}
          blur={blur}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      aria-label={name}
      role="img"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full',
        'bg-muted font-semibold tracking-tight text-muted-foreground ring-1 ring-border',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
