import type { Metadata } from 'next';
import Link from 'next/link';

import AdminPage from '@/components/Admin/AdminPage';
import { adminLink } from '@/components/Admin/Glass';
import HelpButton from '@/components/Admin/HelpButton';
import CheckNowButton from '@/components/Admin/monitoring/CheckNowButton';
import LiveTail from '@/components/Admin/monitoring/LiveTail';
import {
  CronList,
  DependencyList,
  ErrorColumns,
  GroupList,
  IncidentList,
  MonitoringSection,
  MonitoringTileCard,
  RouteBars,
  SectionUnavailable,
  SloList,
  StatusTile,
  VercelLinks,
} from '@/components/Admin/monitoring/MonitoringSections';
import { buildMonitoringView } from '@/components/Admin/monitoring/monitoringData';
import RangeToggle from '@/components/Admin/monitoring/RangeToggle';
import { canAccessArea, requireArea, viewerZone } from '@/lib/adminAccess';
import { ADMIN_HELP } from '@/lib/adminHelp';
import { parseRange } from '@/lib/monitoringFields';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Monitoring',
  description: 'Is the dashboard healthy — errors, dependencies, scheduled jobs, incidents.',
};

const BASE = '/admin/monitoring';

/**
 * Operational health — "is the system healthy?" — as distinct from Activity
 * ("who changed what?") and Vercel's runtime logs ("why did this request
 * fail?"). Server-rendered from the monitoring tables; the only client leaves
 * are the "Check now" button and the copy chips.
 *
 * requireArea('monitoring') gates the render, and the one action the page
 * offers re-gates itself, because the protected layout's guard doesn't wrap
 * server actions. Request-time rendered: `?range=` drives the trend window.
 *
 * The headline is DERIVED (deriveOverallStatus) and turns `unknown` when the
 * readings are stale or a read failed — this page must never say "healthy"
 * merely because its own queries succeeded.
 */
export default async function MonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const profile = await requireArea('monitoring', '/admin');
  const { range: raw } = await searchParams;
  const tz = await viewerZone();
  const range = parseRange(raw);
  const view = await buildMonitoringView(tz, range);
  const failed = (name: string) => view.sectionsFailed.includes(name);
  const canLogs = canAccessArea(profile, 'logs');

  return (
    <AdminPage width="wide">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Private
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Monitoring
            </h1>
            <HelpButton topic={ADMIN_HELP.monitoring} />
          </div>
          <p className="text-sm text-muted-foreground">
            {view.checkedLabel} · {view.environment}
            {view.commit ? ` · build ${view.commit}` : ''}
            {' · '}
            <span className="text-muted-foreground/70">{view.nextCheckLabel}.</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RangeToggle basePath={BASE} range={view.range} />
          <CheckNowButton />
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusTile status={view.status} />
        <MonitoringTileCard tile={view.tiles.errors} />
        <MonitoringTileCard tile={view.tiles.incidents} />
        <div className="grid gap-4">
          <MonitoringTileCard tile={view.tiles.dependencies} />
        </div>
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MonitoringSection title="Server errors" aside={view.rangeLabel} inset>
            {failed('error trend') ? (
              <SectionUnavailable name="the error trend" />
            ) : (
              <ErrorColumns
                columns={view.series.columns}
                totalLabel={view.series.totalLabel}
                rangeLabel={view.rangeLabel}
                hasErrors={view.series.hasErrors}
              />
            )}
          </MonitoringSection>
        </div>
        <MonitoringSection title="Top error groups" aside={view.rangeLabel} inset>
          {failed('error groups') ? (
            <SectionUnavailable name="the error groups" />
          ) : (
            <GroupList rows={view.groups} />
          )}
        </MonitoringSection>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <MonitoringSection title="Dependencies" aside={view.tiles.dependencies.value + ' passing'} inset>
          {failed('checks') ? (
            <SectionUnavailable name="the dependency checks" />
          ) : (
            <DependencyList rows={view.dependencies} />
          )}
        </MonitoringSection>
        <MonitoringSection title="Scheduled jobs" aside={view.tiles.crons.value + ' on time'} inset>
          {failed('checks') ? (
            <SectionUnavailable name="the scheduled jobs" />
          ) : (
            <CronList rows={view.crons} />
          )}
        </MonitoringSection>
      </section>

      <MonitoringSection
        title="Incidents"
        aside={
          view.incidents.open.length === 0
            ? 'nothing open'
            : `${view.incidents.open.length} open`
        }
      >
        {failed('open incidents') ? (
          <SectionUnavailable name="the open incidents" />
        ) : (
          <IncidentList
            rows={view.incidents.open}
            empty={{
              title: 'No open incidents',
              description:
                'When a check fails twice, a job misses its slot, or one error repeats, it opens here and the people holding this area are told once.',
            }}
          />
        )}
        {(view.incidents.recent.length > 0 || failed('recent incidents')) && (
          <div className="mt-5 border-t border-white/40 pt-4 dark:border-white/10">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recently resolved
            </h3>
            {failed('recent incidents') ? (
              <SectionUnavailable name="the resolved incidents" />
            ) : (
              <IncidentList
                rows={view.incidents.recent}
                empty={{ title: 'Nothing resolved yet', description: '' }}
              />
            )}
          </div>
        )}
      </MonitoringSection>

      <MonitoringSection title="Service levels" aside={view.slo.windowLabel}>
        {failed('service levels') ? (
          <SectionUnavailable name="the service levels" />
        ) : (
          <SloList rows={view.slo.rows} />
        )}
      </MonitoringSection>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <MonitoringSection title="Routes with errors" aside={view.rangeLabel} inset>
          {failed('routes') ? (
            <SectionUnavailable name="the routes" />
          ) : (
            <RouteBars rows={view.routes} />
          )}
        </MonitoringSection>
        <MonitoringSection title="On Vercel" inset>
          <VercelLinks links={view.vercel} />
        </MonitoringSection>
      </section>

      <MonitoringSection title="Live on Vercel" aside={`${view.tail.seconds}-second sample`}>
        <LiveTail
          configured={view.tail.configured}
          onVercel={view.tail.onVercel}
          seconds={view.tail.seconds}
        />
      </MonitoringSection>

      <p className="mt-4 px-1 text-xs text-muted-foreground">
        This page is operational health. Who changed what is on{' '}
        {canLogs ? (
          <Link href="/admin/logs" className={cn('text-foreground', adminLink)}>
            Activity
          </Link>
        ) : (
          'Activity'
        )}
        ; the full stack trace behind any id above is in Vercel’s runtime logs, kept for a
        day. Error counts here are kept for 30 days and incidents for 90.
      </p>
    </AdminPage>
  );
}
