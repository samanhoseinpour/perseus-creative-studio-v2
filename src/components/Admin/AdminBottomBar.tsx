'use client';

import { useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { LuSearch } from 'react-icons/lu';

import AdminAvatar from '@/components/Admin/AdminAvatar';
import CountBadge from '@/components/Admin/CountBadge';
import { glassSurface, GlassRim } from '@/components/Admin/Glass';
import { SHEET_EASE } from '@/components/MobileSheet';
import { openAdminSearch } from '@/lib/adminSearch';
import { isAdminRouteActive, type AdminNavItem } from '@/lib/adminNav';
import { cn } from '@/lib/utils';

/**
 * The phone-only bottom nav: a floating glass rail of every nav item the
 * viewer can see, a pinned account cell at the pill's trailing edge, and a
 * docked ink search circle that opens the ⌘K palette (search's one mobile home
 * — the top bar's glyph moved down here). The rail scrolls horizontally with
 * edge-fade affordances and auto-centers the active tab, whose inverted ink
 * pill (the mobile sheet's active vocabulary) glides between tabs via a shared
 * layoutId. AdminSidebar mounts it as a sibling of the mobile header — the
 * header's backdrop-blur would otherwise become this fixed bar's containing
 * block (the MobileSheet gotcha) — and passes the
 * already-`canSeeNavItem`-filtered items, so a grant change re-derives the
 * rail on the next render with no logic here.
 */

type AdminBottomBarProps = {
  /**
   * Pre-filtered, registry-ordered rail items. Profile is NOT among them — it
   * has no rail row anywhere in the chrome, and here it is the pinned cell
   * below (`profile`), which never scrolls out of reach.
   */
  items: AdminNavItem[];
  /** The same masked tallies AdminSidebar renders as row badges. */
  counts?: { project: number; career: number; ticket?: number; task?: number };
  /**
   * The pinned account cell — the phone's door to /admin/profile, which
   * otherwise lives only in the mobile sheet's footer (behind the hamburger),
   * taking the unseen-updates dot with it.
   */
  profile: {
    name: string;
    avatar: { src: string; blur?: string; mark?: boolean } | null;
    /**
     * Unseen release entries — already the sidebar's LOCALLY mirrored count,
     * so a dismissal clears the dot here in the same frame it clears there.
     */
    unseen: number;
    /**
     * The accessible name, composed once in AdminSidebar beside the identity
     * block's so the two doors to Profile can never announce it differently.
     */
    label: string;
  };
  /** True while the mobile sheet is open — fades the bar and pulls its tabs from the tab order. */
  inert?: boolean;
};

export default function AdminBottomBar({
  items,
  counts,
  profile,
  inert = false,
}: AdminBottomBarProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);
  const firstScrollRef = useRef(true);

  // Center the active tab. Deps are deliberately pathname-only (plus the
  // motion pref): `items`/`counts` are rebuilt with fresh identity on every
  // AdminSidebar render (sheet toggle, collapse), and re-running then would
  // yank the rail out from under a hand-scroll — which is also why the effect
  // reads the DOM instead of props. Layout effect + instant behavior on first
  // paint so a far-right active tab (Payroll, Activity) is visible before
  // paint rather than animating chrome on load. It measures the cell, not the
  // link: a mid-flight Motion transform would make the cell the link's
  // offsetParent and skew offsetLeft, while the cell's own offsetParent is
  // always the (relative) rail.
  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const cell = rail
      .querySelector('[aria-current="page"]')
      ?.closest<HTMLElement>('[data-rail-cell]');
    if (!cell) return; // e.g. /admin/profile — no rail row is active
    const first = firstScrollRef.current;
    firstScrollRef.current = false;
    const target = cell.offsetLeft - (rail.clientWidth - cell.offsetWidth) / 2;
    rail.scrollTo({
      left: Math.max(0, Math.min(target, rail.scrollWidth - rail.clientWidth)),
      behavior: first || reduceMotion ? 'auto' : 'smooth',
    });
  }, [pathname, reduceMotion]);

  const transition = { duration: reduceMotion ? 0 : 0.3, ease: SHEET_EASE };
  // Hardcoded like the sidebar footer's two Profile links, not read back out
  // of ADMIN_ROUTES: the cell renders the viewer's own face rather than the
  // registry's icon, so the row it would import is only the href.
  const profileActive = isAdminRouteActive('/admin/profile', pathname);

  return (
    <div
      inert={inert}
      className={cn(
        // pointer-events-none so taps fall through the empty flanks when a
        // few-grants rail centers as a short pill; the pill and the search
        // circle opt back in. Per-side max() keeps the bar off the home
        // indicator and out from under landscape notch cheeks.
        'pointer-events-none fixed z-30 flex items-center justify-center gap-2 lg:hidden',
        'bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))]',
        'transition-opacity duration-200 ease-out motion-reduce:transition-none',
        inert ? 'opacity-0' : 'opacity-100',
      )}
    >
      {/* glassSurface's overflow-hidden clips the scrolling rail to the pill;
          the round search button lives OUTSIDE as a flex sibling so it can
          never be clipped. min-w-0 lets the pill shrink-wrap a short rail.
          The <nav> landmark sits on the PILL rather than on the scroller
          because the account cell is a SIBLING of the scroller, not a child —
          on the scroller it would have left Profile outside the landmark. */}
      <nav
        aria-label="Admin sections"
        className={cn(
          glassSurface,
          'pointer-events-auto relative flex h-14 min-w-0 items-center rounded-full',
        )}
      >
        <GlassRim />
        {/* layoutScroll: the shared-layoutId pill is measured inside this
            scroller, and without it a scrolled rail offsets the pill's start
            snapshot by scrollLeft. The mask's 1.25rem ramps sit inside px-3 +
            first-cell padding so a fully-scrolled end item is never dimmed —
            and the trailing ramp now also feeds the tabs under the account
            cell's divider instead of ending in a hard edge.
            Deliberately NO scroll-snap: with ~44px cells the snap points are
            so dense that momentum scrolling ratchets, and the browser re-snaps
            AFTER the centering scrollTo, yanking the active tab off-center.
            overscroll-x-contain stops an end-of-rail swipe from turning into
            the browser's back-navigation gesture. min-w-0 is what lets a
            scroller shrink below its content inside the flex pill (its default
            `min-width: auto` would push the account cell off the screen). */}
        <motion.div
          ref={railRef}
          layoutScroll
          data-lenis-prevent
          className={cn(
            'no-scrollbar relative flex h-full min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain px-3',
            '[mask-image:linear-gradient(to_right,transparent,black_1.25rem,black_calc(100%-1.25rem),transparent)]',
          )}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const active = isAdminRouteActive(item.href, pathname);
            const n = item.badge ? (counts?.[item.badge] ?? 0) : 0;
            const accessibleName =
              n > 0 ? `${item.label}, ${n} new` : item.label;

            return (
              // Plain cells: every tab shows its micro-label, so activation
              // changes only colors — nothing reflows, and the pill's glide is
              // the only geometry that moves.
              <div key={item.href} data-rail-cell className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  aria-label={accessibleName}
                  className={cn(
                    // h-12 clears the 44px tap floor; min-w keeps short-label
                    // tabs from reading as unevenly sized pills.
                    'relative flex h-12 min-w-14 flex-col items-center justify-center gap-0.5 rounded-full px-2.5',
                    'transition-colors duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none',
                    active
                      ? 'text-background'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="admin-bottombar-pill"
                      transition={transition}
                      // In `style`, not a class, so Motion distortion-corrects
                      // the radius while the pill scales between label widths.
                      style={{ borderRadius: 9999 }}
                      className="absolute inset-0 bg-foreground"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10 flex flex-col items-center gap-0.5">
                    <span className="relative flex">
                      <Icon className="size-5 shrink-0" aria-hidden="true" />
                      {item.badge && n > 0 && (
                        <span
                          // The count already lives in the link's accessible
                          // name (the collapsed-rail recipe).
                          aria-hidden="true"
                          className={cn(
                            'absolute -right-1.5 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.55rem] font-semibold tabular-nums',
                            'transition-colors duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none',
                            // Stays a surface-colored dot on ink in both
                            // states: ink dot on glass, glass dot on the pill.
                            active
                              ? 'bg-background text-foreground'
                              : 'bg-foreground text-background',
                          )}
                        >
                          {n > 9 ? '9+' : n}
                        </span>
                      )}
                    </span>
                    <span className="whitespace-nowrap text-[0.625rem] font-medium leading-none">
                      {item.label}
                    </span>
                  </span>
                </Link>
              </div>
            );
          })}
        </motion.div>

        {/* The account cell — pinned, so the one door to your own page can't
            scroll out of reach the way a tab would, and so the unseen-updates
            dot is visible on a phone at all (until now it lived only on the
            identity block inside the hamburger sheet).

            Its active state is a ring on the avatar and an ink label, NOT the
            tabs' inverted pill: an identity chip is not a work surface, which
            is the same reading that leaves the sidebar's identity block with
            no active wash. Sitting outside the scroller, it is also invisible
            to the centering effect above — which is why `/admin/profile`
            correctly leaves the rail where the reader left it. */}
        <div className="flex h-full shrink-0 items-center border-l border-white/60 pl-1.5 pr-2 dark:border-white/12">
          <Link
            href="/admin/profile"
            aria-label={profile.label}
            aria-current={profileActive ? 'page' : undefined}
            className={cn(
              // The tab geometry verbatim, so the label baselines line up
              // across the divider and the tap target clears the 44px floor.
              'relative flex h-12 min-w-14 flex-col items-center justify-center gap-0.5 rounded-full px-2.5',
              'transition-colors duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none',
              profileActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="relative flex">
              <AdminAvatar
                src={profile.avatar?.src}
                blur={profile.avatar?.blur}
                mark={profile.avatar?.mark}
                name={profile.name}
                // 24 against the tabs' 20px glyphs, deliberately: a photo
                // INSCRIBED in a circle reads lighter than a line icon that
                // spans its whole box, and behind the divider this cell is its
                // own zone rather than another step in the icon rhythm. It
                // also gives a face — and the org account's contained wordmark
                // — enough pixels to be recognised at a glance. The cell's own
                // box is unchanged (24 + 2 gap + 10 label = 36 inside h-12),
                // so nothing reflows and the badge still clears the pill.
                // tailwind-merge resolves the ring below against AdminAvatar's
                // own `ring-1 ring-border` — last wins.
                size={24}
                className={cn(
                  'transition-shadow duration-300 motion-reduce:transition-none',
                  profileActive && 'ring-2 ring-foreground',
                )}
              />
              {/* The count is already in the link's accessible name (the
                  collapsed-rail recipe), which is why CountBadge is
                  aria-hidden. Absolutely positioned, so a new release can't
                  reflow the bar. */}
              <CountBadge
                count={profile.unseen}
                className="absolute -right-1.5 -top-1"
              />
            </span>
            <span className="whitespace-nowrap text-[0.625rem] font-medium leading-none">
              Profile
            </span>
          </Link>
        </div>
      </nav>

      {/* The raised search circle — the reference bar's accent action, in the
          admin's ink instead of a brand color. A bare element rather than
          Button.tsx for the same reason the removed top-bar glyph was. */}
      <button
        type="button"
        aria-label="Search"
        aria-keyshortcuts="Meta+K"
        onClick={() => openAdminSearch()}
        className="pointer-events-auto flex size-14 shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-xl shadow-neutral-950/25 transition-transform duration-200 active:scale-95 motion-reduce:transition-none"
      >
        <LuSearch className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
