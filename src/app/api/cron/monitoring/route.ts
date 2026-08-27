import { runCron } from '@/lib/cronRun';
import { evaluateMonitoring } from '@/lib/monitoringEvaluate';

/**
 * The monitoring evaluator (vercel.json cron, every 15 minutes — the cadence
 * Saman chose on 2026-08-27 so a scale-to-zero Neon database can still sleep
 * between runs overnight; alerts land within ~15–30 minutes of a failure,
 * which is the right trade for a seven-person dashboard).
 *
 * Everything it does is idempotent by the database, because Vercel documents
 * both missed and DUPLICATE invocations for a slot — see
 * src/lib/monitoringEvaluate.ts and src/db/monitoringStatements.ts. Runs inside
 * runCron like every other job, so its own outcome is stamped on
 * `monitoring_checks` as `cron:monitoring`; the page reads that row's age as
 * "is the monitor itself running?" and turns the headline `unknown` when it
 * is not — the one condition the evaluator cannot report about itself.
 */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return runCron('monitoring', request, async () => {
    const s = await evaluateMonitoring({ trigger: 'cron' });
    return {
      body: {
        environment: s.environment,
        checked: s.checked,
        opened: s.opened,
        reopened: s.reopened,
        escalated: s.escalated,
        resolved: s.resolved,
        alertsSent: s.alertsSent,
        recoveriesSent: s.recoveriesSent,
        sweptBuckets: s.swept.buckets,
        sweptIncidents: s.swept.incidents,
        requestDays: s.requestDays,
        stepsFailed: s.stepsFailed.join(', '),
        durationMs: s.durationMs,
      },
      summary: `Checked ${s.checked} dependencies · ${s.opened} opened · ${s.resolved} resolved`,
      warnings: s.stepsFailed,
    };
  });
}
