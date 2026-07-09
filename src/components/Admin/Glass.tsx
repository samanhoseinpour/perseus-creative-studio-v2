import { cn } from '@/lib/utils';

/**
 * The admin's single glass material — the same frosted surface as the login
 * card (`AdminAuthShell`), lifted into shared tokens so every card, tile, list,
 * and section in the (protected) dashboard is cut from the same glass and can't
 * drift apart. The look: a translucent `--surface` tint (flips light↔dark on its
 * own via the `bg-white/*` FLIP token), a heavy `backdrop-blur` that melts the
 * ThemedShader running behind the shell into a soft colour wash, a hairline
 * `white/*` rim, and a specular top edge (see {@link GlassRim}). Shadows stay
 * literal `neutral-950` so they read as shadow, not glow, after the flip.
 *
 * These are plain strings + a presentational component (no hooks, no
 * `server-only`) so both the server pages and the client sidebar can share them.
 */

/**
 * Crisp frosted pane for working surfaces (cards, lists, form sections).
 *
 * Carries NO position utility on purpose. `cn()` is tailwind-merge, which
 * resolves conflicts last-wins, so a `relative` in here silently overwrites a
 * caller's `sticky`/`fixed`/`absolute` whenever the token is passed after it —
 * which is how the sidebar rail lost its `sticky` and the ⌘K palette its
 * `fixed`. Anything rendering a {@link GlassRim} (absolutely positioned) needs a
 * positioning context: declare your own, or use {@link glassCard}.
 */
export const glassSurface =
  'overflow-hidden rounded-2xl border border-white/60 bg-white/72 shadow-xl shadow-neutral-950/10 backdrop-blur-2xl dark:border-white/12 dark:bg-white/55 dark:shadow-neutral-950/40';

/** {@link glassSurface} plus its own positioning context — the default for cards and panels. */
export const glassCard = cn('relative', glassSurface);

/** Airier frost for chrome the shader should read through (sidebar rail, top bar). */
export const glassChrome =
  'border-white/55 bg-white/45 backdrop-blur-2xl dark:border-white/10 dark:bg-white/25';

/** Interactive lift for glass cards/rows that are links or buttons. */
export const glassHover =
  'transition-colors hover:bg-white/85 hover:border-white/80 dark:hover:bg-white/65 dark:hover:border-white/20';

/** Subtle wash for rows inside an already-frosted panel (no border of their own). */
export const glassRowHover =
  'transition-colors hover:bg-white/45 dark:hover:bg-white/10';

/**
 * Round holder for the small leading icons (profile, passkey, session rows). A
 * plain `bg-muted` chip is near-white on the light frost and vanishes; this
 * faint `--ink` tint + ring reads on both themes because it flips with the ink.
 */
export const glassChip =
  'bg-foreground/[0.06] text-muted-foreground ring-1 ring-foreground/10';

/**
 * Smooth hover underline for inline admin links. `hover:underline` toggles
 * `text-decoration` on/off, which can't transition and snaps in. Instead the
 * underline is always rendered but `decoration-transparent`, fading to the
 * current text colour on hover — `text-decoration-color` IS animatable. Pair
 * with each link's own `text-*`/`hover:text-*`.
 */
export const adminLink =
  'underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-200 ease-out hover:decoration-current';

/**
 * The specular top-edge hairline — a thread of surface light that reads as the
 * lit rim of glass in both themes. Absolutely positioned, so its host must be
 * positioned (`glassCard`, or the host's own `sticky`/`fixed`/`relative`).
 */
export function GlassRim({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-linear-to-r from-transparent via-white/80 to-transparent dark:via-white/25',
        className,
      )}
    />
  );
}

/**
 * A frosted pane with its specular rim already in place. The common case for
 * cards and form sections; interactive glass (Link tiles, the sidebar rail) uses
 * the {@link glassCard}/{@link glassChrome} strings + {@link GlassRim} directly.
 */
export function GlassPanel({
  as: Tag = 'div',
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: 'div' | 'section' }) {
  return (
    <Tag className={cn(glassCard, className)} {...rest}>
      <GlassRim />
      {children}
    </Tag>
  );
}
