import 'server-only';

import {
  describeError,
  scrubContext,
  type LogContext,
} from '@/lib/logFields';

/**
 * Structured server logging. ZERO dependencies, deliberately.
 *
 * Not pino, not winston. Both route through worker-thread transports, which
 * is the exact machinery that has repeatedly broken Next builds — Turbopack
 * cannot statically trace pino's dynamic requires (vercel/next.js#86099), and
 * the documented workarounds did not resolve it for Vercel deployments.
 * Vercel's own guidance for Functions is to write JSON to stdout, which is
 * what this does. It also works in every runtime and adds nothing to any
 * client bundle.
 *
 * TWO RULES, both load-bearing:
 *
 * 1. STATELESS. No module-level mutable state, no shared buffer, no logger
 *    instance holding request context. Fluid Compute reuses one function
 *    instance across CONCURRENT requests, so anything held at module scope
 *    leaks between them — one visitor's context attached to another's log.
 *
 * 2. NEVER console.warn. Vercel derives the level from the stream, and
 *    console.warn maps to `warning` on a streaming function but to `error` on
 *    a non-streaming one. Alerting built on that either pages you over
 *    nothing or hides real errors. Only log() and logError() exist here.
 *
 * Redaction and error description live in @/lib/logFields (a pure leaf, so
 * they are testable — see scripts/check-activity-log.mts).
 */

export type { LogContext };

type Level = 'info' | 'error';

function line(level: Level, message: string, context?: LogContext): string {
  return JSON.stringify({
    level,
    message,
    // Vercel stamps its own timestamp, but a log shipped anywhere else (or
    // read from a local `next start`) needs one of its own.
    time: new Date().toISOString(),
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    // The build that emitted the line. Vercel's system env vars, read per
    // call rather than cached at module scope (the stateless rule), and
    // omitted rather than blank when absent (a local `next start`). This is
    // what lets an error spike be attributed to a deploy — and what the
    // monitoring page prints beside a fingerprint's first sighting.
    ...(process.env.VERCEL_DEPLOYMENT_ID
      ? { deployment: process.env.VERCEL_DEPLOYMENT_ID.slice(0, 40) }
      : {}),
    ...(process.env.VERCEL_GIT_COMMIT_SHA
      ? { commit: process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7) }
      : {}),
    ...(process.env.VERCEL_REGION ? { region: process.env.VERCEL_REGION } : {}),
    ...scrubContext(context),
  });
}

/** Informational. Goes to stdout, which Vercel reads as level `info`. */
export function log(message: string, context?: LogContext): void {
  console.log(line('info', message, context));
}

/**
 * A failure. Goes to stderr (level `error`), with the error's name, message
 * and stack pulled onto named fields so they stay greppable after the object
 * has been serialized.
 *
 * `digest` is included when present: it is the id ErrorStateComp renders to
 * the user, which makes the code on their screen the search key for this line.
 */
export function logError(
  message: string,
  error: unknown,
  context?: LogContext,
): void {
  console.error(
    line('error', message, { ...context, ...describeError(error) }),
  );
}
