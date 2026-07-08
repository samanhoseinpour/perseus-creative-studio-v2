'use client';

import ImgClient from '@/components/ImgClient';
import { cn } from '@/lib/utils';

type AdminAvatarProps = {
  /** Resolved `/images/...` photo path, or undefined for the initials fallback. */
  src?: string;
  /** Blur-up placeholder threaded from a server parent (`blurFor(src)`). */
  blur?: string;
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
 * resolved (via `resolveAdminAvatar`), otherwise a token-styled initials
 * monogram — so the org account and any future admin without a roster photo
 * still gets a clean mark instead of a broken image. Client-graph safe: the
 * photo goes through `<ImgClient>` with its blur passed in as a prop.
 */
export default function AdminAvatar({
  src,
  blur,
  name,
  size = 40,
  className,
}: AdminAvatarProps) {
  if (src) {
    return (
      <ImgClient
        src={src}
        alt={name}
        width={size}
        height={size}
        blur={blur}
        className={cn(
          'shrink-0 rounded-full object-cover ring-1 ring-border',
          className,
        )}
      />
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
