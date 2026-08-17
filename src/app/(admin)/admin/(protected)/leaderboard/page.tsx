import type { Metadata } from 'next';
import { LuTrophy } from 'react-icons/lu';

import { requireArea } from '@/lib/adminAccess';
import { firstParam } from '@/utils/pagination';
import AdminPage from '@/components/Admin/AdminPage';
import EmptyState from '@/components/Admin/EmptyState';
import { GlassPanel } from '@/components/Admin/Glass';
import MonthSwitcher from '@/components/Admin/reports/MonthSwitcher';
import { ReportTile } from '@/components/Admin/reports/ReportSections';
import {
  ChampionRibbon,
  LeaderList,
  PastChampions,
} from '@/components/Admin/leaderboard/LeaderboardSections';
import { buildLeaderboard } from '@/components/Admin/leaderboard/leaderboardData';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'Who delivered the most this month.',
};

/**
 * The studio leaderboard: members ranked by tasks completed in a Vancouver
 * month, with the previous month's winner carried across the current one.
 *
 * Gated on 'tasks', not 'reports' — this is the working team looking at
 * itself, so everyone who works the board can see the board. Pure `?month=`
 * URL state on the shared MonthSwitcher, which (like /admin/reports) renders
 * the page at request time.
 */
export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireArea('tasks');
  const sp = await searchParams;
  const board = await buildLeaderboard(
    firstParam(sp.month),
    profile.session.user.id,
  );

  const hasWork = board.rows.length > 0;

  return (
    <AdminPage>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Studio
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Ranked by tasks completed in {board.monthLabelText}.
          </p>
        </div>
        <MonthSwitcher
          basePath="/admin/leaderboard"
          month={board.month}
          monthLabel={board.monthLabelText}
          currentMonth={board.currentMonth}
          options={board.monthOptions}
        />
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
            {board.monthLabelText}
          </h2>
          <GlassPanel>
            <LeaderList rows={board.rows} idle={board.idle} />
          </GlassPanel>
        </section>
      ) : (
        <GlassPanel as="section" className="mt-6">
          <EmptyState
            icon={LuTrophy}
            title={`Nothing completed in ${board.monthLabelText} yet`}
            description="Mark a task done and it lands here — ranked by tasks completed, with hours and on-time delivery alongside."
          />
        </GlassPanel>
      )}

      {board.pastChampions.length > 0 && (
        <PastChampions items={board.pastChampions} />
      )}
    </AdminPage>
  );
}
