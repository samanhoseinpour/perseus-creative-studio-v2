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
  TAIL_MAX_ROWS,
  TAIL_SECONDS,
  VERCEL_TEAM_SLUG,
  parseRuntimeLogLine,
  safeErrorName,
  summarizeTail,
  type SafeLogRow,
  type TailSummary,
} from '@/lib/monitoringFields';
import { reportError } from '@/lib/monitoringRecord';

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
/* Live tail of Vercel's runtime logs                                         */
/* -------------------------------------------------------------------------- */

/**
 * A bounded SAMPLE of the current deployment's runtime logs, through Vercel's
 * documented endpoint (`GET /v1/projects/{id}/deployments/{id}/runtime-logs`,
 * `application/stream+json`). That endpoint is a live stream with no time
 * window and no limit — verified against the OpenAPI spec, 2026-08-27 — so
 * this opens it for TAIL_SECONDS, keeps what arrives (capped at
 * TAIL_MAX_ROWS), and closes. It is a window onto live traffic; it is not
 * history and it is not a denominator, and the panel says both.
 *
 * Every line passes through `parseRuntimeLogLine` (src/lib/monitoringFields.ts):
 * a request row keeps method, path-without-query and status; a function row
 * keeps its level and, only when the message is one of OUR logger's JSON
 * lines, the closed set of fields we already consider safe. Any other text is
 * counted as redacted and never returned. Nothing is stored.
 *
 * Needs VERCEL_API_TOKEN (a Vercel access token scoped to the team; server
 * only, never NEXT_PUBLIC_*). VERCEL_PROJECT_ID and VERCEL_DEPLOYMENT_ID are
 * Vercel's own system env vars, present at runtime on every deployment and
 * absent locally — hence the `not-on-vercel` answer.
 */
export type TailRowView = {
  at: string;
  atLabel: string;
  level: SafeLogRow['level'];
  source: SafeLogRow['source'];
  method: string | null;
  path: string | null;
  status: number | null;
  message: string | null;
  event: string | null;
  errorName: string | null;
  fingerprint: string | null;
  routePath: string | null;
  job: string | null;
  digest: string | null;
  requestId: string | null;
  redacted: boolean;
};

export type TailResult =
  | { ok: true; rows: TailRowView[]; summary: TailSummary; deployment: string }
  | {
      ok: false;
      reason: 'unconfigured' | 'not-on-vercel' | 'failed';
      status?: number;
      errorName?: string;
    };

const isAbort = (error: unknown) =>
  error instanceof Error && error.name === 'AbortError';

export async function tailRuntimeLogs(): Promise<TailResult> {
  await requireArea('monitoring', '/admin');
  const token = process.env.VERCEL_API_TOKEN;
  const project = process.env.VERCEL_PROJECT_ID;
  const deployment = process.env.VERCEL_DEPLOYMENT_ID;
  if (!token) return { ok: false, reason: 'unconfigured' };
  if (!project || !deployment) return { ok: false, reason: 'not-on-vercel' };

  const tz = await viewerZone();
  const stamp = zonedFormat(tz, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const rows: SafeLogRow[] = [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TAIL_SECONDS * 1000);
  const url = `https://api.vercel.com/v1/projects/${encodeURIComponent(project)}/deployments/${encodeURIComponent(deployment)}/runtime-logs?slug=${encodeURIComponent(VERCEL_TEAM_SLUG)}`;

  const finish = (): TailResult => ({
    ok: true,
    rows: rows.map((row) => ({
      at: row.at.toISOString(),
      atLabel: stamp.format(row.at),
      level: row.level,
      source: row.source,
      method: row.method,
      path: row.path,
      status: row.status,
      message: row.message,
      event: row.event,
      errorName: row.errorName,
      fingerprint: row.fingerprint,
      routePath: row.routePath,
      job: row.job,
      digest: row.digest,
      requestId: row.requestId,
      redacted: row.redacted,
    })),
    summary: summarizeTail(rows, TAIL_SECONDS),
    deployment,
  });

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/stream+json' },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok || !res.body) {
      logError('[monitoring] runtime log tail rejected', undefined, {
        event: 'vercel.tail.failed',
        status: res.status,
      });
      return { ok: false, reason: 'failed', status: res.status };
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (rows.length < TAIL_MAX_ROWS) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline = buffer.indexOf('\n');
        while (newline >= 0 && rows.length < TAIL_MAX_ROWS) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (line) {
            const row = parseRuntimeLogLine(line);
            if (row) rows.push(row);
          }
          newline = buffer.indexOf('\n');
        }
      }
      // A stream that ended as one JSON array rather than one object per line.
      if (rows.length === 0 && buffer.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(buffer) as unknown[];
          for (const item of parsed) {
            const row = parseRuntimeLogLine(JSON.stringify(item));
            if (row) rows.push(row);
            if (rows.length >= TAIL_MAX_ROWS) break;
          }
        } catch {
          /* not an array either — nothing parsed, honestly reported as such */
        }
      }
    } catch (error) {
      // The sample window closing mid-read is the normal end of a tail.
      if (!isAbort(error)) throw error;
    } finally {
      clearTimeout(timer);
      reader.cancel().catch(() => {});
    }
    return finish();
  } catch (error) {
    clearTimeout(timer);
    if (isAbort(error)) return finish();
    logError('[monitoring] runtime log tail failed', error, { event: 'vercel.tail.failed' });
    return { ok: false, reason: 'failed', errorName: safeErrorName(error) };
  }
}
