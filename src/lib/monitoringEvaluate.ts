import 'server-only';

import { list } from '@vercel/blob';
import { sql } from 'drizzle-orm';
import { Resend } from 'resend';

import { SITE_URL } from '@/constants';
import { db } from '@/db';
import { authDb } from '@/db/pool';
import {
  countPushDevices,
  errorGroups,
  getIncidents,
  listChecks,
  listOpenIncidents,
  monitoringRecipients,
  observedFailures,
  recentlyResolvedIncidents,
} from '@/db/monitoringQueries';
import {
  bumpDaily,
  claimAlert,
  claimRecovery,
  ensureCheck,
  openIncident,
  reopenIncident,
  resolveIncident,
  sweepBuckets,
  sweepDaily,
  sweepResolvedIncidents,
  touchIncident,
  upsertCheck,
} from '@/db/monitoringStatements';
import type { MonitoringIncident } from '@/db/schema';
import { log, logError } from '@/lib/log';
import {
  ALERT_CAP_PER_RUN,
  BURST_WINDOW_MS,
  BUCKET_MINUTES,
  CRON_JOBS,
  DEPENDENCY_CHECKS,
  OBSERVED_WINDOW_MS,
  PROBE_TIMEOUT_MS,
  REOPEN_WINDOW_MS,
  RETENTION_BATCH,
  RETENTION_BATCHES_PER_RUN,
  bucketRetentionCutoff,
  buildSignals,
  checkOutcomeRow,
  composeIncidentEmail,
  composeRecoveryEmail,
  cronComponent,
  cronHealth,
  dayKeyUtc,
  decideIncidents,
  incidentRetentionCutoff,
  maxSeverity,
  parseCronSchedule,
  safeEnvironment,
  safeErrorName,
  type AlertIncident,
  type BurstGroup,
  type CheckOutcome,
  type CronState,
  type DependencyComponent,
  type ProbeState,
  type Severity,
} from '@/lib/monitoringFields';
import { recordError } from '@/lib/monitoringRecord';
import { notifyGroup } from '@/lib/notify';
import { listPublic } from '@/lib/publicBlob';
import { pushConfigured } from '@/lib/push';

/**
 * The evaluator — what `/api/cron/monitoring` runs every fifteen minutes and
 * what "Check now" runs on demand. One pass: probe the dependencies, persist
 * the readings, read the signals, decide the incidents, claim and send the
 * alerts, sweep retention.
 *
 * ── HONEST BY CONSTRUCTION ───────────────────────────────────────────────────
 *
 * Every probe is bounded by a timeout and a timeout is `unknown`, never `ok`.
 * Every step runs in its own try/catch and a failed step is NAMED in the
 * summary rather than swallowed — and if any READ fails, the incident
 * decision is skipped outright, because deciding on partial data would
 * resolve real incidents ("no open incidents were read, so none are active").
 *
 * ── IDEMPOTENT BY THE DATABASE ───────────────────────────────────────────────
 *
 * Vercel documents that a cron can be invoked twice for one slot. Nothing
 * here relies on being the only runner: the check upserts fold their streaks
 * in SQL, `openIncident` collapses concurrent opens onto one row through the
 * partial unique index, and every notice is sent only by the caller whose
 * conditional UPDATE claimed it — see monitoringStatements.ts.
 *
 * ── NO DUMMY TRAFFIC ─────────────────────────────────────────────────────────
 *
 * The probes are `select 1`, a one-item Blob list per store, and Resend's
 * read-only domains endpoint. No email is sent to check email, no push is
 * sent to check push: those two are read from configuration plus the
 * failures recorded when they were actually used.
 *
 * ── THE RECURSION GUARD ──────────────────────────────────────────────────────
 *
 * The evaluator's OWN alert-send failures are recorded under the
 * `monitoring-alert` component, which no rule reads. An email outage is
 * therefore reported by the email that fails to report it exactly once (its
 * incident opens from real sends failing), and never re-fed by the report.
 */

export type EvaluationSummary = {
  trigger: 'cron' | 'manual';
  environment: string;
  checked: number;
  opened: number;
  reopened: number;
  escalated: number;
  resolved: number;
  alertsSent: number;
  recoveriesSent: number;
  swept: { buckets: number; incidents: number };
  stepsFailed: string[];
  durationMs: number;
};

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

const unconfigured = (detail: string): CheckOutcome => ({
  status: 'unconfigured',
  durationMs: null,
  errorName: null,
  detail,
});

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

class TimeoutError extends Error {
  constructor() {
    super('probe timed out');
    this.name = 'TimeoutError';
  }
}

/** Run a probe with the clock on it. A timeout is `unknown`; a throw is
 *  `failed` with the class name and nothing else. */
async function timed(run: () => Promise<unknown>, okDetail: string): Promise<CheckOutcome> {
  const started = Date.now();
  try {
    await withTimeout(run(), PROBE_TIMEOUT_MS);
    return { status: 'ok', durationMs: Date.now() - started, errorName: null, detail: okDetail };
  } catch (error) {
    if (error instanceof TimeoutError) {
      return {
        status: 'unknown',
        durationMs: PROBE_TIMEOUT_MS,
        errorName: null,
        detail: `Timed out after ${PROBE_TIMEOUT_MS / 1000} s`,
      };
    }
    return {
      status: 'failed',
      durationMs: Date.now() - started,
      errorName: safeErrorName(error),
      detail: 'The check threw',
    };
  }
}

async function probeEmail(): Promise<CheckOutcome> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return unconfigured('RESEND_API_KEY is not set');
  const started = Date.now();
  try {
    const { error } = await withTimeout(new Resend(key).domains.list(), PROBE_TIMEOUT_MS);
    const durationMs = Date.now() - started;
    if (!error) return { status: 'ok', durationMs, errorName: null, detail: 'Reachable' };
    // A sending-only key cannot list domains — and that reply proves the API
    // is up and the key is live, which is all this probe asks.
    if (error.name === 'restricted_api_key') {
      return { status: 'ok', durationMs, errorName: null, detail: 'Reachable · sending-only key' };
    }
    if (error.name === 'invalid_api_key' || error.name === 'missing_api_key') {
      return { status: 'failed', durationMs, errorName: error.name, detail: 'API key rejected' };
    }
    return { status: 'failed', durationMs, errorName: error.name, detail: 'API replied with an error' };
  } catch (error) {
    if (error instanceof TimeoutError) {
      return { status: 'unknown', durationMs: PROBE_TIMEOUT_MS, errorName: null, detail: `Timed out after ${PROBE_TIMEOUT_MS / 1000} s` };
    }
    return { status: 'failed', durationMs: Date.now() - started, errorName: safeErrorName(error), detail: 'The check threw' };
  }
}

async function probePush(): Promise<CheckOutcome> {
  if (!pushConfigured()) return unconfigured('VAPID keys are not set');
  const devices = await countPushDevices();
  return {
    status: 'ok',
    durationMs: null,
    errorName: null,
    detail: `Configured · ${plural(devices, 'device', 'devices')} subscribed`,
  };
}

const PROBES: Record<DependencyComponent, () => Promise<CheckOutcome>> = {
  database: () => timed(() => db.execute(sql`select 1`), 'Reachable'),
  'auth-database': () => timed(() => authDb.execute(sql`select 1`), 'Reachable'),
  'blob-private': () =>
    process.env.BLOB_READ_WRITE_TOKEN
      ? timed(() => list({ limit: 1 }), 'Reachable')
      : Promise.resolve(unconfigured('BLOB_READ_WRITE_TOKEN is not set')),
  'blob-public': () =>
    process.env.PUBLIC_BLOB_READ_WRITE_TOKEN
      ? timed(() => listPublic({ limit: 1 }), 'Reachable')
      : Promise.resolve(unconfigured('PUBLIC_BLOB_READ_WRITE_TOKEN is not set')),
  email: probeEmail,
  push: probePush,
};

function alertRow(row: MonitoringIncident): AlertIncident {
  return {
    kind: row.kind,
    severity: row.severity,
    title: row.title,
    detail: row.detail,
    startedAt: row.startedAt,
    occurrenceCount: row.occurrenceCount,
    deployment: row.deployment,
    lastRequestId: row.lastRequestId,
    lastDigest: row.lastDigest,
  };
}

export async function evaluateMonitoring({
  trigger,
}: {
  trigger: 'cron' | 'manual';
}): Promise<EvaluationSummary> {
  const started = Date.now();
  const now = new Date();
  const environment = safeEnvironment(process.env.VERCEL_ENV ?? process.env.NODE_ENV);
  const stepsFailed: string[] = [];

  const step = async <T>(name: string, run: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await run();
    } catch (error) {
      stepsFailed.push(name);
      logError(`[monitoring] ${name} failed`, error, {
        event: 'monitoring.evaluate.failed',
        step: name,
        trigger,
      });
      return fallback;
    }
  };

  const summary: EvaluationSummary = {
    trigger,
    environment,
    checked: 0,
    opened: 0,
    reopened: 0,
    escalated: 0,
    resolved: 0,
    alertsSent: 0,
    recoveriesSent: 0,
    swept: { buckets: 0, incidents: 0 },
    stepsFailed,
    durationMs: 0,
  };

  // ── 1. Probe, all at once, each bounded ─────────────────────────────────
  const outcomes = await Promise.all(
    DEPENDENCY_CHECKS.map(async (spec) => ({
      spec,
      outcome: await PROBES[spec.component]().catch(
        (error): CheckOutcome => ({
          status: 'failed',
          durationMs: null,
          errorName: safeErrorName(error),
          detail: 'The check threw',
        }),
      ),
    })),
  );
  summary.checked = outcomes.length;

  // ── 2. Persist the readings + a placeholder for every job the monitor knows ─
  await step(
    'persist checks',
    () =>
      Promise.all([
        ...outcomes.map(({ spec, outcome }) =>
          upsertCheck(db, checkOutcomeRow(spec.component, 'dependency', outcome, now)),
        ),
        // The SLO denominator: one tick per probe per day. `unconfigured` is
        // not a reading of the service and counts as nothing.
        ...outcomes
          .filter(({ outcome }) => outcome.status !== 'unconfigured')
          .map(({ spec, outcome }) =>
            bumpDaily(db, spec.component, dayKeyUtc(now), outcome.status, now),
          ),
        ...CRON_JOBS.map((job) => ensureCheck(db, cronComponent(job.name), 'cron', now)),
      ]),
    [],
  );

  // ── 3. Read the signals ─────────────────────────────────────────────────
  const readFailures = stepsFailed.length;
  const [checks, observed, groups, open, recent] = await Promise.all([
    step('read checks', () => listChecks(), null),
    step('read observed failures', () => observedFailures(environment, new Date(now.getTime() - OBSERVED_WINDOW_MS)), null),
    step(
      'read bursts',
      () =>
        errorGroups(
          environment,
          new Date(now.getTime() - BURST_WINDOW_MS),
          new Date(now.getTime() + BUCKET_MINUTES * 60_000),
          100,
        ),
      null,
    ),
    step('read open incidents', () => listOpenIncidents(), null),
    step('read recently resolved', () => recentlyResolvedIncidents(new Date(now.getTime() - REOPEN_WINDOW_MS)), null),
  ]);

  // A partial read must not decide anything: with the open list missing, every
  // real incident would look clear and be resolved.
  if (
    stepsFailed.length > readFailures ||
    !checks ||
    !observed ||
    !groups ||
    !open ||
    !recent
  ) {
    summary.durationMs = Date.now() - started;
    return summary;
  }

  // ── 4. Fold the readings into states ────────────────────────────────────
  const probes: ProbeState[] = DEPENDENCY_CHECKS.map((spec) => {
    const row = checks.find((c) => c.component === spec.component);
    return {
      component: spec.component,
      status: row?.status ?? 'unknown',
      consecutiveFailures: row?.consecutiveFailures ?? 0,
      errorName: row?.errorName ?? null,
    };
  });
  const crons: CronState[] = CRON_JOBS.map((job) => {
    const row = checks.find((c) => c.component === cronComponent(job.name));
    // A placeholder row is `unknown` and has never run; anything else is a run.
    const lastRunAt = row && row.status !== 'unknown' ? row.checkedAt : null;
    return {
      name: job.name,
      health: cronHealth({
        schedule: parseCronSchedule(job.schedule),
        lastRunAt,
        lastStatus: row?.status ?? null,
        consecutiveFailures: row?.consecutiveFailures ?? 0,
        firstSeenAt: row?.firstSeenAt ?? null,
        now,
      }),
      consecutiveFailures: row?.consecutiveFailures ?? 0,
      errorName: row?.errorName ?? null,
    };
  });
  const bursts: BurstGroup[] = groups.map((g) => ({
    fingerprint: g.fingerprint,
    source: g.source,
    scope: g.scope,
    errorName: g.errorName,
    count: g.count,
    deployment: g.lastDeployment,
    lastRequestId: g.lastRequestId,
    lastDigest: g.lastDigest,
  }));

  // ── 5. Decide ───────────────────────────────────────────────────────────
  const signals = buildSignals({ probes, observed, bursts, crons, environment });
  const plan = decideIncidents({
    signals,
    open: open.map((row) => ({
      id: row.id,
      kind: row.kind,
      key: row.key,
      severity: row.severity,
      lastSeenAt: row.lastSeenAt,
    })),
    recentlyResolved: recent
      .filter((row) => row.resolvedAt !== null)
      .map((row) => ({ id: row.id, kind: row.kind, key: row.key, resolvedAt: row.resolvedAt! })),
    now,
  });

  // ── 6. Persist, claiming notices as we go (capped per run) ──────────────
  const alertIds: string[] = [];
  const recoveryIds: string[] = [];
  let worst: Severity = 'info';

  await step(
    'persist incidents',
    async () => {
      for (const signal of plan.open) {
        const { id, inserted } = await openIncident(db, signal, now);
        if (!inserted) continue;
        summary.opened += 1;
        if (alertIds.length < ALERT_CAP_PER_RUN && (await claimAlert(db, id, signal.severity))) {
          alertIds.push(id);
          worst = maxSeverity(worst, signal.severity);
        }
      }
      for (const { id, signal } of plan.reopen) {
        if (await reopenIncident(db, id, signal, now)) summary.reopened += 1;
      }
      for (const { id, signal, escalate } of plan.touch) {
        await touchIncident(db, id, signal, escalate, now);
        if (escalate) {
          summary.escalated += 1;
          if (alertIds.length < ALERT_CAP_PER_RUN && (await claimAlert(db, id, 'critical'))) {
            alertIds.push(id);
            worst = 'critical';
          }
        }
      }
      for (const { id } of plan.resolve) {
        if (!(await resolveIncident(db, id, now))) continue;
        summary.resolved += 1;
        if (await claimRecovery(db, id)) recoveryIds.push(id);
      }
    },
    undefined,
  );

  // ── 7. Tell the people who can act ──────────────────────────────────────
  if (alertIds.length > 0 || recoveryIds.length > 0) {
    await step(
      'send alerts',
      async () => {
        const [recipients, rows] = await Promise.all([
          monitoringRecipients(),
          getIncidents([...alertIds, ...recoveryIds]),
        ]);
        if (recipients.length === 0) {
          log('[monitoring] no recipients hold the area', { event: 'monitoring.alert.failed' });
          return;
        }
        const openNow =
          open.length + plan.open.length + plan.reopen.length - summary.resolved;
        const alerts = rows.filter((r) => alertIds.includes(r.id)).map(alertRow);
        if (alerts.length > 0) {
          const delivery = await notifyGroup({
            recipients,
            mail: composeIncidentEmail(alerts, SITE_URL),
            push: {
              kind: 'monitoring',
              severity: worst === 'critical' ? 'critical' : 'warning',
              open: Math.max(openNow, alerts.length),
            },
          });
          if (delivery.emailed) {
            summary.alertsSent = alerts.length;
            log('[monitoring] alert sent', {
              event: 'monitoring.alert.sent',
              incidents: alerts.length,
              pushed: delivery.pushed,
            });
          } else {
            logError('[monitoring] alert email failed', new Error('alert email failed'), {
              event: 'monitoring.alert.failed',
              incidents: alerts.length,
            });
            await recordError({
              source: 'dependency',
              scope: 'monitoring-alert',
              component: 'monitoring-alert',
              error: new Error('alert email failed'),
            });
          }
        }
        const recoveries = rows.filter((r) => recoveryIds.includes(r.id)).map(alertRow);
        if (recoveries.length > 0) {
          const delivery = await notifyGroup({
            recipients,
            mail: composeRecoveryEmail(recoveries, SITE_URL, now),
            push: { kind: 'monitoring-resolved', open: Math.max(0, openNow) },
          });
          if (delivery.emailed) summary.recoveriesSent = recoveries.length;
        }
      },
      undefined,
    );
  }

  // ── 8. Retention, bounded, on the scheduled run only ────────────────────
  if (trigger === 'cron') {
    await step(
      'retention sweep',
      async () => {
        const bucketCutoff = bucketRetentionCutoff(now);
        const incidentCutoff = incidentRetentionCutoff(now);
        for (let i = 0; i < RETENTION_BATCHES_PER_RUN; i += 1) {
          const gone = await sweepBuckets(db, bucketCutoff, RETENTION_BATCH);
          summary.swept.buckets += gone;
          if (gone < RETENTION_BATCH) break;
        }
        for (let i = 0; i < RETENTION_BATCHES_PER_RUN; i += 1) {
          const gone = await sweepResolvedIncidents(db, incidentCutoff, RETENTION_BATCH);
          summary.swept.incidents += gone;
          if (gone < RETENTION_BATCH) break;
        }
        // The daily counters share the incidents' retention.
        await sweepDaily(db, dayKeyUtc(incidentCutoff), RETENTION_BATCH);
      },
      undefined,
    );
  }

  summary.durationMs = Date.now() - started;
  return summary;
}
