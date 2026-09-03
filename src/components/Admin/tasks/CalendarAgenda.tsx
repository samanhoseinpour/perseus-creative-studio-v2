import Link from 'next/link';

import CalendarChip, { type CalendarCell } from './CalendarChip';
import { digestDayLabel } from './format';
import { agendaDay } from './menu';

/**
 * The phone rendering of the calendar: one section per day that holds
 * anything, tasks listed under it.
 *
 * A seven-column month grid is unreadable below 768px, and the board already
 * answered this question once by giving the table a card list rather than a
 * sideways scroll. Same answer, same mechanism: both trees are server-rendered
 * and the switch is CSS alone.
 *
 * It shows the SAME sample and the same "+N more" line the grid does, rather
 * than every task. Vertical space is free here, but showing everything would
 * put 688 rows in the document on the busiest month, and a phone and a desktop
 * disagreeing about which five tasks a day holds is worse than either.
 *
 * Empty days are skipped entirely. A grid draws them because a week has to
 * keep its shape; a list has no such obligation, and thirty headings with
 * nothing under them is not an agenda.
 */
export default function CalendarAgenda({
  cells,
  todayKey,
  yesterdayKey,
}: {
  cells: CalendarCell[];
  todayKey: string;
  yesterdayKey: string;
}) {
  const days = cells.filter((cell) => cell.inMonth && cell.count > 0);
  return (
    <div className="flex flex-col md:hidden">
      {days.map((cell) => (
        <section
          key={cell.dayKey}
          className={agendaDay}
        >
          <h3 className="flex items-baseline justify-between gap-2 pb-1">
            <span className="text-xs font-medium text-foreground">
              {digestDayLabel(cell.dayKey, todayKey, yesterdayKey)}
            </span>
            <span className="text-[0.65rem] tabular-nums text-muted-foreground">
              {cell.count} · {cell.hours}
            </span>
          </h3>
          <div className="flex flex-col">
            {cell.chips.map((chip) => (
              <CalendarChip key={chip.id} chip={chip} variant="full" />
            ))}
            {cell.hidden > 0 && (
              <Link
                href={cell.moreHref}
                prefetch={false}
                className="mt-0.5 px-2 py-1 text-left text-[0.7rem] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                {`+${cell.hidden} more`}
              </Link>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
