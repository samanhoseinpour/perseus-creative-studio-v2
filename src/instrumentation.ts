import type { Instrumentation } from 'next';

/**
 * The server-error seam. Next.js calls onRequestError for EVERY server-side
 * throw — `routeType: 'action'` for server actions, `'route'` for route
 * handlers, `'render'` for React Server Components, `'proxy'` for proxy.ts —
 * which is the whole mutation surface of this app in one hook.
 *
 * This closes a gap that was previously invisible rather than merely noisy:
 * an error thrown after the RSC stream has begun is logged by the platform
 * with a 200 status, so scanning Vercel's logs for 5xx never found it.
 *
 * DECIDED 2026-08-19: no third-party error tracker. Errors go to stdout as
 * structured JSON and Vercel keeps them for 1 day on this account's Pro plan.
 * The deciding factor was bundle cost: on Turbopack the browser SDKs cannot be
 * tree-shaken (Sentry's `bundleSizeOptimizations` and `webpack.treeshake` are
 * webpack-only, verified by byte-identical Turbopack builds), so the realistic
 * floor is 50–80 KB gz — most of what the 2026-07 chunk work removed.
 *
 * ADDED 2026-08-27: beside the stdout line, every throw is also COUNTED —
 * `recordError` upserts a five-minute bucket keyed by a fingerprint of the
 * error's class, the route pattern and a code from a closed grammar. That is
 * what /admin/monitoring draws its trends and opens its incidents from. The
 * message, the stack and the request never reach that row; see the privacy
 * rule atop src/lib/monitoringFields.ts. The stack still goes to stdout.
 *
 * If a tracker is ever revisited, this file is still the ONLY thing that
 * changes: a server-only install is `init()` in register() plus one capture
 * call below, and it measures zero client JS.
 *
 * NOT registering @vercel/otel here either. It conflicts with tracker-side
 * OpenTelemetry setup, and this is one app with one function per request — a
 * trace of a single span is a log line with more machinery. Production traces
 * would also need a paid Trace Drain to be visible at all.
 */

/**
 * Errors that are noise, not defects.
 *
 * A client that navigates away mid-stream aborts the RSC response, and Next
 * reports that abort through this hook (vercel/next.js#96704). It is the user
 * closing a tab. Left unfiltered it would be the most frequent "error" the
 * app produces and would drown the real ones.
 */
const IGNORED = [
  'The destination stream closed early',
  'aborted',
  'ECONNRESET',
];

function isIgnorable(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? '');
  return IGNORED.some((needle) => message.includes(needle));
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (isIgnorable(error)) return;

  // Imported lazily so this module stays free of `server-only` at the top
  // level — instrumentation is evaluated by the build for every runtime it
  // could target, even though this app declares no edge runtime anywhere.
  const [{ logError }, { fingerprintFor, normalizeRoutePath, safeErrorName, errorCode }] =
    await Promise.all([import('@/lib/log'), import('@/lib/monitoringFields')]);

  // request.headers here is a plain record, and a repeated header arrives as
  // an array — normalise rather than stringify an array into the field.
  const requestId = Array.isArray(request.headers['x-vercel-id'])
    ? request.headers['x-vercel-id'][0]
    : request.headers['x-vercel-id'];
  const routePath = normalizeRoutePath(context.routePath);
  const errorName = safeErrorName(error);
  const code = errorCode(error);

  logError('unhandled server error', error, {
    event: 'server.error.unhandled',
    // The three fields that make a line actionable: WHAT kind of code threw,
    // WHICH route, and the digest the user was shown on screen.
    routeType: context.routeType,
    routePath: context.routePath,
    routerKind: context.routerKind,
    renderSource: context.renderSource,
    revalidateReason: context.revalidateReason,
    method: request.method,
    // Vercel's per-request id — the join key to that request's other log
    // lines and to any activity_log row written during it.
    requestId,
    // The same group key /admin/monitoring files this under, so a line found
    // by grepping stdout maps straight onto its trend and its incident.
    fingerprint: fingerprintFor({
      source: 'request',
      scope: routePath,
      routeType: context.routeType,
      errorName,
      code,
    }),
    // Deliberately NOT request.path for a server action: an action's URL is
    // the page it was invoked from, and query strings on admin routes carry
    // filter values. routePath above is the pattern, which is what's useful.
  });

  // Count it. Next AWAITS this hook only for route handlers; for a render or
  // an action error the promise is handed to React's onError and dropped, so
  // an awaited write here is not guaranteed to flush before the function
  // freezes. `after()` is tried first — the hook runs inside the request's
  // async-local scope, so it usually has a request to defer into — and the
  // awaited, timeout-bounded write is the fallback when it does not. The
  // record can never throw (its own failure is one stdout line), so nothing
  // below can turn an error report into a second error.
  const { recordError } = await import('@/lib/monitoringRecord');
  const input = {
    source: 'request' as const,
    scope: context.routePath,
    routeType: context.routeType,
    error,
    requestId: requestId ?? null,
  };
  try {
    const { after } = await import('next/server');
    after(() => recordError(input));
  } catch {
    await recordError(input);
  }
};

/**
 * Runs once per server instance, before the first request is served.
 * Intentionally empty: nothing needs per-instance init today. Declared rather
 * than omitted so that adding something later is an edit, not a new file.
 */
export async function register(): Promise<void> {}
