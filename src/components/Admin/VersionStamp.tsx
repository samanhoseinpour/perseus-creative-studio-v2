'use client';

import { adminLink } from '@/components/Admin/Glass';
import { useUnreadReleases } from '@/components/Admin/UnreadReleases';
import { CURRENT_VERSION, openReleaseHistory } from '@/lib/releaseFields';
import { cn } from '@/lib/utils';

/**
 * The build stamp at the foot of every protected page — a colophon, which is a
 * SENTENCE, not a bar.
 *
 * It has been three things. A `border-t` with a lone right-aligned link; then a
 * drafting "dimension line" — a 2.5px tick anchoring a full-width hairline,
 * PERSEUS DASHBOARD in tracked micro-caps at one end and a glass chip at the
 * other. Each revision added an object, and the second was rejected on sight.
 * Four things were wrong with it and all four are why this one is bare type:
 *
 *  - **A full-width composition cannot survive AdminPage's three width tokens.**
 *    The widest is 2.3x the narrowest (max-w-4xl -> 2100px), so the same code
 *    was a tidy caption on a payslip and, on a task board, a 2100px rule holding
 *    two specks apart with the whole column of nothing between them.
 *  - **The rule redrew an edge that was already there.** The page's last glass
 *    panel ends about 40px above it at exactly that measure. A hairline under it
 *    states the column width twice.
 *  - **The wordmark restated the rail.** 11px uppercase at 0.16em is the most
 *    templated gesture in agency web design, and it repeated branding the rail
 *    logo and the top bar already carry, at the bottom of the page, where it
 *    does the least work of anywhere it could sit.
 *  - **The chip was a button shape carrying metadata.** It was the only glass
 *    object in the dashboard holding no content, so against the pastel wash it
 *    read as a disabled input someone had left behind. (Same category error as
 *    the sign-in pill that AuthOrb replaced: a wait, and a build number, are
 *    both things that are TRUE — neither is something to press.)
 *
 * So: one line, LEFT-ALIGNED to the content column, separated by whitespace
 * alone. Left rather than centred is structural, not taste — a centred caption
 * has no ends to drift but its own left edge then travels from ~350px under
 * `narrow` to ~960px under `table`, abandoning the one vertical line the eye
 * tracks down the page; and small centred grey type at the dead bottom of a
 * page is the copyright-line shape this dashboard must not wear.
 *
 * THE COUNT STAYS HERE, and that is a requirement rather than a preference.
 * The obvious saving is to drop it because the rail's identity block already
 * carries a CountBadge — but that rail is `hidden … lg:flex`, the mobile top bar
 * is brand + hamburger, and AdminBottomBar has no Profile row ("footer parity").
 * So below `lg` this line is the ONLY unread signal that appears without opening
 * a sheet, on a dashboard that installs to a Home Screen. It is spelled in words
 * instead of pinned as a badge: a badge belongs ON an icon, and one hanging off
 * a version number reads as an error state.
 *
 * Ink only, three tonal steps — muted label, ink numeral, foreground/25 middot.
 * The theme has no chroma, so the unread state is carried typographically too:
 * the link goes from muted to ink and its underline is already drawn.
 *
 * CURRENT_VERSION comes from the client-safe LEAF, never from
 * src/lib/adminReleases.ts — AdminSkeletons.tsx imports AdminPage, which imports
 * this, and that file's header contract forbids `server-only` modules and the
 * registries anywhere in its import graph.
 *
 * `print:hidden` is load-bearing, not defensive: the payslip and the report
 * sheets print through AdminPage.
 */
export default function VersionStamp() {
  const unread = useUnreadReleases();

  return (
    <p className="mt-12 text-xs text-muted-foreground lg:mt-16 print:hidden">
      Perseus Dashboard{' '}
      <span className="font-medium tabular-nums text-foreground">
        {CURRENT_VERSION}
      </span>
      {/* A middot, not a rule: it separates without being an object with ends. */}
      <span aria-hidden="true" className="px-1.5 text-foreground/25">
        ·
      </span>
      <button
        type="button"
        onClick={openReleaseHistory}
        className={cn(
          // The house inline-link token — the underline is always rendered but
          // `decoration-transparent`, so its colour can TRANSITION in on hover
          // (`text-decoration-line` cannot). This footer was the one inline link
          // in /admin not using it.
          adminLink,
          // Tighter than the token's offset-4, which is set for body copy and
          // floats off a 12px line. cn() is tailwind-merge, so this wins.
          'underline-offset-[3px]',
          // A wider target and a focus ring that isn't skin-tight, at zero
          // layout cost — the negative margin gives the padding back to the
          // line. Do NOT add a `transition-*` here: tailwind-merge would replace
          // the token's own and the underline would snap in instead of fading.
          '-mx-1 rounded-sm px-1',
          'focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none',
          unread > 0
            ? // Unread: ink, medium, underline already drawn. No dot, no pill,
              // no hue — the sentence says the number out loud instead.
              'font-medium text-foreground decoration-current'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {unread > 0
          ? `${unread} new update${unread === 1 ? '' : 's'}`
          : 'What’s new'}
      </button>
    </p>
  );
}
