import Link from 'next/link';
import { LuArrowRight, LuCrown } from 'react-icons/lu';

import AdminAvatar from '@/components/Admin/AdminAvatar';
import {
  GlassPanel,
  GlassRim,
  glassCard,
  glassChip,
  glassHover,
  glassRowHover,
  adminLink,
} from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import type {
  CategoryChampion,
  ChampionCard,
  IdleMember,
  LeaderRow,
  PastChampion,
} from './leaderboardData';

/**
 * The leaderboard's presentational sections, shared by /admin/leaderboard and
 * the dashboard strip. Server components throughout (the only interactive
 * piece on the page is the existing MonthSwitcher), and every number arrives
 * pre-formatted from leaderboardData — no date or duration math here.
 *
 * Material is the admin's one glass system (Glass.tsx tokens, the MemberBars
 * bar grammar: plain divs, `role="img"` with the numbers also present as
 * visible text). The single addition is a warm gold accent, reserved for the
 * champion and for rank 1 — nothing else in the admin uses it, so it reads as
 * "won" rather than as decoration.
 */

const GOLD_TEXT = 'text-amber-600 dark:text-amber-400';

const chipBase =
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-medium whitespace-nowrap';

const goldChip =
  'bg-amber-400/15 text-amber-700 ring-1 ring-amber-500/25 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/25';

/** Section shell matching the report dashboards' glass tone. */
function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <GlassPanel>{children}</GlassPanel>
    </section>
  );
}

/**
 * The reigning champion — last month's winner, carried through the whole of
 * the current month. Links to the month they won so the claim is checkable.
 */
export function ChampionRibbon({ champion }: { champion: ChampionCard }) {
  const line = [champion.tasksLabel, champion.hoursLabel, champion.onTimeLabel]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      href={`/admin/leaderboard?month=${champion.month}`}
      className={cn(
        glassCard,
        glassHover,
        'group flex items-center gap-4 p-4 sm:p-5',
      )}
    >
      <GlassRim />
      {/* The gold wash sits under the content and is clipped by glassCard's
          own overflow-hidden — a tint, not a border, so the ribbon still reads
          as the same glass as everything around it. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-linear-to-r from-amber-400/15 via-amber-300/5 to-transparent"
      />
      <span className="relative shrink-0">
        <AdminAvatar
          name={champion.name}
          size={48}
          {...(champion.avatar ?? {})}
        />
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-amber-400 text-neutral-900 ring-2 ring-white/80 dark:ring-white/20"
        >
          <LuCrown className="size-3" />
        </span>
      </span>
      <span className="relative min-w-0 flex-1">
        <span
          className={cn(
            'block text-[0.6rem] font-medium uppercase tracking-[0.2em]',
            GOLD_TEXT,
          )}
        >
          Champion of {champion.monthName}
        </span>
        <span className="mt-0.5 block truncate text-base font-semibold text-foreground">
          {champion.name}
        </span>
        <span className="mt-0.5 block truncate text-xs tabular-nums text-muted-foreground">
          {line}
        </span>
      </span>
      <LuArrowRight
        aria-hidden="true"
        className="relative size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
      />
    </Link>
  );
}

/** One ranked member. The bar is redundant decoration — every number in it is
 *  also visible text beside it. */
function LeaderRowItem({
  row,
  showBadges = true,
}: {
  row: LeaderRow;
  showBadges?: boolean;
}) {
  const leader = row.rank === 1;
  const meta = [row.hoursLabel, row.onTimeLabel].filter(Boolean).join(' · ');

  return (
    <li
      className={cn(
        'px-4 py-3.5 sm:px-5',
        row.isViewer && 'bg-foreground/[0.04]',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'w-5 shrink-0 text-right text-base font-semibold tabular-nums',
            leader ? GOLD_TEXT : 'text-foreground/30',
          )}
        >
          {row.rank}
        </span>
        <AdminAvatar name={row.name} size={30} {...(row.avatar ?? {})} />

        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">
              {row.name}
            </span>
            {leader && (
              <LuCrown
                aria-hidden="true"
                className={cn('size-3.5 shrink-0', GOLD_TEXT)}
              />
            )}
            {row.isViewer && (
              <span className={cn(chipBase, glassChip)}>You</span>
            )}
          </span>

          {showBadges && (row.badges.length > 0 || row.awaitingLabel) && (
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {row.badges.map((badge) => (
                <span
                  key={badge.id}
                  title={badge.hint}
                  className={cn(
                    chipBase,
                    badge.id === 'active' ? goldChip : glassChip,
                  )}
                >
                  {badge.label}
                </span>
              ))}
              {row.awaitingLabel && (
                <span className="text-[0.65rem] tabular-nums text-muted-foreground">
                  {row.awaitingLabel}
                </span>
              )}
            </span>
          )}
        </span>

        <span className="shrink-0 text-right">
          <span className="block text-sm font-semibold tabular-nums text-foreground">
            {row.tasksLabel}
          </span>
          {meta && (
            <span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">
              {meta}
            </span>
          )}
        </span>
      </div>

      <div
        role="img"
        aria-label={`${row.name}: ${row.tasksLabel}`}
        className="mt-2.5 h-2 overflow-hidden rounded-full bg-foreground/[0.08]"
      >
        <div
          className={cn(
            'h-full rounded-full',
            leader ? 'bg-amber-400 dark:bg-amber-400/90' : 'bg-foreground/70',
          )}
          style={{ width: `${row.pct}%` }}
        />
      </div>
    </li>
  );
}

/** A member on the task team with nothing completed in the month — present,
 *  unranked. No rank numeral and no bar: this is a nudge, not a last place. */
function IdleRowItem({ member }: { member: IdleMember }) {
  return (
    <li
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 sm:px-5',
        member.isViewer && 'bg-foreground/[0.04]',
      )}
    >
      <span aria-hidden="true" className="w-5 shrink-0" />
      <AdminAvatar name={member.name} size={24} {...(member.avatar ?? {})} />
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        {member.name}
        {member.isViewer && (
          <span className={cn(chipBase, glassChip, 'ml-1.5')}>You</span>
        )}
      </span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {member.awaitingLabel || 'No completed tasks yet'}
      </span>
    </li>
  );
}

/** The month's board: ranked members, then the rest of the team. */
export function LeaderList({
  rows,
  idle,
}: {
  rows: LeaderRow[];
  idle: IdleMember[];
}) {
  return (
    <ul className="divide-y divide-white/40 dark:divide-white/10">
      {rows.map((row) => (
        <LeaderRowItem key={row.key} row={row} />
      ))}
      {idle.map((member) => (
        <IdleRowItem key={member.key} member={member} />
      ))}
    </ul>
  );
}

/**
 * Who leads each discipline. Deliberately NOT gold: the amber is the overall
 * champion's, and spending it here would make four more "winners" that dilute
 * the one at the top. These read as craft standings, which is the point — a
 * photo editor who will never out-count the video desk still has a board to
 * lead.
 */
export function CategoryChampions({ items }: { items: CategoryChampion[] }) {
  return (
    <Panel title="Leading by category">
      <ul className="grid gap-px bg-white/40 sm:grid-cols-2 dark:bg-white/10">
        {items.map((item) => (
          <li
            key={item.categoryId}
            className="flex items-center gap-3 bg-white/60 p-4 sm:p-5 dark:bg-white/5"
          >
            <AdminAvatar name={item.name} size={32} {...(item.avatar ?? {})} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[0.6rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {item.categoryName}
              </span>
              <span className="truncate text-sm font-medium text-foreground">
                {item.name}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {item.tasksLabel} {item.shareLabel} · {item.hoursLabel}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function PastChampions({ items }: { items: PastChampion[] }) {
  return (
    <Panel title="Past champions">
      <ul className="flex flex-wrap gap-x-6 gap-y-3 p-5 sm:p-6">
        {items.map((item) => (
          <li key={item.month} className="flex items-center gap-2">
            <AdminAvatar name={item.name} size={22} {...(item.avatar ?? {})} />
            <span className="text-sm font-medium text-foreground">
              {item.name}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {item.monthLabelText} · {item.tasksLabel}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/**
 * The dashboard's rail podium — the surface that makes the board part of the
 * day, compressed to the overview bento's side column: the reigning champion,
 * this month's top three, and where the viewer stands. It replaced the old
 * full-width LeaderboardStrip when the overview became a bento (2026-08-21);
 * gold stays the one "won" accent, so the rail carries the page's only amber.
 */
export function LeaderboardPodium({
  champion,
  rows,
  monthLabelText,
  viewerStanding,
}: {
  champion: ChampionCard | null;
  rows: LeaderRow[];
  monthLabelText: string;
  viewerStanding: { rank: number; total: number; tasksLabel: string } | null;
}) {
  if (!champion && rows.length === 0) return null;

  return (
    <div className={cn(glassCard, 'flex h-full flex-col')}>
      <GlassRim />
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <h2 className="min-w-0 truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Leaderboard · {monthLabelText}
        </h2>
        <LuCrown aria-hidden="true" className={cn('size-3.5 shrink-0', GOLD_TEXT)} />
      </div>

      {champion && (
        <Link
          href={`/admin/leaderboard?month=${champion.month}`}
          className={cn(
            'relative mx-2 mt-3 flex items-center gap-3 overflow-hidden rounded-xl p-2.5',
            glassRowHover,
          )}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-linear-to-r from-amber-400/15 via-amber-300/5 to-transparent"
          />
          <span className="relative shrink-0">
            <AdminAvatar
              name={champion.name}
              size={30}
              {...(champion.avatar ?? {})}
            />
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-amber-400 text-neutral-900 ring-2 ring-white/80 dark:ring-white/20"
            >
              <LuCrown className="size-2.5" />
            </span>
          </span>
          <span className="relative min-w-0 flex-1">
            <span
              className={cn(
                'block text-[0.6rem] font-medium uppercase tracking-[0.16em]',
                GOLD_TEXT,
              )}
            >
              Champion of {champion.monthName}
            </span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-foreground">
              {champion.name}
            </span>
          </span>
        </Link>
      )}

      {rows.length > 0 && (
        <ul className="mt-1 divide-y divide-white/40 px-4 dark:divide-white/10">
          {rows.map((row) => {
            const leader = row.rank === 1;
            return (
              <li key={row.key} className="py-2.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'w-4 shrink-0 text-right text-sm font-semibold tabular-nums',
                      leader ? GOLD_TEXT : 'text-foreground/30',
                    )}
                  >
                    {row.rank}
                  </span>
                  <AdminAvatar name={row.name} size={24} {...(row.avatar ?? {})} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {row.name}
                    {row.isViewer && (
                      <span className={cn(chipBase, glassChip, 'ml-1.5')}>
                        You
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                    {row.tasksLabel}
                  </span>
                </div>
                <div
                  role="img"
                  aria-label={`${row.name}: ${row.tasksLabel}`}
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/[0.08]"
                >
                  <div
                    className={cn(
                      'h-full rounded-full',
                      leader
                        ? 'bg-amber-400 dark:bg-amber-400/90'
                        : 'bg-foreground/70',
                    )}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/40 px-4 py-3 dark:border-white/10">
        <span className="min-w-0 truncate text-xs tabular-nums text-muted-foreground">
          {viewerStanding
            ? `You're #${viewerStanding.rank} of ${viewerStanding.total} · ${viewerStanding.tasksLabel}`
            : 'Mark a task done to get on the board.'}
        </span>
        <Link
          href="/admin/leaderboard"
          className={cn(
            'inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground',
            adminLink,
          )}
        >
          Full board
          <LuArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
