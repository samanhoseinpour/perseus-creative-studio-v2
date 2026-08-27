import 'server-only';

import {
  RECENT_LOGS_MAX_PAGES,
  RECENT_LOGS_MAX_ROWS,
  RECENT_LOGS_MINUTES,
  RECENT_LOGS_TIMEOUT_MS,
  REQUEST_COUNTS_TIMEOUT_MS,
  foldRequestCounts,
  newestRequestRows,
  parseRequestLogAnswer,
  requestCountsQuery,
  requestLogsUrl,
  safeErrorName,
  type RequestDayCounts,
  type SafeRequestRow,
} from '@/lib/monitoringFields';

/**
 * The one door to Vercel's own API — the only module that spends
 * VERCEL_API_TOKEN (server-only, Production env, never NEXT_PUBLIC_*). It must
 * be a token scoped to the TEAM ("All Projects" at vercel.com/account/tokens):
 * one narrowed to a single project reads that project and its deployments but
 * has no user behind it, and both reads below refuse it — `Observability Data
 * not found` (404) on the query, 403 on the request log — while the
 * team-scoped one gets 200 on both (both verified 2026-08-27; the `vcp_`
 * prefix is shared, so it tells you nothing). Two callers, two shapes of
 * answer:
 *
 *  - the "Recent on Vercel" panel asks for the last few minutes of the
 *    request log, on a click — `fetchRecentRequestLogs`, which RETURNS a
 *    result, because the panel has copy for each way it can fail;
 *  - the scheduled evaluator pass asks for request counts by status —
 *    `fetchRequestCounts`, which THROWS, because the evaluator's `step()`
 *    already turns a throw into a named failed step.
 *
 * Both are bounded, both parse through the leaf's allowlists and folds
 * (src/lib/monitoringFields.ts), and neither logs — the caller decides what
 * a failure means. Nothing that comes back is stored, except the per-day
 * request COUNTS the evaluator sets on `monitoring_daily`.
 *
 * Why two endpoints and why these: the documented runtime-logs STREAM never
 * answers for this project, the CLI's windowed request-log query does, and
 * the observability query is documented — see the leaf's two section
 * comments for the evidence and the dates.
 */

export class VercelApiError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`Vercel replied ${status}`);
    this.name = 'VercelApiError';
    this.status = status;
  }
}

/** The reply parsed, but not into a shape we read whole. */
export class VercelAnswerError extends Error {
  constructor(what: string) {
    super(what);
    this.name = 'VercelAnswerError';
  }
}

const isAbort = (error: unknown) => error instanceof Error && error.name === 'AbortError';

const baseHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
});

export type RecentLogsFetch =
  | { ok: true; rows: SafeRequestRow[]; truncated: boolean; from: Date; to: Date }
  | {
      ok: false;
      /** `silent`: no response — not even headers — inside the bound. Kept
       *  apart from an empty window on purpose: an unanswered connection is
       *  not a reading of the site. `timeout`: Vercel answered but did not
       *  finish inside the bound and nothing had been parsed yet; when a
       *  page HAD been parsed, that page is returned as a truncated window
       *  instead. `failed` is an HTTP rejection or an unreadable answer. */
      reason: 'silent' | 'timeout' | 'failed';
      status?: number;
      errorName?: string;
    };

/** The last RECENT_LOGS_MINUTES of one deployment's request log, newest
 *  first, capped — through the query `vercel logs` itself sends. */
export async function fetchRecentRequestLogs({
  token,
  projectId,
  deploymentId,
  now,
}: {
  token: string;
  projectId: string;
  deploymentId: string;
  now: Date;
}): Promise<RecentLogsFetch> {
  const to = now;
  const from = new Date(now.getTime() - RECENT_LOGS_MINUTES * 60_000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RECENT_LOGS_TIMEOUT_MS);
  let answered = false;
  const rows: SafeRequestRow[] = [];
  let hasMore = false;
  try {
    for (let page = 0; page < RECENT_LOGS_MAX_PAGES; page += 1) {
      const res = await fetch(requestLogsUrl({ projectId, deploymentId, since: from, until: to, page }), {
        headers: baseHeaders(token),
        signal: controller.signal,
        cache: 'no-store',
      });
      answered = true;
      if (!res.ok) return { ok: false, reason: 'failed', status: res.status };
      const parsed = parseRequestLogAnswer(await res.json());
      if (!parsed) return { ok: false, reason: 'failed', errorName: 'VercelAnswerError' };
      rows.push(...parsed.rows);
      hasMore = parsed.hasMore;
      if (!hasMore || rows.length >= RECENT_LOGS_MAX_ROWS) break;
    }
    const newest = newestRequestRows(rows, RECENT_LOGS_MAX_ROWS);
    return { ok: true, rows: newest.rows, truncated: newest.truncated || hasMore, from, to };
  } catch (error) {
    if (isAbort(error)) {
      if (rows.length > 0) {
        const newest = newestRequestRows(rows, RECENT_LOGS_MAX_ROWS);
        return { ok: true, rows: newest.rows, truncated: true, from, to };
      }
      return { ok: false, reason: answered ? 'timeout' : 'silent' };
    }
    return { ok: false, reason: 'failed', errorName: safeErrorName(error) };
  } finally {
    clearTimeout(timer);
  }
}

/** Yesterday's and today's production responses by outcome, from Vercel's
 *  own counts. Throws on any failure — see the header. */
export async function fetchRequestCounts({
  token,
  projectId,
  now,
}: {
  token: string;
  projectId: string;
  now: Date;
}): Promise<RequestDayCounts[]> {
  const { url, body, days } = requestCountsQuery({ projectId, now });
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...baseHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_COUNTS_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!res.ok) throw new VercelApiError(res.status);
  const folded = foldRequestCounts(await res.json(), days);
  if (!folded) throw new VercelAnswerError('request counts did not fold whole');
  return folded;
}
