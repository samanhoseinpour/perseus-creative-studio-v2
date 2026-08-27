import Link from 'next/link';

import {
  MONITORING_RANGES,
  RANGE_SPECS,
  type MonitoringRange,
} from '@/lib/monitoringFields';
import { cn } from '@/lib/utils';

const pill = (active: boolean) =>
  cn(
    'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
    active
      ? 'bg-foreground text-background'
      : 'text-muted-foreground hover:text-foreground',
  );

/**
 * How far back the error trend looks — the LeaderboardRangeToggle recipe: a
 * server component of plain links, pure `?range=` URL state, so a filtered
 * view is a URL you can share and the page stays server-rendered.
 */
export default function RangeToggle({
  basePath,
  range,
}: {
  basePath: string;
  range: MonitoringRange;
}) {
  return (
    <div
      role="group"
      aria-label="Time range"
      className="flex items-center gap-0.5 rounded-full border border-white/50 bg-white/40 p-0.5 backdrop-blur-sm dark:border-white/12 dark:bg-white/10"
    >
      {MONITORING_RANGES.map((option) => {
        const active = option === range;
        return (
          <Link
            key={option}
            href={option === '24h' ? basePath : `${basePath}?range=${option}`}
            aria-current={active ? 'page' : undefined}
            aria-label={RANGE_SPECS[option].label}
            className={pill(active)}
          >
            {RANGE_SPECS[option].short}
          </Link>
        );
      })}
    </div>
  );
}
