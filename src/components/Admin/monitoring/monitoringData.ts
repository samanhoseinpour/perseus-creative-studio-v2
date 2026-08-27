import 'server-only';

import {
  bucketSeries,
  errorGroups,
  errorTotals,
  listChecks,
  listOpenIncidents,
  listResolvedIncidents,
  observedFailures,
  routeTotals,
  type ErrorGroupRow,
  type RouteTotalRow,
} from '@/db/monitoringQueries';
import type { MonitoringCheck, MonitoringIncident } from '@/db/schema';
import { zonedFormat } from '@/lib/calendar';
import {
  CHECK_STATUS_LABELS,
  CHECK_STATUS_TONES,
  COMPONENT_LABELS,
  CRON_JOBS,
  CRON_STATE_LABELS,
  DEPENDENCY_CHECKS,
  INCIDENT_KIND_LABELS,
  OBSERVED_WINDOW_MS,
  OVERALL_STATUS_LABELS,
  OVERALL_STATUS_TONES,
  RANGE_SPECS,
  SEVERITY_LABELS,
  SEVERITY_TONES,
  composeBurstTitle,
  cronComponent,
  cronHealth,
  deriveOverallStatus,
  describeSchedule,
  foldSeries,
  isMonitoringComponent,
  nextRun,
  parseCronSchedule,
  rangeWindow,
  relativeAge,
  safeEnvironment,
  vercelLinks,
  type CheckStatus,
  type MonitoringRange,
  type Severity,
} from '@/lib/monitoringFields';
import type {
  ChipData,
  CronRow,
  DependencyRow,
  GroupRow,
  IncidentRow,
  MonitoringView,
  RouteRow,
  SeriesColumn,
} from './types';

/**
 * Turns the monitoring reads into fully pre-formatted view props — the
 * payrollData.ts / costData.ts contract: every number and every time leaves
 * here as a STRING in the reader's zone, so the sections do no math and the
 * figures on screen are the figures the server computed.
 *
 * The reads fan out in ONE flight through Promise.allSettled rather than
 * Promise.all, on purpose: this is the page that says whether the system is
 * healthy, and a single failed query must degrade ONE panel and turn the
 * headline `unknown` — never take the whole page down, and never leave the
 * headline green over a section that could not be read.
 */

const TOP_GROUPS = 10;
const TOP_ROUTES = 8;
const RECENT_INCIDENTS = 12;

const SOURCE_LABELS: Record<string, string> = {
  request: 'Page or route',
  action: 'Caught in an action',
  dependency: 'Dependency',
  cron: 'Scheduled job',
};

const STAMP_OPTS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
};

function scaleBars(values: number[]): number[] {
  const max = Math.max(0, ...values);
  return values.map((v) =>
    max <= 0 || v <= 0 ? 0 : Math.max(2, Math.round((v / max) * 100)),
  );
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

const chip = (label: string, tone: string): ChipData => ({ label, tone });

function severityChip(severity: Severity): ChipData {
  return chip(SEVERITY_LABELS[severity], SEVERITY_TONES[severity]);
}

function checkChip(status: CheckStatus): ChipData {
  return chip(CHECK_STATUS_LABELS[status], CHECK_STATUS_TONES[status]);
}

function durationLabel(ms: number | null): string | null {
  if (ms === null) return null;
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

/** Column labels per range: the hour for a day, the day for a month. */
function columnLabel(tz: string, range: MonitoringRange, at: Date): string {
  switch (range) {
    case '1h':
    case '24h':
      return zonedFormat(tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at);
    case '7d':
      return zonedFormat(tz, { weekday: 'short', hour: '2-digit', hourCycle: 'h23' }).format(at);
    case '30d':
      return zonedFormat(tz, { month: 'short', day: 'numeric' }).format(at);
  }
}

async function settle<T>(
  name: string,
  run: () => Promise<T>,
): Promise<{ name: string; value: T | null }> {
  try {
    return { name, value: await run() };
  } catch {
    return { name, value: null };
  }
}

export async function buildMonitoringView(
  tz: string,
  range: MonitoringRange,
  now: Date = new Date(),
): Promise<MonitoringView> {
  const environment = safeEnvironment(process.env.VERCEL_ENV ?? process.env.NODE_ENV);
  const deployment = process.env.VERCEL_DEPLOYMENT_ID?.slice(0, 40) ?? null;
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null;
  const { since, until, previousSince } = rangeWindow(range, now);
  const stamp = zonedFormat(tz, STAMP_OPTS);
  const at = (d: Date) => stamp.format(d);

  const [checksR, openR, recentR, totalsR, seriesR, groupsR, routesR, observedR] =
    await Promise.all([
      settle('checks', () => listChecks()),
      settle('open incidents', () => listOpenIncidents()),
      settle('recent incidents', () => listResolvedIncidents(RECENT_INCIDENTS)),
      settle('error totals', () => errorTotals(environment, previousSince, since, until)),
      settle('error trend', () => bucketSeries(environment, since, until)),
      settle('error groups', () => errorGroups(environment, since, until, TOP_GROUPS)),
      settle('routes', () => routeTotals(environment, since, until, TOP_ROUTES)),
      settle('recent failures', () =>
        observedFailures(environment, new Date(now.getTime() - OBSERVED_WINDOW_MS)),
      ),
    ]);
  const sectionsFailed = [checksR, openR, recentR, totalsR, seriesR, groupsR, routesR, observedR]
    .filter((r) => r.value === null)
    .map((r) => r.name);

  const checks: MonitoringCheck[] = checksR.value ?? [];
  const open: MonitoringIncident[] = openR.value ?? [];
  const recent: MonitoringIncident[] = recentR.value ?? [];
  const observed = new Map((observedR.value ?? []).map((r) => [r.component, r.count]));

  // ── Dependencies ────────────────────────────────────────────────────────
  const dependencies: DependencyRow[] = DEPENDENCY_CHECKS.map((spec) => {
    const row = checks.find((c) => c.component === spec.component);
    const observedCount = spec.observed.reduce((sum, c) => sum + (observed.get(c) ?? 0), 0);
    return {
      key: spec.component,
      label: spec.label,
      hint: spec.hint,
      status: row ? checkChip(row.status) : chip('Not checked yet', CHECK_STATUS_TONES.unknown),
      detail: row?.detail ?? null,
      latencyLabel: row?.status === 'ok' ? durationLabel(row.durationMs) : null,
      checkedLabel: row ? `Checked ${relativeAge(now.getTime() - row.checkedAt.getTime())}` : 'Never checked',
      lastFailedLabel: row?.lastFailedAt ? `Last failed ${at(row.lastFailedAt)}` : null,
      streakLabel:
        row && row.consecutiveFailures > 0
          ? `${plural(row.consecutiveFailures, 'check', 'checks')} in a row`
          : null,
      observedLabel:
        observedCount > 0 ? `${plural(observedCount, 'failure', 'failures')} in use in the last hour` : null,
    };
  });
  const dependencyStatuses = DEPENDENCY_CHECKS.map((spec) => ({
    component: spec.component,
    status: checks.find((c) => c.component === spec.component)?.status ?? ('unknown' as const),
  }));
  const lastCheckedAt = checks
    .filter((c) => c.kind === 'dependency')
    .reduce<Date | null>((latest, c) => (latest && latest > c.checkedAt ? latest : c.checkedAt), null);

  // ── Crons ───────────────────────────────────────────────────────────────
  const cronRows: CronRow[] = [];
  const cronStatuses: { component: string; status: CheckStatus }[] = [];
  for (const job of CRON_JOBS) {
    const row = checks.find((c) => c.component === cronComponent(job.name));
    const schedule = parseCronSchedule(job.schedule);
    const lastRunAt = row && row.status !== 'unknown' ? row.checkedAt : null;
    const health = cronHealth({
      schedule,
      lastRunAt,
      lastStatus: row?.status ?? null,
      consecutiveFailures: row?.consecutiveFailures ?? 0,
      firstSeenAt: row?.firstSeenAt ?? null,
      now,
    });
    const tone =
      health.state === 'ok'
        ? CHECK_STATUS_TONES.ok
        : health.state === 'pending'
          ? CHECK_STATUS_TONES.unknown
          : health.severity === 'critical'
            ? SEVERITY_TONES.critical
            : SEVERITY_TONES.warning;
    cronRows.push({
      key: job.name,
      label: job.label,
      description: job.description,
      scheduleLabel: describeSchedule(schedule),
      state: chip(CRON_STATE_LABELS[health.state], tone),
      lastRunLabel: lastRunAt
        ? `${row?.status === 'failed' ? 'Failed' : 'Ran'} ${at(lastRunAt)}`
        : 'No run recorded yet',
      durationLabel: lastRunAt ? durationLabel(row?.durationMs ?? null) : null,
      summary: row?.detail ?? null,
      nextLabel: `Next ${at(nextRun(schedule, now))}`,
      missed: health.state === 'missed',
    });
    if (health.state === 'ok') cronStatuses.push({ component: job.name, status: 'ok' });
    else if (health.state !== 'pending') cronStatuses.push({ component: job.name, status: 'failed' });
  }

  // ── Headline ────────────────────────────────────────────────────────────
  const overall = deriveOverallStatus({
    checks: [...dependencyStatuses, ...cronStatuses],
    openIncidents: open.map((i) => ({ severity: i.severity })),
    lastCheckedAt,
    sectionsFailed: sectionsFailed.length,
    now,
  });
  const evaluator = checks.find((c) => c.component === cronComponent('monitoring'));
  const evaluatorSchedule = parseCronSchedule(CRON_JOBS.find((j) => j.name === 'monitoring')!.schedule);

  // ── Tiles ───────────────────────────────────────────────────────────────
  const totals = totalsR.value ?? { current: 0, previous: 0 };
  const critical = open.filter((i) => i.severity === 'critical').length;
  const warnings = open.length - critical;
  const depsOk = dependencyStatuses.filter((d) => d.status === 'ok').length;
  const cronsOnTime = cronStatuses.filter((c) => c.status === 'ok').length;
  const cronsJudged = cronStatuses.length;

  // ── Trend ───────────────────────────────────────────────────────────────
  const points = foldSeries(seriesR.value ?? [], range, now);
  const pcts = scaleBars(points.map((p) => p.count));
  const columns: SeriesColumn[] = points.map((p, i) => ({
    key: p.start.toISOString(),
    label: columnLabel(tz, range, p.start),
    valueLabel: `${plural(p.count, 'error', 'errors')} · ${at(p.start)}`,
    pct: pcts[i],
    current: i === points.length - 1,
  }));

  // ── Groups + routes ─────────────────────────────────────────────────────
  const groups: GroupRow[] = (groupsR.value ?? []).map((g: ErrorGroupRow) => ({
    key: g.fingerprint,
    title: composeBurstTitle(g),
    sourceLabel: SOURCE_LABELS[g.source] ?? g.source,
    countLabel: plural(g.count, 'error', 'errors'),
    firstSeenLabel: `First ${at(g.firstSeenAt)}`,
    lastSeenLabel: `Last ${at(g.lastSeenAt)}`,
    newInDeployment: deployment !== null && g.firstDeployment === deployment,
    code: g.code,
    componentLabel:
      g.component && isMonitoringComponent(g.component) ? COMPONENT_LABELS[g.component] : null,
    digest: g.lastDigest,
    requestId: g.lastRequestId,
    deployment: g.lastDeployment,
  }));
  const routeRows = routesR.value ?? [];
  const routePcts = scaleBars(routeRows.map((r) => r.count));
  const routes: RouteRow[] = routeRows.map((r: RouteTotalRow, i) => ({
    key: `${r.scope}|${r.routeType ?? ''}`,
    label: r.scope,
    note: r.routeType,
    countLabel: plural(r.count, 'error', 'errors'),
    pct: routePcts[i],
  }));

  // ── Incidents ───────────────────────────────────────────────────────────
  const incidentRow = (i: MonitoringIncident): IncidentRow => ({
    id: i.id,
    title: i.title,
    detail: i.detail,
    kindLabel: INCIDENT_KIND_LABELS[i.kind],
    severity: severityChip(i.severity),
    open: i.status === 'open',
    startedLabel: `Since ${at(i.startedAt)}`,
    lastSeenLabel: `Last seen ${relativeAge(now.getTime() - i.lastSeenAt.getTime())}`,
    resolvedLabel: i.resolvedAt ? `Resolved ${at(i.resolvedAt)}` : null,
    occurrenceLabel: `Seen ${plural(i.occurrenceCount, 'time', 'times')}`,
    alertedLabel: i.alertedAt ? `Alerted ${at(i.alertedAt)}` : 'Not alerted',
    deployment: i.deployment,
    requestId: i.lastRequestId,
    digest: i.lastDigest,
  });

  return {
    range,
    rangeLabel: RANGE_SPECS[range].label,
    environment,
    deployment,
    commit,
    status: {
      status: overall.status,
      chip: chip(OVERALL_STATUS_LABELS[overall.status], OVERALL_STATUS_TONES[overall.status]),
      reason: overall.reason,
    },
    checkedLabel: lastCheckedAt
      ? `Checked ${relativeAge(now.getTime() - lastCheckedAt.getTime())}`
      : 'Never checked',
    nextCheckLabel: evaluator
      ? `Next scheduled check ${at(nextRun(evaluatorSchedule, now))}`
      : 'The monitoring job has not run yet',
    tiles: {
      errors: {
        label: `Server errors · ${RANGE_SPECS[range].short}`,
        value: totals.current.toLocaleString(),
        muted: totals.current === 0,
        hint:
          totals.previous === 0 && totals.current === 0
            ? 'none in the window before either'
            : `vs ${totals.previous.toLocaleString()} in the window before`,
      },
      incidents: {
        label: 'Open incidents',
        value: open.length.toLocaleString(),
        muted: open.length === 0,
        reading:
          open.length === 0
            ? 'nothing open'
            : [critical ? plural(critical, 'critical', 'critical') : '', warnings ? plural(warnings, 'warning', 'warnings') : '']
                .filter(Boolean)
                .join(' · '),
      },
      dependencies: {
        label: 'Dependencies',
        value: `${depsOk}/${DEPENDENCY_CHECKS.length}`,
        reading: depsOk === DEPENDENCY_CHECKS.length ? 'all passing' : 'passing',
        hint:
          depsOk === DEPENDENCY_CHECKS.length
            ? undefined
            : dependencyStatuses
                .filter((d) => d.status !== 'ok')
                .map((d) => DEPENDENCY_CHECKS.find((s) => s.component === d.component)?.label ?? d.component)
                .join(', '),
      },
      crons: {
        label: 'Scheduled jobs',
        value: `${cronsOnTime}/${CRON_JOBS.length}`,
        reading: cronsJudged < CRON_JOBS.length ? `on time · ${CRON_JOBS.length - cronsJudged} not run yet` : 'on time',
        hint: cronRows
          .filter((c) => c.missed || c.state.label === CRON_STATE_LABELS.failed)
          .map((c) => c.label)
          .join(', ') || undefined,
      },
    },
    series: {
      columns,
      totalLabel: plural(totals.current, 'error', 'errors'),
      hasErrors: points.some((p) => p.count > 0),
    },
    groups,
    routes,
    dependencies,
    crons: cronRows,
    incidents: { open: open.map(incidentRow), recent: recent.map(incidentRow) },
    vercel: vercelLinks(deployment),
    sectionsFailed,
  };
}
