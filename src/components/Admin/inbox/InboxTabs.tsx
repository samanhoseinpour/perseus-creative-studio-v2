import Link from 'next/link';

import type { InboxView, StatusCounts } from '@/db/adminQueries';
import { inboxListQs, type InboxListParams } from '@/lib/inboxFilters';
import { cn } from '@/lib/utils';

const TABS: { view: InboxView; label: string }[] = [
  { view: 'inbox', label: 'Inbox' },
  { view: 'archived', label: 'Archived' },
  { view: 'spam', label: 'Spam' },
];

// Tab links swap the status but keep the active search/filters/sort — and drop
// `page`, since the other tab's filtered list has its own pagination.
function href(
  basePath: string,
  view: InboxView,
  params: Partial<InboxListParams>,
): string {
  const qs = inboxListQs(view, params);
  return qs ? `${basePath}?${qs}` : basePath;
}

// Inbox badge shows the unread (new) count — the number that actually needs
// attention — not the full inbox size.
function badgeCount(view: InboxView, counts: StatusCounts): number {
  if (view === 'inbox') return counts.new;
  if (view === 'archived') return counts.archived;
  return counts.spam;
}

export default function InboxTabs({
  basePath,
  active,
  counts,
  params,
}: {
  basePath: string;
  active: InboxView;
  counts: StatusCounts;
  /** Active filter state to carry across tabs. Badge counts stay unfiltered — they're mailbox totals, Gmail-style. */
  params?: Partial<InboxListParams>;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-white/40 px-2 sm:px-3 dark:border-white/10">
      {TABS.map(({ view, label }) => {
        const isActive = view === active;
        const n = badgeCount(view, counts);
        return (
          <Link
            key={view}
            href={href(basePath, view, params ?? {})}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              '-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
            {n > 0 && (
              <span
                className={cn(
                  'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem] font-semibold tabular-nums',
                  view === 'spam'
                    ? 'bg-destructive/15 text-destructive'
                    : isActive
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
