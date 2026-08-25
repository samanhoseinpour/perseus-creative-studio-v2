import type { Metadata } from 'next';
import { LuTrophy } from 'react-icons/lu';

import { requireArea, viewerZone } from '@/lib/adminAccess';
import { firstParam } from '@/utils/pagination';
import AdminPage from '@/components/Admin/AdminPage';
import HelpButton from '@/components/Admin/HelpButton';
import { ADMIN_HELP } from '@/lib/adminHelp';
import EmptyState from '@/components/Admin/EmptyState';
import { GlassPanel } from '@/components/Admin/Glass';
import MonthSwitcher from '@/components/Admin/MonthSwitcher';
import { ReportTile } from '@/components/Admin/reports/ReportSections';
import {
  CategoryChampions,
  ChampionRibbon,
  LeaderList,
  PastChampions,
} from '@/components/Admin/leaderboard/LeaderboardSections';
import { buildLeaderboard } from '@/components/Admin/leaderboard/leaderboardData';
import LeaderboardRangeToggle from '@/components/Admin/leaderboard/LeaderboardRangeToggle';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'Who delivered the most this month.',
};

/**
 * The studio leaderboard: members ranked by tasks completed, over a Vancouver
 * month (with the previous month's winner carried across the current one) or
 * over a rolling window. The rolling ranges exist because a board one month
 * into tracking is nearly empty — they answer "who is delivering lately"
 * without waiting for the calendar, and drop the champion/history sections
 * that only a calendar month can honestly support.
 *
 * Gated on its own 'leaderboard' grant (split from 'tasks' so each can be
 * granted separately; both sit in DEFAULT_AREAS, so new accounts still get the
 * pair together). Pure `?month=` + `?range=` URL state, which (like
 * /admin/reports) renders at request time.
 */
export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireArea('leaderboard');
  const sp = await searchParams;
  const board = await buildLeaderboard(
    await viewerZone(),
    firstParam(sp.month),
    profile.session.user.id,
    firstParam(sp.range),
  );

  const hasWork = board.rows.length > 0;

  return (
    <AdminPage>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Studio
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Leaderboard
            </h1>
            <HelpButton topic={ADMIN_HELP.leaderboard} />
          </div>
          <p className="text-sm text-muted-foreground">{board.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LeaderboardRangeToggle
            basePath="/admin/leaderboard"
            range={board.range}
            month={board.month}
            currentMonth={board.currentMonth}
          />
          {/* A rolling window has no month to switch — showing the switcher
              there would offer a control that changes nothing. */}
          {board.range === 'month' && (
            <MonthSwitcher
              basePath="/admin/leaderboard"
              month={board.month}
              monthLabel={board.monthLabelText}
              currentMonth={board.currentMonth}
              options={board.monthOptions}
            />
          )}
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <ReportTile label="Tasks completed" value={board.tiles.tasks} />
        <ReportTile label="Hours delivered" value={board.tiles.hours} />
        <ReportTile label="Members on the board" value={board.tiles.members} />
      </section>

      {board.champion && (
        <section className="mt-6">
          <ChampionRibbon champion={board.champion} />
        </section>
      )}

      {hasWork ? (
        <section className="mt-6">
          <h2 className="mb-3 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {board.rangeLabel}
          </h2>
          <GlassPanel>
            <LeaderList rows={board.rows} idle={board.idle} />
          </GlassPanel>
          {/* The read is capped, so a bitten cap means these totals are a
              floor. Saying so beats quietly publishing an undercount. */}
          {board.truncated && (
            <p className="mt-2 px-1 text-xs text-muted-foreground">
              Showing the most recent completions only — there is more history
              than this view reads.
            </p>
          )}
        </section>
      ) : (
        <GlassPanel as="section" className="mt-6">
          <EmptyState
            icon={LuTrophy}
            title={board.emptyTitle}
            description="Mark a task done and it lands here — ranked by tasks completed, with hours and on-time delivery alongside."
          />
        </GlassPanel>
      )}

      {board.categoryChampions.length > 0 && (
        <CategoryChampions items={board.categoryChampions} />
      )}

      {board.pastChampions.length > 0 && (
        <PastChampions items={board.pastChampions} />
      )}
    </AdminPage>
  );
}
