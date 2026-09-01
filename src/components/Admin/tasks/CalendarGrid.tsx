import Link from 'next/link';

import { cn } from '@/lib/utils';
import CalendarChip, { type CalendarCell } from './CalendarChip';

/** Monday-first, matching weekdayOfDayKey and the Mon–Sun week the weekly
 *  digest already covers. */
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * The month grid: whole Mon–Sun weeks, one column per weekday.
 *
 * Server component with no state of its own. The desktop half of a two-tree
 * split switched by CSS alone (`hidden md:block` here, `md:hidden` on the
 * agenda), never by useMediaQuery: that initialises false and flips in an
 * effect, which server-renders a seven-column grid onto a 360px phone and then
 * snaps. Both trees fold from the SAME cells, so they cannot disagree about
 * what a day holds.
 *
 * A cell states its day's true count and hours, then shows a ranked sample of
 * the tasks. That split is the whole design: several days on the real board
 * carry 30 to 49 tasks and a 300px cell fits about five chips, so a grid that
 * showed only chips would be quietly wrong about most of August. The header
 * never lies and the "+N more" line always adds back up to it.
 */
export default function CalendarGrid({
  cells,
  todayKey,
  busiest,
}: {
  cells: CalendarCell[];
  todayKey: string;
  /** The busiest day in the month, so the density bars share one scale. Zero
   *  when the month is empty, which draws no bars at all. */
  busiest: number;
}) {
  return (
    <div className="hidden md:block">
      <div className="grid grid-cols-7 border-b border-white/40 dark:border-white/10">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-1.5 text-[0.6rem] font-medium tracking-[0.2em] text-muted-foreground uppercase"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const today = cell.dayKey === todayKey;
          return (
            <div
              key={cell.dayKey}
              className={cn(
                'flex min-h-[7.5rem] flex-col gap-1 border-r border-b border-white/40 p-1.5 dark:border-white/10',
                '[&:nth-child(7n)]:border-r-0',
                // The padding days either side of the month. Dimmed rather
                // than blank so the week still reads as a week.
                !cell.inMonth && 'bg-foreground/[0.02]',
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={cn(
                    'inline-flex size-5 items-center justify-center rounded-full text-[0.7rem] tabular-nums',
                    today && 'bg-foreground font-medium text-background',
                    !today && cell.inMonth && 'text-foreground',
                    !today && !cell.inMonth && 'text-muted-foreground/50',
                  )}
                >
                  {Number(cell.dayKey.slice(8))}
                </span>
                {cell.count > 0 && (
                  <span className="text-[0.6rem] tabular-nums text-muted-foreground">
                    {cell.count} · {cell.hours}
                  </span>
                )}
              </div>

              {/* Ink, never a hue: the admin theme measures quantity with
                  opacity everywhere else (the Spend buckets, the report bars),
                  and rose and amber are spoken for by the chips below. */}
              {cell.count > 0 && busiest > 0 && (
                <span
                  aria-hidden="true"
                  className="block h-[3px] rounded-full bg-foreground/[0.08]"
                >
                  <span
                    className="block h-full rounded-full bg-foreground/35"
                    style={{
                      width: `${Math.max(6, Math.round((cell.count / busiest) * 100))}%`,
                    }}
                  />
                </span>
              )}

              <div className="flex min-w-0 flex-col">
                {cell.chips.map((chip) => (
                  <CalendarChip key={chip.id} chip={chip} />
                ))}
                {cell.hidden > 0 && (
                  <Link
                    href={cell.moreHref}
                    prefetch={false}
                    className="mt-0.5 px-1 text-left text-[0.65rem] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    {`+${cell.hidden} more`}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
