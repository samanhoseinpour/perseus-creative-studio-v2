import {
  LuPlus,
  LuPencil,
  LuTrash2,
  LuArrowRightLeft,
  LuKeyRound,
  LuLogIn,
  LuSend,
  LuDownload,
  LuEye,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';

import { glassChip, glassRowHover } from '@/components/Admin/Glass';
import { formatDate, formatDateTime } from '@/components/Admin/inbox/format';
import { ACTIVITY_ACTION_LABELS } from '@/lib/activityFilters';
import { vancouverDayKey } from '@/lib/taskFilters';
import type { ActivityRow } from '@/db/activityQueries';
import { cn } from '@/lib/utils';

/**
 * The feed. A day-grouped timeline rather than a table: an audit log is read
 * by scanning down for "when did this change?", and a rail with dated
 * checkpoints answers that faster than a grid of equal-weight cells. The rail
 * also gives the destructive verbs somewhere to be visually louder than the
 * routine ones without colouring whole rows.
 *
 * Entirely server-rendered — no 'use client' anywhere in this screen.
 */

const ACTION_ICON: Record<string, IconType> = {
  create: LuPlus,
  update: LuPencil,
  delete: LuTrash2,
  status: LuArrowRightLeft,
  grant: LuKeyRound,
  auth: LuLogIn,
  send: LuSend,
  export: LuDownload,
  access: LuEye,
};

/**
 * Node tint by consequence, not by category. Only the verbs that remove
 * something, change who can do what, or move data out of the app get colour;
 * routine edits stay neutral so the loud ones actually read as loud. A log
 * where everything is highlighted highlights nothing.
 */
const ACTION_TONE: Record<string, string> = {
  delete: 'bg-red-500/12 text-red-600 ring-red-500/25 dark:text-red-400',
  grant: 'bg-amber-500/12 text-amber-700 ring-amber-500/25 dark:text-amber-400',
  export: 'bg-amber-500/12 text-amber-700 ring-amber-500/25 dark:text-amber-400',
  access: 'bg-amber-500/12 text-amber-700 ring-amber-500/25 dark:text-amber-400',
  send: 'bg-sky-500/12 text-sky-700 ring-sky-500/25 dark:text-sky-400',
};

/**
 * Times are pinned to Vancouver, like every other date surface in the admin.
 * Left unpinned they render in the RUNTIME's zone, which on Vercel is UTC —
 * so a 5pm Vancouver action displayed as next-day 00:xx and split across two
 * day headings.
 */
const TIME = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Vancouver',
});

/** "Today" / "Yesterday" / "Jul 8, 2026" — computed on the server and passed
 *  down as a string, the formatRelative rule (no client Date math, no
 *  hydration drift between a UTC render and the viewer's timezone).
 *
 *  Bucketed on the VANCOUVER calendar day via the shared vancouverDayKey, the
 *  same helper the task windows and the weekly digest use — a second notion
 *  of "today" on one dashboard is how two screens end up disagreeing. */
function dayLabel(dayKey: string, todayKey: string, d: Date): string {
  if (dayKey === todayKey) return 'Today';
  // String compare is exact on YYYY-MM-DD and needs no date arithmetic:
  // yesterday is simply the previous key we can derive from today.
  const [y, m, day] = todayKey.split('-').map(Number);
  const prev = new Date(Date.UTC(y, m - 1, day - 1));
  const yesterdayKey = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}-${String(prev.getUTCDate()).padStart(2, '0')}`;
  if (dayKey === yesterdayKey) return 'Yesterday';
  return formatDate(d);
}

/** Group consecutive rows by Vancouver calendar day. The query already
 *  returns them newest-first, so one pass is enough — no sort, no
 *  map-of-arrays. */
function groupByDay(rows: ActivityRow[], now: Date) {
  const todayKey = vancouverDayKey(now);
  const groups: { label: string; rows: ActivityRow[] }[] = [];
  for (const row of rows) {
    const label = dayLabel(vancouverDayKey(row.createdAt), todayKey, row.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(row);
    else groups.push({ label, rows: [row] });
  }
  return groups;
}

function Diff({ row }: { row: ActivityRow }) {
  const changes = row.payload?.changes;
  const meta = row.payload?.meta;
  const hasChanges = changes && Object.keys(changes).length > 0;
  const hasMeta = meta && Object.keys(meta).length > 0;
  if (!hasChanges && !hasMeta) return null;

  return (
    <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem] text-muted-foreground">
      {hasChanges &&
        // Object.entries, not a trusted key order: Postgres jsonb stores a
        // NORMALIZED object and does not preserve insertion order, so nothing
        // here may assume the shape came back the way it went in.
        Object.entries(changes).map(([field, change]) => (
          <div key={field} className="flex items-baseline gap-1">
            <dt className="font-medium text-foreground/70">{field}</dt>
            <dd className="flex items-baseline gap-1">
              {change.from !== undefined && change.from !== null && (
                <>
                  <span className="line-through opacity-60">
                    {String(change.from) || '—'}
                  </span>
                  <span aria-hidden="true">→</span>
                </>
              )}
              <span>{String(change.to) || '—'}</span>
            </dd>
          </div>
        ))}
      {hasMeta &&
        Object.entries(meta).map(([key, value]) => (
          <div key={key} className="flex items-baseline gap-1">
            <dt className="font-medium text-foreground/70">{key}</dt>
            <dd>{String(value)}</dd>
          </div>
        ))}
    </dl>
  );
}

export default function ActivityFeed({ rows }: { rows: ActivityRow[] }) {
  const now = new Date();
  const groups = groupByDay(rows, now);

  return (
    <div>
      {groups.map((group) => (
        <section key={group.label}>
          <h2 className="sticky top-0 z-10 border-b border-white/40 bg-white/60 px-4 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
            {group.label}
          </h2>

          <ol>
            {group.rows.map((row) => {
              const Icon = ACTION_ICON[row.action] ?? LuPencil;
              return (
                <li
                  key={row.id}
                  className={cn(
                    'flex gap-3 px-4 py-3 sm:gap-4',
                    glassRowHover,
                  )}
                >
                  {/* The rail: a tinted node with a hairline running through
                      it, so the column reads as one continuous thread rather
                      than a stack of separate icons. */}
                  <div className="relative flex w-7 shrink-0 justify-center">
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-foreground/10"
                    />
                    <span
                      className={cn(
                        'relative mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full ring-1',
                        ACTION_TONE[row.action] ?? glassChip,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="sr-only">
                        {ACTIVITY_ACTION_LABELS[
                          row.action as keyof typeof ACTIVITY_ACTION_LABELS
                        ] ?? row.action}
                      </span>
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{row.actorName}</span>{' '}
                      <span className="text-muted-foreground">
                        {row.summary}
                      </span>
                    </p>
                    <Diff row={row} />
                  </div>

                  <div className="shrink-0 text-right">
                    <time
                      dateTime={row.createdAt.toISOString()}
                      title={formatDateTime(row.createdAt)}
                      className="block font-mono text-[0.7rem] tabular-nums text-muted-foreground"
                    >
                      {TIME.format(row.createdAt)}
                    </time>
                    <span className="mt-0.5 block text-[0.6rem] uppercase tracking-wider text-muted-foreground/70">
                      {row.area}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
