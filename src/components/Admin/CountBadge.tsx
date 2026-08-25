import { cn } from '@/lib/utils';

/**
 * A notification badge — a filled pill carrying the NUMBER, the way every OS
 * and every app draws one.
 *
 * It replaced a bare 10px dot on the sidebar avatar, which read as a blob
 * rather than a badge: "something" without saying how much, which is exactly
 * the information a badge exists to carry.
 *
 * INVERTED, unlike the nav-row counts. Those sit inside a row and use
 * `glassChip` — a tint — because the glass active wash already keeps them
 * legible. This one sits ON something (an avatar, a chip) and has to read
 * against arbitrary pixels underneath, so it fills with ink and inverts its
 * text. Still no chroma: the admin theme has none, and a red badge would be the
 * first hue in the dashboard.
 *
 * The ring is a FLIP token at partial alpha, never `ring-background` — an
 * opaque disc of the page ground painted onto frosted glass reads as a hole in
 * dark mode.
 *
 * `aria-hidden` on purpose: every caller already spells the count into its own
 * accessible name ("Profile — Saman — 2 new updates"), so announcing it twice
 * would be worse than not announcing it here.
 */
export default function CountBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        // h-4 with a matching min-w keeps a single digit circular and lets two
        // digits grow into a pill rather than squashing the glyphs.
        'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1',
        'text-[0.625rem] leading-none font-semibold tabular-nums',
        'bg-foreground text-background ring-2 ring-white/80 dark:ring-white/25',
        className,
      )}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}
