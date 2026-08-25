'use client';

import { LuChevronRight } from 'react-icons/lu';

import { RELEASE_KIND_TONES, openReleaseHistory } from '@/lib/releaseFields';
import { cn } from '@/lib/utils';

/**
 * The last few releases as rows you can open — the profile card's list.
 *
 * A CLIENT leaf under a server card, holding nothing but the click. Its props
 * are already-rendered strings: `day` is formatted server-side pinned to 'UTC',
 * because a release date is a calendar KEY with no instant behind it and
 * formatting it in the browser is the classic off-by-one (2026-08-26 read in
 * Vancouver is the 25th).
 *
 * Each row opens the ONE release it names rather than the whole history. That
 * is the point of the list: the history only grows, so "read what changed in
 * 2026.8.4" should not mean scrolling past everything newer to find it. "Read
 * all updates" beside it is still the way to the unfiltered list.
 *
 * The row is a BUTTON, not a link. There is no /admin/whats-new route, by
 * decision, so there is nothing to navigate to — it dispatches the same window
 * event the footer stamp uses.
 */
export default function RecentReleaseRows({
  rows,
}: {
  rows: { version: string; day: string; title: string; unread: boolean }[];
}) {
  return (
    // -mx-2 so the hover ground bleeds a little past the text and the rows read
    // as one list, without the panel's own padding moving.
    <ul className="-mx-2 flex flex-col">
      {rows.map((row) => (
        <li key={row.version}>
          <button
            type="button"
            onClick={() => openReleaseHistory(row.version)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left',
              'transition-colors hover:bg-foreground/[0.04]',
              'focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none',
            )}
          >
            <span className="w-[4.25rem] shrink-0 text-xs font-medium tabular-nums text-foreground">
              {row.version}
            </span>

            <span className="min-w-0 flex-1 truncate text-sm text-foreground/85">
              {row.title}
            </span>

            {row.unread ? (
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium',
                  RELEASE_KIND_TONES.added,
                )}
              >
                Unread
              </span>
            ) : null}

            {/* The day is the first thing to give way — it is context, while the
                title is the content and the marker is the state. */}
            <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
              {row.day}
            </span>

            <LuChevronRight
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
