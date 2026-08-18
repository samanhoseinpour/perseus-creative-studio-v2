import Link from 'next/link';
import { LuCalendar, LuClock, LuInfinity } from 'react-icons/lu';

import type { LeaderboardRange } from './leaderboardData';
import { cn } from '@/lib/utils';

const pill = (active: boolean) =>
  cn(
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
    active
      ? 'bg-foreground text-background'
      : 'text-muted-foreground hover:text-foreground',
  );

const OPTIONS = [
  { value: 'month', label: 'Month', icon: LuCalendar },
  { value: 'd30', label: '30 days', icon: LuClock },
  { value: 'all', label: 'All time', icon: LuInfinity },
] as const satisfies readonly {
  value: LeaderboardRange;
  label: string;
  icon: typeof LuCalendar;
}[];

/**
 * How far back the board looks — TasksViewToggle's segmented control, server
 * component, pure `?range=` URL state.
 *
 * `month` carries the browsed month across, so switching to a rolling window
 * and back returns you to where you were rather than to today. The rolling
 * links deliberately DROP the month: it means nothing there, and leaving it in
 * the URL would suggest the window respects it.
 */
export default function LeaderboardRangeToggle({
  basePath,
  range,
  month,
  currentMonth,
}: {
  basePath: string;
  range: LeaderboardRange;
  month: string;
  currentMonth: string;
}) {
  const monthQs = month && month !== currentMonth ? `?month=${month}` : '';
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-white/50 bg-white/40 p-0.5 backdrop-blur-sm dark:border-white/12 dark:bg-white/10">
      {OPTIONS.map((option) => {
        const active = option.value === range;
        return (
          <Link
            key={option.value}
            href={
              option.value === 'month'
                ? `${basePath}${monthQs}`
                : `${basePath}?range=${option.value}`
            }
            aria-current={active ? 'page' : undefined}
            className={pill(active)}
          >
            <option.icon aria-hidden="true" className="size-3.5" />
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
