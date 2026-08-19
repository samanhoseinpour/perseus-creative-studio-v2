import Link from 'next/link';

import { glassField, glassRowHover } from '@/components/Admin/Glass';
import {
  ACTIVITY_ACTIONS,
  ACTIVITY_ACTION_LABELS,
  hasActiveActivityFilters,
  type ActivityListParams,
} from '@/lib/activityFilters';
import { INBOX_RANGE_PRESETS } from '@/lib/inboxFilters';
import { cn } from '@/lib/utils';

/**
 * Filters for /admin/logs — a plain GET <form>, so the whole screen ships
 * ZERO client JavaScript.
 *
 * The inbox filter bar is a client component because it debounces search
 * across a list people work in all day. An audit log is opened to answer one
 * question and then closed; a submit button is the honest interaction, and it
 * keeps every filter combination a real, bookmarkable URL with no hydration
 * cost on a page that is already superadmin-only and noindex.
 */
export default function ActivityFilterBar({
  params,
  areas,
  actors,
  basePath,
}: {
  params: ActivityListParams;
  areas: string[];
  actors: { id: string | null; name: string }[];
  basePath: string;
}) {
  const selectClass = cn(glassField, 'h-8 px-2 text-xs');

  return (
    <div className="border-b border-white/40 dark:border-white/10">
      <form
        method="GET"
        action={basePath}
        className="flex flex-wrap items-center gap-2 p-3"
      >
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="Search the log…"
          aria-label="Search activity"
          className={cn(glassField, 'h-8 min-w-48 flex-1 px-2.5 text-xs')}
        />

        <select
          name="actor"
          defaultValue={params.actor}
          aria-label="Filter by person"
          className={selectClass}
        >
          <option value="">Anyone</option>
          {actors.map((a) => (
            // A null actorId is a system/cron row — it has no id to filter by,
            // so it is listed for context but not selectable.
            <option key={a.id ?? a.name} value={a.id ?? ''} disabled={!a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <select
          name="area"
          defaultValue={params.area}
          aria-label="Filter by area"
          className={selectClass}
        >
          <option value="">All areas</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <select
          name="action"
          defaultValue={params.action}
          aria-label="Filter by action"
          className={selectClass}
        >
          <option value="">All actions</option>
          {ACTIVITY_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {ACTIVITY_ACTION_LABELS[a]}
            </option>
          ))}
        </select>

        <select
          name="range"
          defaultValue={params.range}
          aria-label="Filter by date"
          className={selectClass}
        >
          <option value="">Any time</option>
          {INBOX_RANGE_PRESETS.map((p) => (
            <option key={p.token} value={p.token}>
              {p.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className={cn(
            'inline-flex h-8 items-center rounded-lg bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90',
          )}
        >
          Filter
        </button>

        {hasActiveActivityFilters(params) && (
          <Link
            href={basePath}
            className={cn(
              'inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium text-muted-foreground hover:text-foreground',
              glassRowHover,
            )}
          >
            Clear
          </Link>
        )}
      </form>
    </div>
  );
}
