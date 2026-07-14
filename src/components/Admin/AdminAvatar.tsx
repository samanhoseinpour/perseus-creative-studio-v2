'use client';

import { useState } from 'react';

import ImgClient from '@/components/ImgClient';
import { isAvatarUrl } from '@/lib/avatarPaths';
import { cn } from '@/lib/utils';

type AdminAvatarProps = {
  /**
   * Resolved photo src — a `/images/...` Team-photo path or the
   * `/admin/avatars/...` streaming URL of an uploaded photo; undefined for
   * the initials fallback.
   */
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
 * Round avatar for the admin chrome. Renders the admin's uploaded photo when
 * one exists (streamed from a private blob via /admin/avatars/…), else their
 * Team photo when one is resolved (via `resolveAdminAvatar`), the Perseus
 * wordmark chip when the resolver flags `mark` (the org account), otherwise a
 * token-styled initials monogram — so any admin without a photo still gets a
 * clean mark instead of a broken image. Client-graph safe: the Team photo
 * goes through `<ImgClient>` with its blur passed in as a prop.
 */
export default function AdminAvatar({
  src,
  blur,
  mark,
  name,
  size = 40,
  className,
}: AdminAvatarProps) {
  // Uploaded-avatar branch only: a failed load (missing blob, signed-out
  // route fetch) degrades to the initials monogram instead of a broken glyph.
  // Keyed BY src so it self-resets when a new upload mints a new ?v= URL —
  // a plain boolean would latch initials on the persistent sidebar instance
  // for the rest of the session, even after a successful re-upload.
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const uploaded = !!src && !mark && isAvatarUrl(src);
  const broken = !!src && brokenSrc === src;

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

  if (uploaded && !broken) {
    // Uploaded photo, streamed from the PRIVATE blob via /admin/avatars/….
    // Deliberately a native <img>, NOT <ImgClient>: resolveImageSrc collapses
    // any non-/images/ src to the shared placeholder, and the static-variant
    // loader has no rungs for a route URL (same reasoning as the third-party
    // avatars in GoogleReviewsShelf). The ?v= on the src is content-derived,
    // so the browser cache handles re-renders.
    return (
      <span
        style={{ width: size, height: size }}
        className={cn(
          'relative inline-block shrink-0 overflow-hidden rounded-full ring-1 ring-border',
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setBrokenSrc(src ?? null)}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  if (src && !uploaded) {
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
