import 'server-only';
import { after } from 'next/server';
import { headers } from 'next/headers';

import { db } from '@/db';
import { upsertErrorBucket } from '@/db/monitoringStatements';
import { logError, type LogContext } from '@/lib/log';
import {
  RECORD_TIMEOUT_MS,
  buildErrorBucketRow,
  messageKey,
  type MonitoringComponent,
  type MonitoringSource,
} from '@/lib/monitoringFields';

/**
 * The one door through which an error becomes a monitoring SIGNAL — a
 * counter in `monitoring_error_buckets` — beside the stdout line it already
 * produces. Two entry points:
 *
 *  - `recordError` for the seams that already log richly (instrumentation,
 *    notify, push, the cron wrapper): a bounded upsert, awaited, with a
 *    timeout, and NEVER a throw.
 *  - `reportError` for the ~110 caught action failures: `logError` with the
 *    same three arguments (the stdout line is byte-identical to before, plus
 *    an `event`), then the signal scheduled behind the response.
 *
 * ── WHAT CANNOT GET IN ──────────────────────────────────────────────────────
 *
 * `recordError` takes no free-form context. That is the point: `notify.ts`
 * passes `{ recipient: email }` to `logError` on purpose (stdout, where the
 * address is the value of the line), and a `{ ...context }` spread here would
 * have put it in a column. The row is built by `buildErrorBucketRow`, which
 * reads an error's class name, a code from a closed grammar and Next's opaque
 * digest, and nothing else — see the privacy rule atop monitoringFields.ts.
 *
 * ── WHY IT CANNOT RECURSE ───────────────────────────────────────────────────
 *
 * Its own failure goes to `logError`, which is pure stdout and never calls
 * back into this module. `reportError` is the only function that calls both,
 * and it calls them in one direction. So a database outage produces one
 * `monitoring.write.failed` line per failed request and no loop.
 */

export type RecordErrorInput = {
  source: MonitoringSource;
  /** Route pattern, message key, component or job — by source. */
  scope: unknown;
  error: unknown;
  routeType?: unknown;
  component?: MonitoringComponent | null;
  /** Pass when the caller already holds it (instrumentation); otherwise read
   *  from the request headers when there is a request. */
  requestId?: string | null;
};

const environment = () =>
  process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development';

async function requestIdFromHeaders(): Promise<string | null> {
  try {
    return (await headers()).get('x-vercel-id');
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
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

/** Record one occurrence. Awaited by callers that can wait; never throws. */
export async function recordError(input: RecordErrorInput): Promise<void> {
  try {
    const requestId = input.requestId ?? (await requestIdFromHeaders());
    const row = buildErrorBucketRow({
      source: input.source,
      scope: input.scope,
      error: input.error,
      routeType: input.routeType,
      component: input.component ?? null,
      environment: environment(),
      deployment: process.env.VERCEL_DEPLOYMENT_ID,
      requestId,
    });
    await withTimeout(upsertErrorBucket(db, row), RECORD_TIMEOUT_MS);
  } catch (error) {
    logError('[monitoring] signal write failed', error, {
      event: 'monitoring.write.failed',
    });
  }
}

/**
 * Queue a record behind the response — `after()` when there is a request
 * scope to defer into, fire-and-forget when there is not (the
 * activityLog.write() shape: Better Auth hooks and the odd cron step run
 * outside one, and a signal must never turn into a throw).
 */
export function scheduleRecord(input: RecordErrorInput): void {
  try {
    after(() => recordError(input));
  } catch {
    void recordError(input);
  }
}

/**
 * The drop-in for `logError` at a caught action failure: same signature, same
 * stdout line (plus `event: 'action.error.caught'`), plus a signal keyed by the
 * message literal. `context` reaches stdout only.
 */
export function reportError(
  message: string,
  error: unknown,
  context?: LogContext,
): void {
  logError(message, error, {
    ...context,
    event: context?.event ?? 'action.error.caught',
  });
  scheduleRecord({ source: 'action', scope: messageKey(message), error });
}

/** A dependency failed while being used (a send, an upload, a ping). */
export function recordDependencyFailure(
  component: MonitoringComponent,
  error: unknown,
): void {
  scheduleRecord({ source: 'dependency', scope: component, component, error });
}
