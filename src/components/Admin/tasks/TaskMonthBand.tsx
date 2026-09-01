import Link from 'next/link';

import MonthSwitcher from '@/components/Admin/MonthSwitcher';
import { adminLink } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';

/**
 * Which month this board is about — its own full-width row at the top of the
 * panel, above the tabs, on every tab and on the digest.
 *
 * It replaced a MonthSwitcher that sat in the page header and appeared only on
 * the shipped tabs, wired to the general date facet (`?drange=YYYY-MM`) — the
 * very param the Filters date menu writes. That made the month behave like one
 * more filter: present on three tabs of eight, duplicating a control already
 * inside the Filters menu, and competing with Export CSV for attention. A
 * scope is not a filter, so it gets a row of its own and says so.
 *
 * The readout on the right is the whole month in scope, not the active tab —
 * the tab has its own badge, and a second number meaning the same thing beside
 * it would just read as a disagreement.
 *
 * Server component: MonthSwitcher is the only client leaf here, and it takes
 * finished href STRINGS (never a builder function — that is a hard Next.js
 * error across the boundary, and it took the Done tab down once).
 */
export default function TaskMonthBand({
  basePath,
  switcher,
  total,
  scoped,
  past,
  currentHref,
  currentLabel,
}: {
  basePath: string;
  /** Everything MonthSwitcher needs, composed server-side by monthSwitcherFor.
   *  The three this band decides for itself are excluded, so a caller cannot
   *  quietly point the switcher somewhere else or hang its menu off the wrong
   *  edge. */
  switcher: Omit<
    React.ComponentProps<typeof MonthSwitcher>,
    'basePath' | 'allowAll' | 'align'
  >;
  /** Tasks in scope across every status — the month's own size. */
  total: number;
  /** False at "All time", where the count is the whole log rather than a month. */
  scoped: boolean;
  /** A month the reader has already left: a closed record of what shipped. */
  past: boolean;
  currentHref: string;
  currentLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-white/40 px-3 py-2.5 sm:px-4 dark:border-white/10">
      <MonthSwitcher {...switcher} basePath={basePath} allowAll align="start" />
      <p className="text-xs text-muted-foreground">
        <span className="tabular-nums">{total}</span>
        {total === 1 ? ' task' : ' tasks'}
        {scoped ? ' this month' : ' in the log'}
        {/* Said out loud, because a past month has no working tabs and the
            reason is not on screen anywhere else: unfinished work is always
            "now", so it is on the current month's board by definition. */}
        {past && (
          <>
            {'. Open work is on '}
            <Link href={currentHref} className={cn('font-medium', adminLink)}>
              {currentLabel}
            </Link>
            {'.'}
          </>
        )}
      </p>
    </div>
  );
}
