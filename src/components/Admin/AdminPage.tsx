import Link from 'next/link';

import { CURRENT_VERSION } from '@/lib/releaseFields';
import { cn } from '@/lib/utils';

/**
 * The one width/padding wrapper for every protected admin page. Replaces the
 * per-page `mx-auto w-full max-w-* px-5 py-8 sm:px-8 lg:py-12` divs so page
 * gutters and measures can't drift. Server-safe on purpose (no 'use client',
 * like Glass.tsx) — pages, server components, and the loading skeletons all
 * render it; rest props pass through so the skeletons can carry their
 * role/aria-* attributes.
 *
 * THREE tokens, because the pages behind them are three different shapes and
 * one cap can't serve all of them:
 *
 *  - `narrow` — forms, detail views, the payslip. Line length is the
 *    constraint; extra width would only stretch the measure.
 *  - `wide` — lists, dashboards, card grids. Grows one step on very large
 *    displays, but stays bounded: the single-column list surfaces (users,
 *    logs, tickets, the two inboxes, projects, the payroll roster) get WORSE
 *    when stretched, because each row's right-hand meta drifts away from the
 *    content it belongs to.
 *  - `table` — pages whose main content is a horizontally scrolling <table>
 *    (tasks' eleven columns, the payroll month, the report's delivered work,
 *    feedback). Here width buys visible columns instead of whitespace, so it
 *    keeps climbing on the biggest screens.
 *
 * Literal class strings only — Tailwind's scanner can't see computed names.
 * The rail costs 256px expanded (68px collapsed) and the gutters 64px, so a
 * cap only begins to bind at roughly `cap + 320`: the 2xl and min-[1900px]
 * rungs are deliberately inert on a 1440-wide laptop.
 */
const WIDTHS = {
  narrow: 'max-w-4xl',
  wide: 'max-w-[1400px] 2xl:max-w-[1600px]',
  table: 'max-w-[1400px] 2xl:max-w-[1760px] min-[1900px]:max-w-[2100px]',
} as const;

export default function AdminPage({
  width = 'wide',
  className,
  children,
  ...rest
}: {
  width?: keyof typeof WIDTHS;
} & React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        // pb-28 (not py-8) below lg: clears the fixed mobile bottom bar
        // (56px bar + up-to-34px safe area + breathing room); lg:py-12 restores
        // desktop. print:pb-8 is load-bearing — print media evaluates at PAPER
        // width (A4 ≈ 794px < lg), so without it the payslip, which prints
        // through this wrapper, would carry 112px of phantom bottom padding.
        'mx-auto w-full px-5 pt-8 pb-28 sm:px-8 lg:py-12 print:pb-8',
        WIDTHS[width],
        className,
      )}
      {...rest}
    >
      {children}
      <AdminVersion />
    </div>
  );
}

/**
 * The build stamp, bottom of every protected page.
 *
 * It lives HERE rather than in the protected layout because the layout cannot
 * know a page's width token — `AdminPage` picks one of three literal caps, so a
 * line rendered a level up would float detached from the content column on a
 * `narrow` page, and as a sibling of <main> inside `div.lg:flex` it would
 * become a third flex column beside the rail. Being inside also means the
 * skeletons (whose Shell wraps AdminPage) render it too, so there is no shift
 * on swap.
 *
 * CURRENT_VERSION comes from the client-safe LEAF, never from
 * src/lib/adminReleases.ts. AdminSkeletons.tsx imports AdminPage and its header
 * contract forbids `server-only` modules and the registries anywhere in that
 * import graph — reaching for the registry here would break it transitively.
 *
 * `print:hidden` is load-bearing, not defensive: the payslip prints through
 * this wrapper (that is why `print:pb-8` above exists), so without it a version
 * string lands on a printed payslip. /admin/login uses AdminAuthShell and the
 * public /share/reports/[token] page uses neither, so the stamp is only ever
 * seen by someone signed in.
 */
function AdminVersion() {
  return (
    <div className="mt-10 border-t border-foreground/10 pt-4 text-right lg:mt-14 print:hidden">
      <Link
        href="/admin/profile#whats-new"
        className="text-xs text-muted-foreground underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-200 hover:text-foreground hover:decoration-current"
      >
        Perseus Dashboard <span className="tabular-nums">{CURRENT_VERSION}</span>
      </Link>
    </div>
  );
}
