import Link from 'next/link';

import type { TicketStatusCounts } from '@/db/ticketQueries';
import {
  TICKET_STATUS_LABELS,
  TICKET_STATUS_SLUGS,
  type TicketStatusSlug,
} from '@/lib/ticketFields';
import { cn } from '@/lib/utils';

function href(basePath: string, view: TicketStatusSlug): string {
  return view === 'open' ? basePath : `${basePath}?status=${view}`;
}

/**
 * Status tabs for the triager ticket list — `?status=` URL state, cloned from
 * the inbox's InboxTabs so the two list surfaces read identically.
 */
export default function TicketTabs({
  basePath,
  active,
  counts,
}: {
  basePath: string;
  active: TicketStatusSlug;
  counts: TicketStatusCounts;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-white/40 px-2 sm:px-3 dark:border-white/10">
      {TICKET_STATUS_SLUGS.map((view) => {
        const isActive = view === active;
        const n = counts[view];
        return (
          <Link
            key={view}
            href={href(basePath, view)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              '-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {TICKET_STATUS_LABELS[view]}
            {n > 0 && (
              <span
                className={cn(
                  'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem] font-semibold tabular-nums',
                  isActive
                    ? 'bg-foreground text-background'
                    : 'bg-foreground/[0.08] text-muted-foreground',
                )}
              >
                {n}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
