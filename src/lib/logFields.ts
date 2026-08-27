/**
 * Pure helpers for the diagnostic logger: context redaction and error
 * description. No imports at all — deliberately a leaf with no `server-only`
 * guard, the same split activityFields.ts has from activityLog.ts.
 *
 * The reason is identical and load-bearing: this file is a CONFIDENTIALITY
 * CONTROL, and `server-only` throws under plain node, so anything living in
 * log.ts cannot be asserted against by scripts/check-activity-log.mts.
 * Redaction that cannot be tested is redaction nobody should trust.
 */

/**
 * The machine-readable event names a line may carry under `event`, beside its
 * free-text message. Deliberately SMALL: these are the lines an operator
 * searches Vercel's runtime logs for, and the ~110 `'[domain] fn failed'`
 * action messages are not renamed — their message already is their identity,
 * and `reportError` stamps them `action.error.caught` for free.
 *
 * `domain.object.outcome`, lowercase. A typo is a type error, which is the
 * whole reason this is a tuple and not a convention.
 */
export const LOG_EVENTS = [
  'server.error.unhandled',
  'action.error.caught',
  'activity.write.failed',
  'notify.email.failed',
  'notify.push.failed',
  'push.sent',
  'push.vapid.rejected',
  'cron.run.completed',
  'cron.run.failed',
  'cron.step.failed',
  'indexnow.failed',
  'places.fetch.failed',
  'monitoring.write.failed',
  'monitoring.evaluate.failed',
  'monitoring.alert.sent',
  'monitoring.alert.failed',
  'timezone.rejected',
  'auth.signin.failed',
] as const;

export type LogEvent = (typeof LOG_EVENTS)[number];

/** What a log line may carry beyond the message. Scalars only — the same
 *  reasoning as ActivityValue: it makes `{...row}` a type error rather than a
 *  privacy incident. `event` is the one typed key. */
export type LogContext = Record<
  string,
  string | number | boolean | null | undefined
> & { event?: LogEvent };

/** Messages are capped like stacks: a driver error that echoes a whole
 *  request body would otherwise arrive uncut. */
export const MESSAGE_MAX = 1_000;

/**
 * Keys scrubbed before serialization. The audit log's denylist keeps secrets
 * out of Postgres; this one keeps them out of stdout, which is just as
 * durable — Vercel retains runtime logs. Kept separate from
 * activityFields.ts's list because the two answer to different consumers and
 * must be free to diverge.
 */
/**
 * `note` is UNANCHORED on purpose. `\bnote` cannot match `adminNote` or
 * `memberNote` — camelCase has no word boundary before the capital — which is
 * precisely why `admin_note` used to need spelling out. It does NOT match
 * `notification*` (noti- vs note-), so unanchoring costs nothing.
 *
 * A bare `path` is deliberately NOT here: `routePath` is the single most
 * useful field on an error line (instrumentation.ts), and blanking it would
 * cost more than the class buys. Blob capabilities are named specifically.
 */
export const REDACT_RE =
  /pass|hash|token|secret|cookie|\bauth\b|authoriz|credential|apikey|api_key|\bkey\b|dsn|resume|wire|salary|cents|ratemicro|rate_micro|invoice|note|amount|payout|pathname|blobpath|screenshotpath|avatarpath/i;

export const REDACTED = '[redacted]';

/** Stacks are capped before serialization. Vercel's ceiling is 256 KB per
 *  line, but a 60-frame async stack is unreadable long before that and costs
 *  Active CPU to stringify. */
export const STACK_MAX = 4_000;

/**
 * Drizzle wraps EVERY driver error in a `DrizzleQueryError` whose `.message`
 * is literally:
 *
 *     Failed query: select ... where email = $1
 *     params: someone@example.com,42
 *
 * — i.e. every bound parameter, in plain text. That is the applicant's email
 * on a failed contact insert, the salary on a failed payroll write, and the
 * password hash on a failed Better Auth write. A key-based denylist cannot
 * help: the values sit inside a message string, not under a key.
 *
 * Detected by OWN PROPERTIES, not by name — `error.name` is the useless
 * `'Error'`; only `constructor.name` and the `query`/`params` own-props
 * identify it. (Same reason `pgCode` in the action files walks `.cause`
 * instead of reading `.code`.)
 */
export function isDrizzleQueryError(error: Error): boolean {
  return (
    Object.prototype.hasOwnProperty.call(error, 'query') &&
    Object.prototype.hasOwnProperty.call(error, 'params')
  );
}

/** Belt and braces for anything else that formats values after a `params:`
 *  marker — including a stack whose first line is the wrapped message. */
export function stripParams(text: string): string {
  const at = text.indexOf('\nparams:');
  return at === -1 ? text : `${text.slice(0, at)}\nparams: ${REDACTED}`;
}

/** Apply the key denylist across a context object. */
export function scrubContext(context?: LogContext): LogContext {
  const out: LogContext = {};
  if (!context) return out;
  for (const [key, value] of Object.entries(context)) {
    if (value === undefined) continue;
    out[key] = REDACT_RE.test(key) ? REDACTED : value;
  }
  return out;
}

/**
 * Pull an unknown thrown value onto named, greppable, SAFE fields.
 *
 * For a Drizzle query error the parameterised SQL is KEPT — `where email = $1`
 * is the useful half for debugging and carries no values — while `params` is
 * dropped and the real driver message is recovered from `.cause`.
 */
export function describeError(error: unknown): LogContext {
  const out: LogContext = {};
  if (error instanceof Error) {
    const cause = error.cause instanceof Error ? error.cause : undefined;

    if (isDrizzleQueryError(error)) {
      out.errorName = error.constructor?.name ?? 'DrizzleQueryError';
      // The driver's own message ("duplicate key value violates ...") is the
      // diagnostic; the wrapper's message is the parameter leak.
      out.errorMessage = (cause?.message ?? 'query failed').slice(0, MESSAGE_MAX);
      const query = (error as { query?: unknown }).query;
      if (typeof query === 'string') out.query = query.slice(0, 1_000);
      out.stack = stripParams(cause?.stack ?? error.stack ?? '').slice(
        0,
        STACK_MAX,
      );
    } else {
      out.errorName = error.name;
      out.errorMessage = stripParams(error.message).slice(0, MESSAGE_MAX);
      out.stack = stripParams(error.stack ?? '').slice(0, STACK_MAX);
      if (cause) out.causeMessage = stripParams(cause.message).slice(0, MESSAGE_MAX);
    }

    const digest = (error as { digest?: unknown }).digest;
    if (typeof digest === 'string') out.digest = digest;
  } else if (error !== undefined) {
    out.errorMessage = stripParams(String(error)).slice(0, MESSAGE_MAX);
  }
  return out;
}
