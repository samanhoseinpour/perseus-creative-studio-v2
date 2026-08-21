'use client';

import { useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { LuSearch } from 'react-icons/lu';

import { glassSurface, GlassRim } from '@/components/Admin/Glass';
import { SHEET_EASE } from '@/components/MobileSheet';
import { openAdminSearch } from '@/lib/adminSearch';
import { isAdminRouteActive, type AdminNavItem } from '@/lib/adminNav';
import { cn } from '@/lib/utils';

/**
 * The phone-only bottom nav: a floating glass rail of every nav item the
 * viewer can see, plus a docked ink search circle that opens the ⌘K palette
 * (search's one mobile home — the top bar's glyph moved down here). The rail
 * scrolls horizontally with edge-fade affordances and auto-centers the active
 * tab, whose inverted ink pill (the mobile sheet's active vocabulary) glides
 * between tabs via a shared layoutId. AdminSidebar mounts it as a sibling of
 * the mobile header — the header's backdrop-blur would otherwise become this
 * fixed bar's containing block (the MobileSheet gotcha) — and passes the
 * already-`canSeeNavItem`-filtered items, so a grant change re-derives the
 * rail on the next render with no logic here.
 */

type AdminBottomBarProps = {
  /** Pre-filtered, registry-ordered rail items — no Profile row (footer parity). */
  items: AdminNavItem[];
  /** The same masked tallies AdminSidebar renders as row badges. */
  counts?: { project: number; career: number; ticket?: number; task?: number };
  /** True while the mobile sheet is open — fades the bar and pulls its tabs from the tab order. */
  inert?: boolean;
};

export default function AdminBottomBar({
  items,
  counts,
  inert = false,
}: AdminBottomBarProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const railRef = useRef<HTMLElement>(null);
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
          never be clipped. min-w-0 lets the pill shrink-wrap a short rail. */}
      <div
        className={cn(
          glassSurface,
          'pointer-events-auto relative h-14 min-w-0 rounded-full',
        )}
      >
        <GlassRim />
        {/* layoutScroll: the shared-layoutId pill is measured inside this
            scroller, and without it a scrolled rail offsets the pill's start
            snapshot by scrollLeft. The mask's 1.25rem ramps sit inside px-3 +
            first-cell padding so a fully-scrolled end item is never dimmed.
            Deliberately NO scroll-snap: with ~44px cells the snap points are
            so dense that momentum scrolling ratchets, and the browser re-snaps
            AFTER the centering scrollTo, yanking the active tab off-center.
            overscroll-x-contain stops an end-of-rail swipe from turning into
            the browser's back-navigation gesture. */}
        <motion.nav
          ref={railRef}
          layoutScroll
          aria-label="Admin sections"
          data-lenis-prevent
          className={cn(
            'no-scrollbar relative flex h-full items-center gap-1 overflow-x-auto overscroll-x-contain px-3',
            '[mask-image:linear-gradient(to_right,transparent,black_1.25rem,black_calc(100%-1.25rem),transparent)]',
          )}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const active = isAdminRouteActive(item.href, pathname);
            const n = item.badge ? (counts?.[item.badge] ?? 0) : 0;
            const accessibleName =
              n > 0 ? `${item.label} — ${n} new` : item.label;

            return (
              // `layout` on every cell: activating a tab mounts its label and
              // reflows the neighbors — this puts that reflow on the same
              // curve as the pill's glide instead of snapping around it.
              <motion.div
                key={item.href}
                layout
                transition={transition}
                data-rail-cell
                className="shrink-0"
              >
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  aria-label={accessibleName}
                  className={cn(
                    // h-11 min-w-11 = the 44px tap floor for icon-only tabs.
                    'relative flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-medium',
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
                  <span className="relative z-10 flex items-center gap-2">
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
                    {active && (
                      <span className="whitespace-nowrap">{item.label}</span>
                    )}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </motion.nav>
      </div>

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
