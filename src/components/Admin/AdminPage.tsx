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
    </div>
  );
}
