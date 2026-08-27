'use server';

/**
 * The one write action on /admin/monitoring: "Check now". It runs the SAME
 * evaluator the cron runs (probes, incident decision, alerts — everything but
 * the retention sweep, which stays on the scheduled run), so a manual check
 * can never disagree with a scheduled one.
 *
 * SECURITY: the protected layout's guard does NOT wrap server actions — this
 * gates itself on the `monitoring` area, an owner-granted SENSITIVE_AREA.
 *
 * Cache contract: `revalidatePath('/admin/monitoring')` and nothing else. The
 * fresh page rides back on the action's own POST response, so the client must
 * never follow up with `router.refresh()` (the invalidateTasks rule). No
 * activity row: a check is a read of the world, not a change to the studio's
 * data, and the incidents it may open live on this page rather than in the
 * audit trail.
 */
import { revalidatePath } from 'next/cache';

import { requireArea, viewerZone } from '@/lib/adminAccess';
import { zonedFormat } from '@/lib/calendar';
import { logError } from '@/lib/log';
import { evaluateMonitoring } from '@/lib/monitoringEvaluate';
import {
  RECENT_LOGS_MINUTES,
  RECENT_LOGS_TIMEOUT_MS,
  safeErrorName,
  summarizeRecentLogs,
  type RecentLogsSummary,
  type SafeLogLine,
  type SafeRequestRow,
} from '@/lib/monitoringFields';
import { reportError } from '@/lib/monitoringRecord';
import { fetchRecentRequestLogs } from '@/lib/vercelApi';

export type CheckNowResult =
  | {
      ok: true;
      checked: number;
      opened: number;
      resolved: number;
      stepsFailed: string[];
    }
  | { ok: false; error: string };

export async function runMonitoringChecks(): Promise<CheckNowResult> {
  await requireArea('monitoring', '/admin');
  try {
    const summary = await evaluateMonitoring({ trigger: 'manual' });
    revalidatePath('/admin/monitoring');
    return {
      ok: true,
      checked: summary.checked,
      opened: summary.opened,
      resolved: summary.resolved,
      stepsFailed: summary.stepsFailed,
    };
  } catch (error) {
    reportError('[monitoring] runMonitoringChecks failed', error);
    return { ok: false, error: 'The checks could not run. Try again in a moment.' };
  }
}

/* -------------------------------------------------------------------------- */
/* Recent request logs from Vercel                                            */
/* -------------------------------------------------------------------------- */

/**
 * The last RECENT_LOGS_MINUTES of the request log for the build serving the
 * page, through the windowed query the Vercel CLI itself sends — the
 * documented stream never answers for this project (src/lib/monitoringFields.ts,
 * "Recent request logs", has the evidence). Every row passes
 * `parseRequestLogRow`: the request keeps method, path-without-query, status,
 * source and request id; beneath it only our own logger's JSON lines survive,
 * reduced to their closed field set, and every other line is counted as
 * withheld and never returned. Nothing is stored.
 *
 * Needs VERCEL_API_TOKEN (server only, never NEXT_PUBLIC_*), spent in
 * src/lib/vercelApi.ts. VERCEL_PROJECT_ID and VERCEL_DEPLOYMENT_ID are
 * Vercel's own system env vars, present at runtime on every deployment and
 * absent locally — hence the `not-on-vercel` answer.
 */
export type RequestRowView = {
  at: string;
  atLabel: string;
  source: SafeRequestRow['source'];
  method: string | null;
  path: string | null;
  status: number | null;
  requestId: string | null;
  lines: SafeLogLine[];
  withheld: number;
};

export type RecentLogsResult =
  | {
      ok: true;
      rows: RequestRowView[];
      summary: RecentLogsSummary;
      deployment: string;
      fromLabel: string;
      toLabel: string;
    }
  | {
      ok: false;
      /**
       * `silent`: Vercel sent no response — not even headers — inside the
       * bound. Distinguished from an empty window on purpose: "nothing
       * arrived" would be a lie; "Vercel did not answer" is the reading.
       * `timeout`: it answered but did not finish; `failed`: it rejected the
       * request or answered in a shape this page does not read.
       */
      reason: 'unconfigured' | 'not-on-vercel' | 'failed' | 'silent' | 'timeout';
      status?: number;
      errorName?: string;
    };

export async function recentRuntimeLogs(): Promise<RecentLogsResult> {
  await requireArea('monitoring', '/admin');
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID;
  if (!token) return { ok: false, reason: 'unconfigured' };
  if (!projectId || !deploymentId) return { ok: false, reason: 'not-on-vercel' };

  try {
    const tz = await viewerZone();
    const stamp = zonedFormat(tz, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    const fetched = await fetchRecentRequestLogs({ token, projectId, deploymentId, now: new Date() });
    if (!fetched.ok) {
      logError(
        fetched.reason === 'silent'
          ? '[monitoring] recent logs did not answer'
          : fetched.reason === 'timeout'
            ? '[monitoring] recent logs did not finish'
            : '[monitoring] recent logs failed',
        undefined,
        {
          event: 'vercel.logs.failed',
          reason: fetched.reason,
          status: fetched.status,
          errorName: fetched.errorName,
          seconds: RECENT_LOGS_TIMEOUT_MS / 1000,
        },
      );
      return { ok: false, reason: fetched.reason, status: fetched.status, errorName: fetched.errorName };
    }
    return {
      ok: true,
      rows: fetched.rows.map((row) => ({
        at: row.at.toISOString(),
        atLabel: stamp.format(row.at),
        source: row.source,
        method: row.method,
        path: row.path,
        status: row.status,
        requestId: row.requestId,
        lines: row.lines,
        withheld: row.withheld,
      })),
      summary: summarizeRecentLogs(fetched.rows, RECENT_LOGS_MINUTES, fetched.truncated),
      deployment: deploymentId,
      fromLabel: stamp.format(fetched.from),
      toLabel: stamp.format(fetched.to),
    };
  } catch (error) {
    reportError('[monitoring] recentRuntimeLogs failed', error);
    return { ok: false, reason: 'failed', errorName: safeErrorName(error) };
  }
}
