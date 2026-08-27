import 'server-only';

import { db } from '@/db';
import { bumpDaily, upsertCheck } from '@/db/monitoringStatements';
import { log, logError } from '@/lib/log';
import {
  checkOutcomeRow,
  cronComponent,
  dayKeyUtc,
  safeErrorName,
  type CronJobName,
} from '@/lib/monitoringFields';
import { recordError } from '@/lib/monitoringRecord';

/**
 * The one wrapper every `/api/cron/*` handler runs inside. It owns the three
 * things the four handlers used to each carry a copy of — the CRON_SECRET
 * check, the outer try/catch, the 500 — and adds the one thing none of them
 * had: an OUTCOME RECORD. A thrown cron used to leave one stderr line that
 * Vercel keeps for a day; a cron that never fired left nothing at all. Now
 * every run, success or failure, stamps its `monitoring_checks` row with the
 * outcome, the duration and a fixed-sentence summary, and the monitoring
 * evaluator judges lateness from that row against the job's own schedule.
 *
 * The handler's own activity_log rows are untouched — those are the audit
 * trail's business ("Sent the weekly digest to 5 people") and this is the
 * operational one. A failed run writes NO activity row: an exception is not
 * an audit event, and the two products stay separate.
 *
 * ORDER IS LOAD-BEARING: the secret is checked before anything is written, so
 * an unauthenticated probe can never stamp a run. And every monitoring write
 * here is try/caught so it can never change the cron's own response — a
 * monitoring outage must not turn a successful mint into a 500 Vercel then
 * reports as broken.
 */

export type CronOutcome = {
  /** The JSON the response used to return, unchanged. (`undefined` is allowed
   *  so a handler's early-return and full-return shapes can differ — TS folds
   *  them into one union with optional keys — and JSON.stringify drops it.) */
  body: Record<string, string | number | boolean | null | undefined>;
  /** One fixed sentence with counts — never a name, a title or a figure. */
  summary: string;
  /** Steps that failed without failing the run (a sweep, a revalidate). */
  warnings?: string[];
};

const SUMMARY_MAX = 140;

async function stamp(
  job: CronJobName,
  outcome:
    | { status: 'ok'; durationMs: number; detail: string }
    | { status: 'failed'; durationMs: number; errorName: string },
  now: Date,
): Promise<void> {
  try {
    await Promise.all([
      upsertCheck(
        db,
        checkOutcomeRow(
          cronComponent(job),
          'cron',
          outcome.status === 'ok'
            ? { status: 'ok', durationMs: outcome.durationMs, errorName: null, detail: outcome.detail }
            : {
                status: 'failed',
                durationMs: outcome.durationMs,
                errorName: outcome.errorName,
                detail: 'The run threw',
              },
          now,
        ),
      ),
      // The reliability SLO's numerator: one tick per run per day.
      bumpDaily(db, cronComponent(job), dayKeyUtc(now), outcome.status, now),
    ]);
  } catch (error) {
    logError('[monitoring] cron outcome write failed', error, {
      event: 'monitoring.write.failed',
      job,
    });
  }
}

/**
 * A step inside a cron that was caught rather than thrown — the recurring-tasks
 * sweeps. Logged, recorded as a cron-source signal, and returned as the line
 * for the handler's `warnings`, so the run reads as "ok, with a step that
 * failed" rather than silently green.
 */
export function reportCronStep(
  job: CronJobName,
  message: string,
  error: unknown,
): string {
  logError(message, error, { event: 'cron.step.failed', job });
  void recordError({ source: 'cron', scope: job, error });
  return message;
}

export async function runCron(
  job: CronJobName,
  request: Request,
  handler: () => Promise<CronOutcome>,
): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const outcome = await handler();
    const durationMs = Date.now() - startedAt;
    const warnings = outcome.warnings ?? [];
    const detail =
      warnings.length > 0
        ? `${outcome.summary} · ${warnings.length} ${warnings.length === 1 ? 'step' : 'steps'} failed`
        : outcome.summary;
    await stamp(job, { status: 'ok', durationMs, detail: detail.slice(0, SUMMARY_MAX) }, new Date());
    log('cron run completed', {
      event: 'cron.run.completed',
      job,
      durationMs,
      warnings: warnings.length,
    });
    return Response.json(outcome.body);
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    logError(`[cron] ${job} failed`, error, {
      event: 'cron.run.failed',
      job,
      durationMs,
    });
    await stamp(job, { status: 'failed', durationMs, errorName: safeErrorName(error) }, new Date());
    await recordError({ source: 'cron', scope: job, error });
    return new Response(`${job} failed`, { status: 500 });
  }
}
