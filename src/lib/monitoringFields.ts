/**
 * The monitoring vocabulary and every PURE decision behind /admin/monitoring:
 * what a signal may carry, how an error is fingerprinted, how a cron's
 * lateness is judged, when an incident opens and closes, and what the page's
 * overall status is.
 *
 * A zero-dependency leaf with NO `server-only` guard — the taskPredicates.ts /
 * spendFields.ts split — so scripts/check-monitoring.mts can pin every rule
 * under plain node. It is a server + scripts module: nothing here is imported
 * by a client component, and nothing here touches the database, the network
 * or the clock (every function takes `now`).
 *
 * ── THE PRIVACY RULE ─────────────────────────────────────────────────────────
 *
 * Monitoring stores COUNTERS, CONTROLLED DIMENSIONS and FINGERPRINTS, never
 * diagnostics. An error's message, stack, bound parameters, request body,
 * headers and concrete URL are structurally not inputs to anything below:
 * `buildErrorBucketRow` reads an error's NAME (a class identifier), a CODE that
 * has to match a closed grammar (a SQLSTATE, a Node `E…` code, an HTTP status)
 * and Next's opaque `digest`, and nothing else. The stack trace stays where it
 * already goes — stdout, via src/lib/log.ts — and Vercel keeps it for a day.
 * Hashing a message would not make storing it acceptable, so the message is not
 * hashed either: `fingerprintFor` takes the same closed set of dimensions.
 *
 * ── WHY EVERY THRESHOLD LIVES HERE ───────────────────────────────────────────
 *
 * A dashboard that spreads "5 in 15 minutes" across three components drifts
 * the first time one of them is tuned. Every number an operator might want to
 * change is a named constant in this file, and the check script asserts the
 * behaviour at each boundary rather than the literal, so tuning is one edit.
 */

/* -------------------------------------------------------------------------- */
/* Vocabulary                                                                 */
/* -------------------------------------------------------------------------- */

/** Where a recorded error came from. Mirrors the `monitoring_source` enum. */
export const MONITORING_SOURCES = [
  'request',
  'action',
  'dependency',
  'cron',
] as const;
export type MonitoringSource = (typeof MONITORING_SOURCES)[number];

/** Next 16's `onRequestError` route types, `proxy` included. */
export const ROUTE_TYPES = ['render', 'route', 'action', 'proxy'] as const;
export type RouteType = (typeof ROUTE_TYPES)[number];

export function isRouteType(value: unknown): value is RouteType {
  return (
    typeof value === 'string' && (ROUTE_TYPES as readonly string[]).includes(value)
  );
}

/** A check's last outcome. `unknown` is "we could not tell" — never green. */
export const CHECK_STATUSES = ['ok', 'failed', 'unknown', 'unconfigured'] as const;
export type CheckStatus = (typeof CHECK_STATUSES)[number];

export const INCIDENT_KINDS = ['error_burst', 'dependency', 'cron'] as const;
export type IncidentKind = (typeof INCIDENT_KINDS)[number];

export const SEVERITIES = ['info', 'warning', 'critical'] as const;
export type Severity = (typeof SEVERITIES)[number];

const SEVERITY_RANK: Record<Severity, number> = { info: 0, warning: 1, critical: 2 };

export function maxSeverity(a: Severity, b: Severity): Severity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

export function severityAbove(a: Severity, b: Severity): boolean {
  return SEVERITY_RANK[a] > SEVERITY_RANK[b];
}

export const INCIDENT_STATUSES = ['open', 'resolved'] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

/** The page's headline. Derived — never "the query worked, so green". */
export const OVERALL_STATUSES = ['healthy', 'degraded', 'incident', 'unknown'] as const;
export type OverallStatus = (typeof OVERALL_STATUSES)[number];

export const ENVIRONMENTS = ['production', 'preview', 'development'] as const;
export type MonitoringEnvironment = (typeof ENVIRONMENTS)[number];

export function safeEnvironment(value: unknown): MonitoringEnvironment {
  return typeof value === 'string' &&
    (ENVIRONMENTS as readonly string[]).includes(value)
    ? (value as MonitoringEnvironment)
    : 'development';
}

/**
 * Every component a signal may be filed under. The probed dependencies are the
 * first six; `blob` is the classification of a Blob error whose store cannot
 * be told from the error alone; `monitoring-alert` is where the evaluator's
 * OWN send failures go, and no rule reads it — that is the recursion guard: an
 * email outage must not be re-reported by the email that reports it. `vercel`
 * is Vercel's own API, which the scheduled pass asks for request counts: a
 * failure there is counted in the buckets and surfaces as the pass's failed
 * step and on the Requests row ("the count failed N times in the last hour"),
 * and no rule reads it either — the monitor losing its counts is not the site
 * being down.
 */
export const MONITORING_COMPONENTS = [
  'database',
  'auth-database',
  'blob-private',
  'blob-public',
  'blob',
  'email',
  'push',
  'auth',
  'indexnow',
  'places',
  'monitoring-alert',
  'vercel',
] as const;
export type MonitoringComponent = (typeof MONITORING_COMPONENTS)[number];

export function isMonitoringComponent(value: unknown): value is MonitoringComponent {
  return (
    typeof value === 'string' &&
    (MONITORING_COMPONENTS as readonly string[]).includes(value)
  );
}

export const COMPONENT_LABELS: Record<MonitoringComponent, string> = {
  database: 'Database',
  'auth-database': 'Database (sign-in pool)',
  'blob-private': 'Files (private store)',
  'blob-public': 'Files (public store)',
  blob: 'Files',
  email: 'Email',
  push: 'Notifications',
  auth: 'Sign-in',
  indexnow: 'IndexNow',
  places: 'Google reviews',
  'monitoring-alert': 'Monitoring alerts',
  vercel: 'Vercel API',
};

/**
 * The dependencies the evaluator PROBES, in display order. `observed` names
 * the bucket components whose recorded failures count against this check —
 * a Blob error cannot say which store it came from, so both file checks read
 * the one `blob` classification. `critical` decides the severity of a failing
 * probe: the database down is an incident, a file store down is degradation.
 */
export type DependencyCheckSpec = {
  component: MonitoringComponent;
  label: string;
  hint: string;
  critical: boolean;
  observed: readonly MonitoringComponent[];
};

export const DEPENDENCY_CHECKS = [
  {
    component: 'database',
    label: 'Database',
    hint: 'Neon over HTTP, behind every page and every action',
    critical: true,
    observed: ['database'],
  },
  {
    component: 'auth-database',
    label: 'Database (sign-in pool)',
    hint: 'The pooled connection Better Auth signs people in through',
    critical: true,
    observed: [],
  },
  {
    component: 'blob-private',
    label: 'Files (private store)',
    hint: 'Résumés, avatars and ticket screenshots',
    critical: false,
    observed: ['blob'],
  },
  {
    component: 'blob-public',
    label: 'Files (public store)',
    hint: 'Client logos and project media',
    critical: false,
    observed: ['blob'],
  },
  {
    component: 'email',
    label: 'Email',
    hint: 'Resend, for every notification and password reset',
    critical: false,
    observed: ['email'],
  },
  {
    component: 'push',
    label: 'Notifications',
    hint: 'Web Push to installed dashboards',
    critical: false,
    observed: ['push'],
  },
] as const satisfies readonly DependencyCheckSpec[];

export type DependencyComponent = (typeof DEPENDENCY_CHECKS)[number]['component'];

export function isDependencyComponent(value: unknown): value is DependencyComponent {
  return DEPENDENCY_CHECKS.some((c) => c.component === value);
}

/* -------------------------------------------------------------------------- */
/* Cron registry + schedule math                                              */
/* -------------------------------------------------------------------------- */

export type CronJobSpec = {
  name: string;
  path: string;
  /** The exact expression in vercel.json — the check script asserts the two match. */
  schedule: string;
  label: string;
  description: string;
};

/**
 * The scheduled jobs, as the monitor knows them. `vercel.json` is the platform's
 * copy and this is the app's; scripts/check-monitoring.mts refuses to pass
 * while the two differ, so a job added to one and not the other is caught
 * before it can be reported as "never ran" or silently not watched at all.
 */
export const CRON_JOBS = [
  {
    name: 'weekly-digest',
    path: '/api/cron/weekly-digest',
    schedule: '0 15 * * 1',
    label: 'Weekly digest',
    description: 'Monday email of last week’s delivered work',
  },
  {
    name: 'recurring-tasks',
    path: '/api/cron/recurring-tasks',
    schedule: '0 14 * * *',
    label: 'Recurring tasks',
    description: 'Mints today’s tasks from templates; sweeps the activity log and dead sessions',
  },
  {
    name: 'due-reminders',
    path: '/api/cron/due-reminders',
    schedule: '0 15 * * *',
    label: 'Due reminders',
    description: 'One email per member with overdue or due-today work',
  },
  {
    name: 'payroll-nudge',
    path: '/api/cron/payroll-nudge',
    schedule: '0 16 * * *',
    label: 'Payroll nudge',
    description: 'Chases payments nobody has confirmed receiving',
  },
  {
    name: 'monitoring',
    path: '/api/cron/monitoring',
    schedule: '*/15 * * * *',
    label: 'Monitoring',
    description: 'Probes the dependencies, evaluates incidents, sends alerts',
  },
  {
    // Shares the monitoring slot deliberately. `parseCronSchedule` has no
    // offset form, so `*/15` cannot be staggered off `*/15` without a fifth
    // shape, and this database scales to zero: the monitoring probe has
    // already woken it at exactly that minute, so a staggered blog job would
    // be a second wake every hour for no benefit.
    name: 'blog-publish',
    path: '/api/cron/blog-publish',
    schedule: '*/15 * * * *',
    label: 'Scheduled posts',
    description: 'Publishes blog posts whose scheduled time has come',
  },
] as const satisfies readonly CronJobSpec[];

export type CronJobName = (typeof CRON_JOBS)[number]['name'];

export function isCronJobName(value: unknown): value is CronJobName {
  return CRON_JOBS.some((job) => job.name === value);
}

export function cronJob(name: CronJobName): (typeof CRON_JOBS)[number] {
  return CRON_JOBS.find((job) => job.name === name)!;
}

/** The `monitoring_checks` row key for a job. */
export const cronComponent = (name: CronJobName) => `cron:${name}` as const;

/** How late a run may be before it counts as missed. Pro crons fire within the
 *  minute, so this is generous on purpose: it covers a slow cold start and the
 *  occasional best-effort delivery Vercel documents, without hiding a job that
 *  genuinely did not fire. */
export const CRON_GRACE_MS = 30 * 60_000;

/**
 * The four shapes vercel.json actually uses. Anything else THROWS rather than
 * degrading: a schedule this parser cannot read would otherwise be judged with
 * the wrong period, and "the weekly digest is 6 days late" is exactly the false
 * alarm the brief forbids. The check script runs every registered schedule
 * through this, so an unsupported one fails at review time, not at 3am.
 */
export type CronSchedule =
  | { kind: 'every'; minutes: number }
  | { kind: 'hourly'; minute: number }
  | { kind: 'daily'; hour: number; minute: number }
  | { kind: 'weekly'; weekday: number; hour: number; minute: number };

export function parseCronSchedule(expression: string): CronSchedule {
  const parts = expression.trim().split(/\s+/);
  const fail = () => new Error(`Unsupported cron expression: ${expression}`);
  if (parts.length !== 5) throw fail();
  const [m, h, dom, mon, dow] = parts;
  if (dom !== '*' || mon !== '*') throw fail();

  const every = /^\*\/(\d{1,2})$/.exec(m);
  if (every) {
    const minutes = Number(every[1]);
    // `*/N` restarts at :00 every hour, so a divisor of 60 is the only shape
    // whose period is actually constant.
    if (h !== '*' || dow !== '*' || minutes < 1 || 60 % minutes !== 0) throw fail();
    return { kind: 'every', minutes };
  }
  if (!/^\d{1,2}$/.test(m)) throw fail();
  const minute = Number(m);
  if (minute > 59) throw fail();
  if (h === '*') {
    if (dow !== '*') throw fail();
    return { kind: 'hourly', minute };
  }
  if (!/^\d{1,2}$/.test(h)) throw fail();
  const hour = Number(h);
  if (hour > 23) throw fail();
  if (dow === '*') return { kind: 'daily', hour, minute };
  if (!/^[0-7]$/.test(dow)) throw fail();
  return { kind: 'weekly', weekday: Number(dow) % 7, hour, minute };
}

export function schedulePeriodMs(schedule: CronSchedule): number {
  switch (schedule.kind) {
    case 'every':
      return schedule.minutes * 60_000;
    case 'hourly':
      return 3_600_000;
    case 'daily':
      return 86_400_000;
    case 'weekly':
      return 7 * 86_400_000;
  }
}

/** The most recent scheduled instant at or before `now`. UTC throughout —
 *  Vercel evaluates cron expressions in UTC, and UTC has no DST to fold. */
export function previousRun(schedule: CronSchedule, now: Date): Date {
  const at = new Date(now.getTime());
  at.setUTCSeconds(0, 0);
  switch (schedule.kind) {
    case 'every': {
      const minute = at.getUTCMinutes();
      at.setUTCMinutes(minute - (minute % schedule.minutes));
      return at;
    }
    case 'hourly': {
      at.setUTCMinutes(schedule.minute);
      if (at.getTime() > now.getTime()) at.setUTCHours(at.getUTCHours() - 1);
      return at;
    }
    case 'daily': {
      at.setUTCHours(schedule.hour, schedule.minute);
      if (at.getTime() > now.getTime()) at.setUTCDate(at.getUTCDate() - 1);
      return at;
    }
    case 'weekly': {
      at.setUTCHours(schedule.hour, schedule.minute);
      const back = (at.getUTCDay() - schedule.weekday + 7) % 7;
      at.setUTCDate(at.getUTCDate() - back);
      if (at.getTime() > now.getTime()) at.setUTCDate(at.getUTCDate() - 7);
      return at;
    }
  }
}

/** The first scheduled instant strictly after `now`. */
export function nextRun(schedule: CronSchedule, now: Date): Date {
  return new Date(previousRun(schedule, now).getTime() + schedulePeriodMs(schedule));
}

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const two = (n: number) => String(n).padStart(2, '0');

/** Human schedule, always saying UTC: the studio spans two zones and the cron
 *  fires in neither of them. */
export function describeSchedule(schedule: CronSchedule): string {
  switch (schedule.kind) {
    case 'every':
      return `Every ${schedule.minutes} minutes`;
    case 'hourly':
      return `Hourly at :${two(schedule.minute)}`;
    case 'daily':
      return `Daily at ${two(schedule.hour)}:${two(schedule.minute)} UTC`;
    case 'weekly':
      return `${WEEKDAY_NAMES[schedule.weekday]}s at ${two(schedule.hour)}:${two(schedule.minute)} UTC`;
  }
}

export type CronHealthState = 'ok' | 'failed' | 'missed' | 'pending';

export type CronHealth = {
  state: CronHealthState;
  /** null when the state is not incident-worthy. */
  severity: Severity | null;
  /** The slot the job was last due to run. */
  expectedAt: Date;
  nextAt: Date;
  /** How many due slots have passed since it last ran (0 unless missed). */
  missedRuns: number;
};

/**
 * Whether a job is on time, judged against ITS OWN schedule: a weekly job is
 * missed when its Monday slot passed without a run, a 15-minute job when a
 * quarter-hour did — never one threshold for all of them.
 *
 * A job that has never run is `pending` until the first slot AFTER the monitor
 * first knew about it (`firstSeenAt`) has passed plus grace, then `missed`. That
 * is what stops a freshly deployed job reading as broken for a day, and what
 * catches a job whose path is wrong and has genuinely never fired.
 */
export function cronHealth({
  schedule,
  lastRunAt,
  lastStatus,
  consecutiveFailures,
  firstSeenAt,
  now,
}: {
  schedule: CronSchedule;
  lastRunAt: Date | null;
  lastStatus: CheckStatus | null;
  consecutiveFailures: number;
  firstSeenAt: Date | null;
  now: Date;
}): CronHealth {
  const nextAt = nextRun(schedule, now);
  const period = schedulePeriodMs(schedule);

  // The slot the job was due at after it last ran (or after the monitor first
  // saw it). Judged from THERE, not from the latest slot: a 15-minute job that
  // skipped three quarter-hours must not read as on time because the newest
  // slot is still inside its grace.
  const anchor = lastRunAt ?? firstSeenAt;
  if (!anchor) {
    return {
      state: 'pending',
      severity: null,
      expectedAt: previousRun(schedule, now),
      nextAt,
      missedRuns: 0,
    };
  }
  const dueAfterAnchor = nextRun(schedule, anchor);
  const overdueBy = now.getTime() - CRON_GRACE_MS - dueAfterAnchor.getTime();
  if (overdueBy >= 0) {
    const missedRuns = 1 + Math.floor(overdueBy / period);
    return {
      state: 'missed',
      severity: missedRuns >= 2 ? 'critical' : 'warning',
      expectedAt: dueAfterAnchor,
      nextAt,
      missedRuns,
    };
  }
  const expectedAt = previousRun(schedule, now);
  if (lastRunAt === null) {
    return { state: 'pending', severity: null, expectedAt, nextAt, missedRuns: 0 };
  }
  if (lastStatus === 'failed') {
    return {
      state: 'failed',
      severity: consecutiveFailures >= 2 ? 'critical' : 'warning',
      expectedAt,
      nextAt,
      missedRuns: 0,
    };
  }
  return { state: 'ok', severity: null, expectedAt, nextAt, missedRuns: 0 };
}

/* -------------------------------------------------------------------------- */
/* Buckets, ranges, series                                                    */
/* -------------------------------------------------------------------------- */

/** Fixed five-minute UTC buckets. A burst of a thousand identical errors is one
 *  row with `count = 1000`, and a 30-day chart re-buckets server-side. */
export const BUCKET_MINUTES = 5;
const BUCKET_MS = BUCKET_MINUTES * 60_000;

/** Retention. Buckets are metrics; resolved incidents are history. */
export const BUCKET_RETENTION_DAYS = 30;
export const INCIDENT_RETENTION_DAYS = 90;
export const RETENTION_BATCH = 500;
export const RETENTION_BATCHES_PER_RUN = 4;

export function bucketStartFor(at: Date): Date {
  return new Date(Math.floor(at.getTime() / BUCKET_MS) * BUCKET_MS);
}

export function bucketRetentionCutoff(now: Date): Date {
  return new Date(now.getTime() - BUCKET_RETENTION_DAYS * 86_400_000);
}

export function incidentRetentionCutoff(now: Date): Date {
  return new Date(now.getTime() - INCIDENT_RETENTION_DAYS * 86_400_000);
}

export const MONITORING_RANGES = ['1h', '24h', '7d', '30d'] as const;
export type MonitoringRange = (typeof MONITORING_RANGES)[number];
export const DEFAULT_RANGE: MonitoringRange = '24h';

export function isMonitoringRange(value: unknown): value is MonitoringRange {
  return (
    typeof value === 'string' &&
    (MONITORING_RANGES as readonly string[]).includes(value)
  );
}

export function parseRange(value: unknown): MonitoringRange {
  return isMonitoringRange(value) ? value : DEFAULT_RANGE;
}

/** Each range draws a FIXED number of columns, so the chart's shape does not
 *  depend on how many buckets happen to hold errors. */
export const RANGE_SPECS: Record<
  MonitoringRange,
  { label: string; short: string; windowMs: number; stepMs: number; steps: number }
> = {
  '1h': { label: 'Last hour', short: '1h', windowMs: 3_600_000, stepMs: BUCKET_MS, steps: 12 },
  '24h': { label: 'Last 24 hours', short: '24h', windowMs: 86_400_000, stepMs: 3_600_000, steps: 24 },
  '7d': { label: 'Last 7 days', short: '7d', windowMs: 7 * 86_400_000, stepMs: 6 * 3_600_000, steps: 28 },
  '30d': { label: 'Last 30 days', short: '30d', windowMs: 30 * 86_400_000, stepMs: 86_400_000, steps: 30 },
};

/** `[since, until)` for a range, ending at the close of the CURRENT bucket so
 *  the newest column includes what is happening right now, plus the equal
 *  window before it for the "vs previous" comparison. */
export function rangeWindow(
  range: MonitoringRange,
  now: Date,
): { since: Date; until: Date; previousSince: Date } {
  const spec = RANGE_SPECS[range];
  const until = new Date(bucketStartFor(now).getTime() + BUCKET_MS);
  const since = new Date(until.getTime() - spec.windowMs);
  return { since, until, previousSince: new Date(since.getTime() - spec.windowMs) };
}

export type SeriesPoint = { start: Date; count: number };

/** Sum five-minute bucket rows into the range's fixed columns. Rows outside
 *  the window are ignored rather than clamped onto an edge column. */
export function foldSeries(
  rows: readonly { bucketStart: Date; count: number }[],
  range: MonitoringRange,
  now: Date,
): SeriesPoint[] {
  const spec = RANGE_SPECS[range];
  const { since } = rangeWindow(range, now);
  const points: SeriesPoint[] = Array.from({ length: spec.steps }, (_, i) => ({
    start: new Date(since.getTime() + i * spec.stepMs),
    count: 0,
  }));
  for (const row of rows) {
    const offset = row.bucketStart.getTime() - since.getTime();
    if (offset < 0) continue;
    const index = Math.floor(offset / spec.stepMs);
    if (index >= spec.steps) continue;
    points[index].count += row.count;
  }
  return points;
}

/* -------------------------------------------------------------------------- */
/* Error dimensions + fingerprint                                             */
/* -------------------------------------------------------------------------- */

const ERROR_NAME_RE = /^[A-Za-z][A-Za-z0-9_$]{0,63}$/;
const SQLSTATE_RE = /^[0-9A-Z]{5}$/;
const NODE_CODE_RE = /^E[A-Z0-9_]{1,31}$/;
const ROUTE_PATH_RE = /^\/[A-Za-z0-9_\-[\]./()@]*$/;
const MESSAGE_KEY_RE = /^\[[a-z-]+\] [A-Za-z0-9 _\-—,]{1,72}$/;
const TOKEN_RE = /^[A-Za-z0-9_:.\-]+$/;

export const SCOPE_MAX = 120;
export const UNKNOWN_SCOPE = 'unknown';

/**
 * A class identifier for the error, or 'Error'. Prefers the CONSTRUCTOR name
 * over `.name` because DrizzleQueryError's `.name` is the useless 'Error'
 * (logFields.ts's own lesson), but reads `.name` off any object with one so a
 * Resend `{ name: 'validation_error' }` literal is identified rather than
 * flattened to 'Object'. A thrown non-object is 'NonError'.
 */
export function safeErrorName(error: unknown): string {
  if (typeof error !== 'object' || error === null) return 'NonError';
  const ctor = (error as { constructor?: { name?: unknown } }).constructor?.name;
  const own = (error as { name?: unknown }).name;
  const candidates = [
    ctor !== 'Error' && ctor !== 'Object' ? ctor : undefined,
    own,
    ctor,
  ];
  for (const candidate of candidates) {
    if (
      typeof candidate === 'string' &&
      candidate !== 'Object' &&
      ERROR_NAME_RE.test(candidate)
    ) {
      return candidate;
    }
  }
  return 'Error';
}

/**
 * A code from a CLOSED grammar, walking `.cause` the way the action files'
 * `pgCode` does (drizzle keeps the NeonDbError, and its SQLSTATE, on `.cause`):
 * a five-character SQLSTATE, a Node `E…` code, or an HTTP status carried as
 * `statusCode`/`status`. Anything else — and every message — is ignored.
 */
export function errorCode(error: unknown): string | null {
  let depth = 0;
  for (
    let current = error;
    typeof current === 'object' && current !== null && depth < 6;
    current = (current as { cause?: unknown }).cause, depth += 1
  ) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string' && (SQLSTATE_RE.test(code) || NODE_CODE_RE.test(code))) {
      return code;
    }
    const status =
      (current as { statusCode?: unknown }).statusCode ??
      (current as { status?: unknown }).status;
    if (
      typeof status === 'number' &&
      Number.isInteger(status) &&
      status >= 100 &&
      status <= 599
    ) {
      return String(status);
    }
  }
  return null;
}

/** Which dependency an error class points at, when the name says so. Email
 *  is never inferred here — Resend's error names are generic — the notify
 *  seam passes the component explicitly instead. */
export function classifyComponent(
  errorName: string,
  code: string | null,
): MonitoringComponent | null {
  // Every @vercel/blob class is `Blob<Something>` — and not every one ends in
  // `Error` (BlobServiceNotAvailable, BlobServiceRateLimited).
  if (/^Blob[A-Z]\w+$/.test(errorName)) return 'blob';
  if (errorName === 'WebPushError') return 'push';
  if (
    errorName === 'NeonDbError' ||
    errorName === 'DrizzleQueryError' ||
    errorName === 'PostgresError' ||
    (code !== null && /^[0-9]/.test(code) && SQLSTATE_RE.test(code))
  ) {
    return 'database';
  }
  return null;
}

/**
 * Accepts Next's route PATTERN (`/admin/reports/[slug]`) and nothing that looks
 * like a query string. Callers must pass `context.routePath`, never
 * `request.path`: the pattern is what groups errors; the concrete URL carries
 * filter values and ids.
 */
export function normalizeRoutePath(raw: unknown): string {
  if (typeof raw !== 'string') return UNKNOWN_SCOPE;
  const clean = raw.split('?')[0].split('#')[0];
  if (!ROUTE_PATH_RE.test(clean)) return UNKNOWN_SCOPE;
  return clean.length > SCOPE_MAX ? clean.slice(0, SCOPE_MAX) : clean;
}

/**
 * The `'[domain] fnName failed'` literal a caught action failure was logged
 * under — OUR constant, never an exception's message — or 'unknown'. The
 * grammar is the identity of the ~110 call sites that already exist, so their
 * cardinality is bounded by the code and not by any input.
 */
export function messageKey(message: unknown): string {
  return typeof message === 'string' && MESSAGE_KEY_RE.test(message)
    ? message
    : UNKNOWN_SCOPE;
}

/** A deployment id, request id or digest: a bounded opaque token or nothing. */
export function safeToken(value: unknown, max: number): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) {
    return null;
  }
  return TOKEN_RE.test(value) ? value : null;
}

export const DEPLOYMENT_MAX = 40;
export const REQUEST_ID_MAX = 64;
export const DIGEST_MAX = 40;

/**
 * FNV-1a, 64-bit, over the closed dimension tuple. Deterministic, dependency-
 * free and stable across runtimes — which is the whole requirement; nothing
 * here needs to be cryptographic, because nothing here is a secret.
 */
function fnv1a64(input: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (const byte of new TextEncoder().encode(input)) {
    hash ^= BigInt(byte);
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}

export type FingerprintParts = {
  source: MonitoringSource;
  scope: string;
  routeType?: string | null;
  errorName: string;
  code?: string | null;
};

/** Sixteen hex characters over (source, scope, routeType, errorName, code).
 *  The message is NOT an input — two throws that differ only in a message are
 *  one group, which is what makes the fingerprint both stable and safe. */
export function fingerprintFor(parts: FingerprintParts): string {
  return fnv1a64(
    [
      parts.source,
      parts.scope,
      parts.routeType ?? '',
      parts.errorName,
      parts.code ?? '',
    ].join(''),
  );
}

function boundScope(source: MonitoringSource, scope: unknown): string {
  switch (source) {
    case 'request':
      return normalizeRoutePath(scope);
    case 'action':
      return messageKey(scope);
    case 'dependency':
      return isMonitoringComponent(scope) ? scope : UNKNOWN_SCOPE;
    case 'cron':
      return isCronJobName(scope) ? scope : UNKNOWN_SCOPE;
  }
}

export type ErrorBucketInput = {
  source: MonitoringSource;
  /** Route pattern, message key, component or job name — by source. */
  scope: unknown;
  error: unknown;
  routeType?: unknown;
  /** Override the classification when the seam knows better (notify → email). */
  component?: MonitoringComponent | null;
  environment: unknown;
  deployment?: unknown;
  requestId?: unknown;
  at?: Date;
};

export type ErrorBucketRow = {
  bucketStart: Date;
  environment: MonitoringEnvironment;
  fingerprint: string;
  source: MonitoringSource;
  scope: string;
  routeType: RouteType | null;
  errorName: string;
  code: string | null;
  component: MonitoringComponent | null;
  firstDeployment: string | null;
  lastDeployment: string | null;
  lastDigest: string | null;
  lastRequestId: string | null;
};

/** The complete column list of a bucket row — the check script asserts that a
 *  built row has these keys and no others, so a field can never be added to
 *  the table without passing through this builder and its bounds. */
export const ERROR_BUCKET_COLUMNS = [
  'bucketStart',
  'environment',
  'fingerprint',
  'source',
  'scope',
  'routeType',
  'errorName',
  'code',
  'component',
  'firstDeployment',
  'lastDeployment',
  'lastDigest',
  'lastRequestId',
] as const;

/** The ONLY way a recorded error becomes a row. Every string is bounded and
 *  drawn from a closed grammar; the error's message, stack and parameters have
 *  no path into the result. */
export function buildErrorBucketRow(input: ErrorBucketInput): ErrorBucketRow {
  const at = input.at ?? new Date();
  const errorName = safeErrorName(input.error);
  const code = errorCode(input.error);
  const scope = boundScope(input.source, input.scope);
  const routeType = isRouteType(input.routeType) ? input.routeType : null;
  const component =
    input.component !== undefined && input.component !== null
      ? input.component
      : classifyComponent(errorName, code);
  const deployment = safeToken(input.deployment, DEPLOYMENT_MAX);
  const digest = safeToken(
    typeof input.error === 'object' && input.error !== null
      ? (input.error as { digest?: unknown }).digest
      : undefined,
    DIGEST_MAX,
  );
  return {
    bucketStart: bucketStartFor(at),
    environment: safeEnvironment(input.environment),
    fingerprint: fingerprintFor({ source: input.source, scope, routeType, errorName, code }),
    source: input.source,
    scope,
    routeType,
    errorName,
    code,
    component,
    firstDeployment: deployment,
    lastDeployment: deployment,
    lastDigest: digest,
    lastRequestId: safeToken(input.requestId, REQUEST_ID_MAX),
  };
}

/* -------------------------------------------------------------------------- */
/* Checks                                                                     */
/* -------------------------------------------------------------------------- */

export const CHECK_DETAIL_MAX = 160;

export type CheckOutcome = {
  status: CheckStatus;
  durationMs: number | null;
  errorName: string | null;
  /** A fixed sentence composed by the probe — never an error message. */
  detail: string | null;
};

export type CheckKind = 'dependency' | 'cron';

/** One outcome, bounded, ready for `upsertCheck` — which folds the streak
 *  (`consecutive_failures`, `last_ok_at`, `last_failed_at`) in SQL so that a
 *  duplicate cron invocation cannot double-count a failure. `failed` and
 *  `unknown` both extend a streak: a check that will not complete is not
 *  passing. `unconfigured` is a configuration state and resets it. */
export type CheckOutcomeRow = {
  component: string;
  kind: CheckKind;
  status: CheckStatus;
  checkedAt: Date;
  durationMs: number | null;
  errorName: string | null;
  detail: string | null;
};

export const isFailingStatus = (status: CheckStatus): boolean =>
  status === 'failed' || status === 'unknown';

export function checkOutcomeRow(
  component: string,
  kind: CheckKind,
  outcome: CheckOutcome,
  now: Date,
): CheckOutcomeRow {
  return {
    component,
    kind,
    status: outcome.status,
    checkedAt: now,
    durationMs:
      outcome.durationMs === null ? null : Math.max(0, Math.round(outcome.durationMs)),
    errorName: outcome.errorName ? safeErrorName({ name: outcome.errorName }) : null,
    detail: outcome.detail ? outcome.detail.slice(0, CHECK_DETAIL_MAX) : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Thresholds                                                                 */
/* -------------------------------------------------------------------------- */

export const EVALUATOR_SCHEDULE = '*/15 * * * *';
/** Past this, "checked N minutes ago" is not a reading — it is the monitor
 *  itself not running, and the headline says so instead of staying green. */
export const EVALUATOR_STALE_MS = 35 * 60_000;

export const PROBE_TIMEOUT_MS = 4_000;
export const RECORD_TIMEOUT_MS = 1_500;

export const BURST_WINDOW_MS = 15 * 60_000;
export const BURST_WARNING = 5;
export const BURST_CRITICAL = 25;
export const GLOBAL_BURST_CRITICAL = 20;
export const GLOBAL_BURST_KEY = '*';

export const OBSERVED_WINDOW_MS = 60 * 60_000;
export const OBSERVED_FAILURES_WARNING = 3;
export const DEPENDENCY_CONSECUTIVE = 2;

/** How long a key stays quiet before its incident closes. Bursts wait a window
 *  so a lull between two spikes is not two incidents; probes and crons resolve
 *  on the first clean reading, because that reading IS the recovery. */
export const RESOLVE_GRACE_MS: Record<IncidentKind, number> = {
  error_burst: BURST_WINDOW_MS,
  dependency: 0,
  cron: 0,
};
/** A key that resolved this recently is REOPENED rather than opened again, and
 *  reopening never re-alerts — the flap guard. */
export const REOPEN_WINDOW_MS = 60 * 60_000;
export const ALERT_CAP_PER_RUN = 3;

export const TITLE_MAX = 120;
export const DETAIL_MAX = 240;

/* -------------------------------------------------------------------------- */
/* Signals → incidents                                                        */
/* -------------------------------------------------------------------------- */

export type ProbeState = {
  component: DependencyComponent;
  status: CheckStatus;
  consecutiveFailures: number;
  errorName: string | null;
};

export type ObservedFailure = { component: string; count: number };

export type BurstGroup = {
  fingerprint: string;
  source: MonitoringSource;
  scope: string;
  errorName: string;
  count: number;
  deployment: string | null;
  lastRequestId: string | null;
  lastDigest: string | null;
};

export type CronState = {
  name: CronJobName;
  health: CronHealth;
  consecutiveFailures: number;
  errorName: string | null;
};

export type IncidentSignal = {
  kind: IncidentKind;
  key: string;
  component: string | null;
  severity: Severity;
  title: string;
  detail: string;
  deployment: string | null;
  lastRequestId: string | null;
  lastDigest: string | null;
};

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

const clip = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

/** "TypeError on /admin/reports/[slug]" · "DrizzleQueryError in [tasks] createTask failed". */
export function composeBurstTitle(group: Pick<BurstGroup, 'source' | 'scope' | 'errorName'>): string {
  const joiner = group.source === 'request' ? 'on' : 'in';
  return clip(`${group.errorName} ${joiner} ${group.scope}`, TITLE_MAX);
}

const HHMM_UTC = (at: Date) =>
  `${two(at.getUTCHours())}:${two(at.getUTCMinutes())} UTC`;

/**
 * Turn this evaluation's readings into the conditions that are TRUE right
 * now. Pure: the evaluator reads, this decides, the evaluator writes.
 */
export function buildSignals({
  probes,
  observed,
  bursts,
  crons,
  environment,
}: {
  probes: readonly ProbeState[];
  /** Recorded failures per bucket component over OBSERVED_WINDOW_MS. */
  observed: readonly ObservedFailure[];
  /** Per-fingerprint totals over BURST_WINDOW_MS, request + action sources. */
  bursts: readonly BurstGroup[];
  crons: readonly CronState[];
  environment: MonitoringEnvironment;
}): IncidentSignal[] {
  const signals: IncidentSignal[] = [];

  // ── Error bursts, per group ──────────────────────────────────────────────
  let total = 0;
  const places = new Set<string>();
  for (const group of bursts) {
    if (group.source !== 'request' && group.source !== 'action') continue;
    total += group.count;
    places.add(group.scope);
    const severity: Severity | null =
      group.count >= BURST_CRITICAL
        ? 'critical'
        : group.count >= BURST_WARNING
          ? 'warning'
          : null;
    if (!severity) continue;
    signals.push({
      kind: 'error_burst',
      key: group.fingerprint,
      component: group.scope,
      severity,
      title: composeBurstTitle(group),
      detail: clip(`${group.count} in the last ${BURST_WINDOW_MS / 60_000} minutes`, DETAIL_MAX),
      deployment: group.deployment,
      lastRequestId: group.lastRequestId,
      lastDigest: group.lastDigest,
    });
  }
  if (total >= GLOBAL_BURST_CRITICAL) {
    signals.push({
      kind: 'error_burst',
      key: GLOBAL_BURST_KEY,
      component: null,
      severity: 'critical',
      title: 'Server errors across the dashboard',
      detail: `${total} in the last ${BURST_WINDOW_MS / 60_000} minutes across ${plural(places.size, 'place', 'places')}`,
      deployment: null,
      lastRequestId: null,
      lastDigest: null,
    });
  }

  // ── Dependencies: the probe and the observed failures, folded per component ─
  const observedByComponent = new Map<string, number>();
  for (const row of observed) {
    observedByComponent.set(
      row.component,
      (observedByComponent.get(row.component) ?? 0) + row.count,
    );
  }
  for (const spec of DEPENDENCY_CHECKS) {
    const probe = probes.find((p) => p.component === spec.component);
    const candidates: { severity: Severity; title: string; detail: string }[] = [];
    if (probe) {
      if (probe.status === 'failed' && probe.consecutiveFailures >= DEPENDENCY_CONSECUTIVE) {
        candidates.push({
          severity: spec.critical ? 'critical' : 'warning',
          title: `${spec.label} is failing`,
          detail: `Failed ${plural(probe.consecutiveFailures, 'check', 'checks')} in a row${probe.errorName ? ` · ${probe.errorName}` : ''}`,
        });
      } else if (
        probe.status === 'unknown' &&
        probe.consecutiveFailures >= DEPENDENCY_CONSECUTIVE
      ) {
        candidates.push({
          severity: 'warning',
          title: `${spec.label} check is not completing`,
          detail: `Timed out ${plural(probe.consecutiveFailures, 'check', 'checks')} in a row`,
        });
      } else if (probe.status === 'unconfigured' && environment === 'production') {
        candidates.push({
          severity: 'warning',
          title: `${spec.label} is not configured`,
          detail: 'Its environment variables are missing in production',
        });
      }
    }
    const observedCount = spec.observed.reduce(
      (sum, component) => sum + (observedByComponent.get(component) ?? 0),
      0,
    );
    if (observedCount >= OBSERVED_FAILURES_WARNING) {
      candidates.push({
        severity: 'warning',
        title: `${spec.label} is failing in use`,
        detail: `${plural(observedCount, 'failure', 'failures')} in the last hour`,
      });
    }
    if (candidates.length === 0) continue;
    const strongest = candidates.reduce((best, c) =>
      severityAbove(c.severity, best.severity) ? c : best,
    );
    signals.push({
      kind: 'dependency',
      key: spec.component,
      component: spec.component,
      severity: strongest.severity,
      title: clip(strongest.title, TITLE_MAX),
      detail: clip(candidates.map((c) => c.detail).join(' · '), DETAIL_MAX),
      deployment: null,
      lastRequestId: null,
      lastDigest: null,
    });
  }

  // ── Crons ────────────────────────────────────────────────────────────────
  for (const cron of crons) {
    const { health } = cron;
    if (!health.severity) continue;
    const label = cronJob(cron.name).label;
    if (health.state === 'missed') {
      signals.push({
        kind: 'cron',
        key: cron.name,
        component: cronComponent(cron.name),
        severity: health.severity,
        title: `${label} did not run`,
        detail: `Expected at ${HHMM_UTC(health.expectedAt)} · ${plural(health.missedRuns, 'run', 'runs')} missed`,
        deployment: null,
        lastRequestId: null,
        lastDigest: null,
      });
    } else if (health.state === 'failed') {
      signals.push({
        kind: 'cron',
        key: cron.name,
        component: cronComponent(cron.name),
        severity: health.severity,
        title: `${label} failed`,
        detail:
          (cron.consecutiveFailures >= 2
            ? `Failed ${plural(cron.consecutiveFailures, 'run', 'runs')} in a row`
            : 'Its last run failed') + (cron.errorName ? ` · ${cron.errorName}` : ''),
        deployment: null,
        lastRequestId: null,
        lastDigest: null,
      });
    }
  }

  return signals;
}

export type OpenIncidentRow = {
  id: string;
  kind: IncidentKind;
  key: string;
  severity: Severity;
  lastSeenAt: Date;
};

export type ResolvedIncidentRow = {
  id: string;
  kind: IncidentKind;
  key: string;
  resolvedAt: Date;
};

export type IncidentPlan = {
  /** Brand-new conditions: insert, then claim an alert. */
  open: IncidentSignal[];
  /** A condition that came back within REOPEN_WINDOW_MS: same row, no re-alert. */
  reopen: { id: string; signal: IncidentSignal }[];
  /** Still true: bump last_seen/occurrence; `escalate` when it grew to critical. */
  touch: { id: string; signal: IncidentSignal; escalate: boolean }[];
  /** No longer true and past its grace: close, then claim a recovery notice. */
  resolve: { id: string }[];
  /** No longer true but inside its grace: leave open, say nothing. */
  cooling: { id: string }[];
};

const incidentKey = (kind: IncidentKind, key: string) => `${kind}${key}`;

/**
 * Reconcile what is true now against what is open. Pure, and deliberately the
 * whole lifecycle in one place: open / reopen / escalate / cool / resolve are
 * the five things that can happen to a key, and a duplicate cron invocation
 * running this twice plans the same writes — the database's partial unique
 * index and the claim UPDATEs make the second set a no-op.
 */
export function decideIncidents({
  signals,
  open,
  recentlyResolved,
  now,
}: {
  signals: readonly IncidentSignal[];
  open: readonly OpenIncidentRow[];
  recentlyResolved: readonly ResolvedIncidentRow[];
  now: Date;
}): IncidentPlan {
  const plan: IncidentPlan = { open: [], reopen: [], touch: [], resolve: [], cooling: [] };
  const openByKey = new Map(open.map((row) => [incidentKey(row.kind, row.key), row]));
  const seen = new Set<string>();

  for (const signal of signals) {
    const k = incidentKey(signal.kind, signal.key);
    if (seen.has(k)) continue;
    seen.add(k);
    const existing = openByKey.get(k);
    if (existing) {
      plan.touch.push({
        id: existing.id,
        signal,
        escalate:
          signal.severity === 'critical' && existing.severity !== 'critical',
      });
      continue;
    }
    const recent = recentlyResolved
      .filter(
        (row) =>
          row.kind === signal.kind &&
          row.key === signal.key &&
          now.getTime() - row.resolvedAt.getTime() < REOPEN_WINDOW_MS,
      )
      .sort((a, b) => b.resolvedAt.getTime() - a.resolvedAt.getTime())[0];
    if (recent) plan.reopen.push({ id: recent.id, signal });
    else plan.open.push(signal);
  }

  for (const row of open) {
    if (seen.has(incidentKey(row.kind, row.key))) continue;
    const quietFor = now.getTime() - row.lastSeenAt.getTime();
    if (quietFor >= RESOLVE_GRACE_MS[row.kind]) plan.resolve.push({ id: row.id });
    else plan.cooling.push({ id: row.id });
  }

  return plan;
}

/* -------------------------------------------------------------------------- */
/* Overall status                                                             */
/* -------------------------------------------------------------------------- */

export type OverallInput = {
  checks: readonly { component: string; status: CheckStatus }[];
  openIncidents: readonly { severity: Severity }[];
  /** The newest dependency probe — null when nothing has ever run. */
  lastCheckedAt: Date | null;
  /** Page reads that threw; any at all means the headline cannot be trusted. */
  sectionsFailed?: number;
  now: Date;
};

export function relativeAge(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

/**
 * The headline, derived deterministically and NEVER from the monitoring query
 * itself having succeeded: stale readings and failed reads are `unknown`, an
 * open critical is `incident`, anything short of all-clear is `degraded`.
 */
export function deriveOverallStatus({
  checks,
  openIncidents,
  lastCheckedAt,
  sectionsFailed = 0,
  now,
}: OverallInput): { status: OverallStatus; reason: string } {
  if (sectionsFailed > 0) {
    return {
      status: 'unknown',
      reason: `${plural(sectionsFailed, 'monitoring read', 'monitoring reads')} failed, so the figures on this page are incomplete`,
    };
  }
  if (!lastCheckedAt) {
    return { status: 'unknown', reason: 'No checks have run yet' };
  }
  const age = now.getTime() - lastCheckedAt.getTime();
  if (age > EVALUATOR_STALE_MS) {
    return {
      status: 'unknown',
      reason: `Last checked ${relativeAge(age)}; the monitoring job may not be running`,
    };
  }
  const critical = openIncidents.filter((i) => i.severity === 'critical').length;
  if (critical > 0) {
    return {
      status: 'incident',
      reason: `${plural(critical, 'critical incident', 'critical incidents')} open`,
    };
  }
  const warnings = openIncidents.length - critical;
  const notOk = checks.filter((c) => c.status !== 'ok');
  if (warnings > 0 || notOk.length > 0) {
    const parts: string[] = [];
    if (warnings > 0) parts.push(plural(warnings, 'warning open', 'warnings open'));
    if (notOk.length > 0) {
      parts.push(
        `${plural(notOk.length, 'check', 'checks')} not passing (${notOk
          .map((c) => c.component)
          .join(', ')})`,
      );
    }
    return { status: 'degraded', reason: parts.join(' · ') };
  }
  return { status: 'healthy', reason: 'Every check is passing and nothing is open' };
}

/* -------------------------------------------------------------------------- */
/* Alert copy                                                                 */
/* -------------------------------------------------------------------------- */

export type AlertIncident = {
  kind: IncidentKind;
  severity: Severity;
  title: string;
  detail: string | null;
  startedAt: Date;
  occurrenceCount: number;
  deployment: string | null;
  lastRequestId: string | null;
  lastDigest: string | null;
};

const STAMP = (at: Date) =>
  `${at.getUTCFullYear()}-${two(at.getUTCMonth() + 1)}-${two(at.getUTCDate())} ${HHMM_UTC(at)}`;

const SEVERITY_WORD: Record<Severity, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
};

function incidentLines(incident: AlertIncident, siteUrl: string): string[] {
  const lines = [
    `${SEVERITY_WORD[incident.severity]}: ${incident.title}`,
    ...(incident.detail ? [`  ${incident.detail}`] : []),
    `  Since ${STAMP(incident.startedAt)}${incident.occurrenceCount > 1 ? ` · seen ${incident.occurrenceCount} times` : ''}`,
  ];
  const clues: string[] = [];
  if (incident.deployment) clues.push(`deployment ${incident.deployment}`);
  if (incident.lastRequestId) clues.push(`request ${incident.lastRequestId}`);
  if (incident.lastDigest) clues.push(`error id ${incident.lastDigest}`);
  if (clues.length) lines.push(`  Vercel runtime logs: search for ${clues.join(', ')}`);
  lines.push(`  ${siteUrl}/admin/monitoring`);
  return lines;
}

/** The "something opened" email. Fixed sentences, counts, class names, route
 *  patterns and opaque ids — never a message, a stack or a person. */
export function composeIncidentEmail(
  incidents: readonly AlertIncident[],
  siteUrl: string,
): { subject: string; text: string } {
  const worst = incidents.reduce<Severity>(
    (acc, i) => maxSeverity(acc, i.severity),
    'info',
  );
  const subject =
    incidents.length === 1
      ? `[Perseus] ${SEVERITY_WORD[worst]}: ${incidents[0].title}`
      : `[Perseus] ${SEVERITY_WORD[worst]}: ${incidents.length} incidents opened`;
  const text = [
    incidents.length === 1
      ? 'An incident opened on the dashboard.'
      : `${incidents.length} incidents opened on the dashboard.`,
    '',
    ...incidents.flatMap((incident) => [...incidentLines(incident, siteUrl), '']),
    'You are receiving this because you hold the Monitoring area.',
  ].join('\n');
  return { subject, text };
}

/** The recovery email — sent only for an incident that was announced. */
export function composeRecoveryEmail(
  incidents: readonly AlertIncident[],
  siteUrl: string,
  now: Date,
): { subject: string; text: string } {
  const subject =
    incidents.length === 1
      ? `[Perseus] Resolved: ${incidents[0].title}`
      : `[Perseus] Resolved: ${incidents.length} incidents`;
  const text = [
    incidents.length === 1
      ? 'The incident below has cleared.'
      : 'The incidents below have cleared.',
    '',
    ...incidents.flatMap((incident) => [
      `${incident.title}`,
      `  Open from ${STAMP(incident.startedAt)} to ${STAMP(now)}`,
      '',
    ]),
    `${siteUrl}/admin/monitoring`,
  ].join('\n');
  return { subject, text };
}

/* -------------------------------------------------------------------------- */
/* Vercel links                                                               */
/* -------------------------------------------------------------------------- */

/** Dashboard coordinates, not secrets: the team slug and project name appear
 *  in every Vercel URL a signed-in member already sees. */
export const VERCEL_TEAM_SLUG = 'samanhoseinpours-projects';
export const VERCEL_PROJECT_SLUG = 'perseus-creative-studio-v2';
/** The team's id, the same kind of coordinate: it is the `ownerId` both
 *  Vercel queries below take, and it identifies nothing a token does not
 *  already have to be scoped to. The PROJECT id is Vercel's own
 *  VERCEL_PROJECT_ID system variable at runtime, so it is not repeated here. */
export const VERCEL_TEAM_ID = 'team_Ds1WwYYkbPz7YHcu8oeHhupX';

export type VercelLink = { label: string; href: string; hint: string };

export function vercelLinks(deployment: string | null): VercelLink[] {
  const base = `https://vercel.com/${VERCEL_TEAM_SLUG}/${VERCEL_PROJECT_SLUG}`;
  const links: VercelLink[] = [
    {
      label: 'Observability',
      href: `${base}/observability`,
      hint: 'Request volume, latency, status codes, function duration',
    },
    {
      label: 'Runtime logs',
      href: `${base}/logs`,
      hint: 'Stack traces and the full line for any request id or error id',
    },
    {
      label: 'Cron jobs',
      href: `${base}/settings/cron-jobs`,
      hint: 'Every scheduled job, with its own invocation log',
    },
  ];
  if (deployment) {
    links.push({
      label: 'This deployment',
      href: `${base}/${deployment}`,
      hint: `The build serving this page (${deployment})`,
    });
  }
  return links;
}

/* -------------------------------------------------------------------------- */
/* Labels + tones                                                             */
/* -------------------------------------------------------------------------- */

export const OVERALL_STATUS_LABELS: Record<OverallStatus, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  incident: 'Incident',
  unknown: 'Unknown',
};

/**
 * The house palette rules, applied to health: ink for the ordinary reading,
 * amber for attention, rose for actual failure, a dashed outline for "we
 * cannot tell". Never colour alone — every chip carries its word.
 */
export const OVERALL_STATUS_TONES: Record<OverallStatus, string> = {
  healthy: 'border-transparent bg-foreground text-background',
  degraded:
    'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  incident: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400',
  unknown: 'border-dashed border-foreground/30 bg-transparent text-muted-foreground',
};

export const CHECK_STATUS_LABELS: Record<CheckStatus, string> = {
  ok: 'OK',
  failed: 'Failing',
  unknown: 'Unknown',
  unconfigured: 'Not configured',
};

/** `ok` is the quiet wash, not solid ink: a list that is mostly fine must not
 *  be a column of black pills (the commitments-roster rule). */
export const CHECK_STATUS_TONES: Record<CheckStatus, string> = {
  ok: 'border-foreground/15 bg-foreground/[0.06] text-foreground',
  failed: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400',
  unknown: 'border-dashed border-foreground/30 bg-transparent text-muted-foreground',
  unconfigured:
    'border-dashed border-foreground/30 bg-transparent text-muted-foreground',
};

export const SEVERITY_LABELS: Record<Severity, string> = SEVERITY_WORD;

export const SEVERITY_TONES: Record<Severity, string> = {
  info: 'border-foreground/15 bg-foreground/[0.06] text-muted-foreground',
  warning:
    'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  critical: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400',
};

export const INCIDENT_KIND_LABELS: Record<IncidentKind, string> = {
  error_burst: 'Errors',
  dependency: 'Dependency',
  cron: 'Scheduled job',
};

export const CRON_STATE_LABELS: Record<CronHealthState, string> = {
  ok: 'On time',
  failed: 'Failed',
  missed: 'Missed',
  pending: 'Not run yet',
};

/* -------------------------------------------------------------------------- */
/* Recent request logs (the windowed query behind `vercel logs`)             */
/* -------------------------------------------------------------------------- */

/**
 * Vercel's DOCUMENTED runtime-logs endpoint is a live stream with no window
 * and no limit — and against this project it never answers (2026-08-27: 90 s
 * without a byte from the app, and `vercel logs --follow`, the very same URL,
 * sat on "waiting for new logs" while the site was taking requests). What the
 * CLI uses WITHOUT `--follow` is a windowed query instead:
 * `GET https://vercel.com/api/logs/request-logs?startDate&endDate&page…`,
 * answering one JSON object `{ rows, hasMoreRows }` in which each row is a
 * REQUEST — method, path, status, where it was served — with the function log
 * lines it produced nested under `logs[]`. It is not in the OpenAPI spec, but
 * it is what `vercel logs` and Vercel's own MCP server ship against, so a
 * change there breaks their tools before ours, and the panel already has an
 * honest "failed" reading for that day.
 *
 * The panel asks for the last RECENT_LOGS_MINUTES of the build serving the
 * page. That is a window — not history, never a rate — and nothing from it is
 * stored: the rows reach the screen through the allowlist below and go
 * nowhere else.
 */
export const RECENT_LOGS_MINUTES = 5;
export const RECENT_LOGS_MAX_ROWS = 200;
/** One bound over the whole fetch, every page included. */
export const RECENT_LOGS_TIMEOUT_MS = 10_000;
/** The endpoint pages at about a hundred rows; two pages cover the cap. */
export const RECENT_LOGS_MAX_PAGES = 2;

export const RUNTIME_LOG_LEVELS = ['debug', 'error', 'fatal', 'info', 'trace', 'warning'] as const;
export type RuntimeLogLevel = (typeof RUNTIME_LOG_LEVELS)[number];
/** Where Vercel served a request — `events[0].source` on a row. Closed, and
 *  a value outside it folds to `other` rather than dropping the request: a
 *  request left out of the window understates it. No events at all is a
 *  request nothing ran for, which Vercel and its CLI both call `static`. */
export const REQUEST_SOURCES = [
  'serverless',
  'serverless-middleware',
  'edge-function',
  'edge-middleware',
  'static',
  'external',
  'other',
] as const;
export type RequestSource = (typeof REQUEST_SOURCES)[number];

/** One of OUR logger's lines, reduced to its closed field set. */
export type SafeLogLine = {
  level: RuntimeLogLevel;
  /** Our logger's own fixed message ('[cron] weekly-digest failed'). */
  message: string;
  event: string | null;
  errorName: string | null;
  fingerprint: string | null;
  routePath: string | null;
  job: string | null;
  digest: string | null;
};

/**
 * What one request row becomes on our side — the allowlist. The request keeps
 * its method, path (query stripped, a credential-bearing segment collapsed to
 * its pattern — see redactRequestPath), status, source and request id; beneath
 * it, only the log lines that are our own JSON survive, reduced to
 * SafeLogLine. Every other line is COUNTED in `withheld` and its text never
 * leaves the server, because we cannot know what is in it.
 */
export type SafeRequestRow = {
  at: Date;
  source: RequestSource;
  method: string | null;
  path: string | null;
  status: number | null;
  requestId: string | null;
  lines: SafeLogLine[];
  /** Log lines under this request whose text we deliberately did not keep. */
  withheld: number;
};

const METHOD_RE = /^[A-Z]{3,7}$/;
const LOG_MESSAGE_RE = /^[A-Za-z0-9 \[\]\-—·.:_]{1,80}$/;
const LOG_EVENT_RE = /^[a-z]+(\.[a-z]+){1,3}$/;
const FINGERPRINT_RE = /^[0-9a-f]{16}$/;

function stripQuery(path: unknown): string | null {
  if (typeof path !== 'string') return null;
  const clean = path.split('?')[0].split('#')[0];
  // No `@` here, unlike ROUTE_PATH_RE: that class exists for `@slot` route
  // PATTERNS, which are never request paths, and it is what would let an
  // address through as a path segment.
  return clean.length > 0 && clean.length <= SCOPE_MAX && /^\/[A-Za-z0-9_\-[\]./()%~]*$/.test(clean)
    ? clean
    : null;
}

/** Our logger's JSON → the closed field set, or null when the text is not
 *  ours (any line whose `message` fails our literal grammar is not ours,
 *  whatever else it carries). */
function ownLogLine(level: RuntimeLogLevel, message: unknown): SafeLogLine | null {
  if (typeof message !== 'string' || !message.startsWith('{')) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(message);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const o = parsed as Record<string, unknown>;
  const str = (v: unknown, re: RegExp, max = 80) =>
    typeof v === 'string' && v.length <= max && re.test(v) ? v : null;
  const msg = str(o.message, LOG_MESSAGE_RE);
  if (msg === null) return null;
  return {
    level,
    message: msg,
    event: str(o.event, LOG_EVENT_RE),
    errorName: str(o.errorName, ERROR_NAME_RE),
    fingerprint: str(o.fingerprint, FINGERPRINT_RE),
    routePath: typeof o.routePath === 'string' ? normalizeRoutePath(o.routePath) : null,
    job: isCronJobName(o.job) ? o.job : null,
    digest: safeToken(o.digest, DIGEST_MAX),
  };
}

/**
 * A path whose segment IS a credential must never reach the screen: a
 * client's report link (`/share/reports/<token>` — the token is the whole
 * credential, never logged, never listed) and Better Auth's password-reset
 * link (`/api/auth/reset-password/<token>`, live for an hour) both put the
 * secret in the path, not the query. Those routes collapse to their pattern
 * before the row exists, and as a backstop any segment shaped like a token —
 * sixteen or more url-safe characters with a digit and an uppercase letter or
 * underscore, which no slug on this site has — is collapsed too.
 */
const TOKEN_SEGMENT_RE = /^(?=.*\d)(?=.*[A-Z_])[A-Za-z0-9_-]{16,}$/;
export function redactRequestPath(path: string | null): string | null {
  if (path === null) return null;
  if (/^\/share\/reports\/[^/]+$/.test(path)) return '/share/reports/[token]';
  if (/^\/api\/auth\/reset-password\/[^/]+$/.test(path)) return '/api/auth/reset-password/[token]';
  return path
    .split('/')
    .map((segment) => (TOKEN_SEGMENT_RE.test(segment) ? '[token]' : segment))
    .join('/');
}

function parseInstant(value: unknown): Date | null {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value);
  if (typeof value === 'string' && value.length > 0) {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? new Date(ms) : null;
  }
  return null;
}

function requestSourceOf(events: unknown): RequestSource {
  const first = Array.isArray(events) ? (events[0] as Record<string, unknown> | undefined) : undefined;
  const source = first && typeof first.source === 'string' ? first.source : null;
  if (source === null) return 'static';
  return (REQUEST_SOURCES as readonly string[]).includes(source) ? (source as RequestSource) : 'other';
}

function statusOf(value: unknown): number | null {
  const n =
    typeof value === 'number' ? value : typeof value === 'string' && /^\d{3}$/.test(value) ? Number(value) : NaN;
  return Number.isInteger(n) && n >= 100 && n <= 599 ? n : null;
}

/** One row of the answer → a safe row, or null for junk. */
export function parseRequestLogRow(raw: unknown): SafeRequestRow | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const at = parseInstant(r.timestamp);
  if (!at) return null;
  const lines: SafeLogLine[] = [];
  let withheld = 0;
  for (const entry of Array.isArray(r.logs) ? r.logs : []) {
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const level = (RUNTIME_LOG_LEVELS as readonly string[]).includes(e.level as string)
      ? (e.level as RuntimeLogLevel)
      : 'info';
    const own = ownLogLine(level, e.message);
    if (own) lines.push(own);
    else if (typeof e.message === 'string' && e.message.length > 0) withheld += 1;
  }
  return {
    at,
    source: requestSourceOf(r.events),
    method: typeof r.requestMethod === 'string' && METHOD_RE.test(r.requestMethod) ? r.requestMethod : null,
    path: redactRequestPath(stripQuery(r.requestPath)),
    status: statusOf(r.statusCode),
    requestId: safeToken(r.requestId, REQUEST_ID_MAX),
    lines,
    withheld,
  };
}

/** The whole answer → its safe rows and whether Vercel had more pages. */
export function parseRequestLogAnswer(raw: unknown): { rows: SafeRequestRow[]; hasMore: boolean } | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.rows)) return null;
  const rows: SafeRequestRow[] = [];
  for (const item of r.rows) {
    const row = parseRequestLogRow(item);
    if (row) rows.push(row);
  }
  return { rows, hasMore: r.hasMoreRows === true };
}

/** Newest first, cut to `cap` — and whether the cut removed anything. */
export function newestRequestRows(
  rows: readonly SafeRequestRow[],
  cap: number,
): { rows: SafeRequestRow[]; truncated: boolean } {
  const sorted = [...rows].sort((a, b) => b.at.getTime() - a.at.getTime());
  return { rows: sorted.slice(0, cap), truncated: sorted.length > cap };
}

export type RecentLogsSummary = {
  requests: number;
  byClass: { '2xx': number; '3xx': number; '4xx': number; '5xx': number };
  /** Our own lines at error or fatal, across every request in the window. */
  functionErrors: number;
  /** Log lines that were not ours — counted, never shown. */
  withheld: number;
  minutes: number;
  /** True when the window held more than what is shown: the counts are of
   *  the newest rows kept, not of the whole window, and the panel says so. */
  truncated: boolean;
};

/** Counts over what came back. Honest arithmetic on the rows in hand — never
 *  a rate extrapolated past the window. */
export function summarizeRecentLogs(
  rows: readonly SafeRequestRow[],
  minutes: number,
  truncated: boolean,
): RecentLogsSummary {
  const out: RecentLogsSummary = {
    requests: rows.length,
    byClass: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
    functionErrors: 0,
    withheld: 0,
    minutes,
    truncated,
  };
  for (const row of rows) {
    if (row.status !== null) {
      const cls = `${Math.floor(row.status / 100)}xx` as keyof RecentLogsSummary['byClass'];
      if (cls in out.byClass) out.byClass[cls] += 1;
    }
    out.withheld += row.withheld;
    for (const line of row.lines) {
      if (line.level === 'error' || line.level === 'fatal') out.functionErrors += 1;
    }
  }
  return out;
}

/** The query the panel sends — the CLI's own parameters, verbatim. */
export function requestLogsUrl({
  projectId,
  deploymentId,
  since,
  until,
  page,
}: {
  projectId: string;
  deploymentId: string;
  since: Date;
  until: Date;
  page: number;
}): string {
  const query = new URLSearchParams({
    projectId,
    ownerId: VERCEL_TEAM_ID,
    teamId: VERCEL_TEAM_ID,
    deploymentId,
    page: String(page),
    startDate: String(since.getTime()),
    endDate: String(until.getTime()),
  });
  return `https://vercel.com/api/logs/request-logs?${query.toString()}`;
}

/* -------------------------------------------------------------------------- */
/* Request counts (Vercel's documented observability query)                   */
/* -------------------------------------------------------------------------- */

/**
 * `POST /v2/observability/query` — in Vercel's OpenAPI spec, and what the
 * `vercel metrics` command runs — answers `vercel.request.count` over a real
 * window, so the app finally has an honest request denominator. The scheduled
 * pass asks for yesterday and today, by UTC day, grouped by `http_status`,
 * production traffic only, and RAISES each day's counters to the answer
 * rather than bumping them: a day's count from Vercel only ever grows as the
 * day advances, so `raiseDailyCounts` takes the greater of the stored and the
 * answered figure — a duplicate cron invocation (Vercel documents them)
 * lands the same numbers twice instead of doubling them, re-folding "today"
 * every pass is safe, and a short answer can never lower a real day.
 *
 * A response served with a 5xx is a failure; everything else — a 4xx
 * included — is a response the server delivered as asked (a 404 to a crawler
 * is not an outage). The status scan costs Vercel ten to fifteen seconds
 * (measured 2026-08-27), which is why this runs on the scheduled pass only,
 * never behind "Check now", and carries its own bound.
 */
export const REQUESTS_COMPONENT = 'requests';
export const REQUEST_COUNTS_METRIC = 'vercel.request.count';
export const REQUEST_COUNTS_FILTER = "environment eq 'production'";
/** Groups asked for per bucket. Distinct statuses run to a few dozen; an
 *  answer that FILLS the cap may have been cut, and is refused rather than
 *  folded short — the default of ten silently dropped rare statuses. */
export const REQUEST_STATUS_GROUP_LIMIT = 200;
export const REQUEST_COUNTS_TIMEOUT_MS = 30_000;

export type RequestCountsQuery = {
  url: string;
  body: Record<string, unknown>;
  /** The UTC days the query covers, oldest first. */
  days: [string, string];
};

/** The query the evaluator sends — the CLI's own body shape. */
export function requestCountsQuery({ projectId, now }: { projectId: string; now: Date }): RequestCountsQuery {
  const today = dayKeyUtc(now);
  const yesterday = dayKeyUtc(new Date(now.getTime() - 86_400_000));
  return {
    url: `https://api.vercel.com/v2/observability/query?teamId=${encodeURIComponent(VERCEL_TEAM_ID)}`,
    body: {
      scope: { type: 'project', ownerId: VERCEL_TEAM_ID, projectIds: [projectId] },
      metric: REQUEST_COUNTS_METRIC,
      aggregation: 'sum',
      startTime: `${yesterday}T00:00:00.000Z`,
      endTime: now.toISOString(),
      granularity: { days: 1 },
      groupBy: ['http_status'],
      filter: REQUEST_COUNTS_FILTER,
      limit: REQUEST_STATUS_GROUP_LIMIT,
    },
    days: [yesterday, today],
  };
}

export type RequestDayCounts = { day: string; ok: number; failed: number };

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The answer → one counter per asked day, or null when it cannot be trusted
 * whole: a shape we do not read, a row we cannot count, as many groups as the
 * cap (a cut list), or NO ROWS AT ALL — this site serves thousands of
 * responses a day, so an empty two-day window can only be a defective reply,
 * and writing it as fact would be the `?? 0` trap the rest of this codebase
 * names. A day the answer covers only partly stays at zero in the fold, which
 * is harmless because the write only ever raises a stored figure; a bucket
 * outside the asked days is ignored, because Vercel rounds the window out to
 * day edges.
 */
export function foldRequestCounts(raw: unknown, days: readonly string[]): RequestDayCounts[] | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.data) || !Array.isArray(r.summary)) return null;
  if (r.summary.length >= REQUEST_STATUS_GROUP_LIMIT) return null;
  if (r.data.length === 0) return null;
  const acc = new Map(days.map((day) => [day, { day, ok: 0, failed: 0 }]));
  for (const item of r.data) {
    if (typeof item !== 'object' || item === null) return null;
    const row = item as Record<string, unknown>;
    const day = typeof row.timestamp === 'string' ? row.timestamp.slice(0, 10) : '';
    const count = row.vercel_request_count_sum;
    if (!DAY_KEY_RE.test(day) || typeof count !== 'number' || !Number.isFinite(count) || count < 0) return null;
    const bucket = acc.get(day);
    if (!bucket) continue;
    const status = Number.parseInt(String(row.http_status ?? ''), 10);
    if (Number.isInteger(status) && status >= 500) bucket.failed += Math.round(count);
    else bucket.ok += Math.round(count);
  }
  return [...acc.values()];
}

/* -------------------------------------------------------------------------- */
/* SLOs — over a REAL denominator only                                        */
/* -------------------------------------------------------------------------- */

/**
 * Three service-level indicators the app can measure honestly, each over a
 * denominator it owns or can name:
 *
 *  - request SUCCESS = responses that were not a server error / all
 *    responses, from Vercel's own production request counts, folded per UTC
 *    day by the scheduled pass (the section above);
 *  - dependency AVAILABILITY = ok probes / all probes, from the daily counters
 *    the evaluator writes (96 samples a day per component);
 *  - cron RELIABILITY = successful runs / runs the schedule called for, the
 *    denominator computed from the schedule itself, so a run that never fired
 *    counts against it exactly as a run that threw.
 *
 * Every row is "Not enough data" below its own floor rather than a figure
 * rounded up from nothing, and a request row older than REQUESTS_STALE_MS
 * says when it was last counted rather than passing an old count off as
 * current.
 */
export const SLO_WINDOW_DAYS = 30;
/** Fewer probes than this and the figure is noise, not a measurement. */
export const SLO_MIN_SAMPLES = 96;
export const SLO_MIN_EXPECTED_RUNS = 3;
/** Fewer responses than this over the window and the figure is noise. */
export const SLO_MIN_REQUESTS = 1000;
/** The request counts are refreshed every scheduled pass; past this the row
 *  names its last update instead of reading as current. */
export const REQUESTS_STALE_MS = 2 * 60 * 60_000;

export type SloTargetSpec = { component: string; label: string; targetPct: number };

export const SLO_TARGETS: readonly SloTargetSpec[] = [
  { component: REQUESTS_COMPONENT, label: 'Requests', targetPct: 99.9 },
  { component: 'database', label: 'Database', targetPct: 99.9 },
  { component: 'auth-database', label: 'Database (sign-in pool)', targetPct: 99.9 },
  { component: 'blob-private', label: 'Files (private store)', targetPct: 99.5 },
  { component: 'blob-public', label: 'Files (public store)', targetPct: 99.5 },
  { component: 'email', label: 'Email', targetPct: 99.0 },
  ...CRON_JOBS.filter((j) => j.name !== 'monitoring').map((j) => ({
    component: cronComponent(j.name),
    label: j.label,
    targetPct: 99.0,
  })),
  { component: cronComponent('monitoring'), label: 'Monitoring', targetPct: 99.0 },
];

export type DailyCounter = {
  component: string;
  /** YYYY-MM-DD, UTC. */
  day: string;
  ok: number;
  failed: number;
  unknown: number;
  /** When the row was last written — a request row's "last counted". */
  updatedAt?: Date | null;
};

export const dayKeyUtc = (at: Date) => at.toISOString().slice(0, 10);

/** Scheduled instants in (from, to] — the cron denominator. */
export function slotsBetween(schedule: CronSchedule, from: Date, to: Date): number {
  if (to.getTime() <= from.getTime()) return 0;
  const first = nextRun(schedule, from);
  if (first.getTime() > to.getTime()) return 0;
  return 1 + Math.floor((to.getTime() - first.getTime()) / schedulePeriodMs(schedule));
}

export type SloStatus = 'met' | 'missed' | 'insufficient';
export type SloKind = 'requests' | 'dependency' | 'cron';

export const sloKindOf = (component: string): SloKind =>
  component === REQUESTS_COMPONENT ? 'requests' : component.startsWith('cron:') ? 'cron' : 'dependency';

export type SloRow = {
  component: string;
  label: string;
  kind: SloKind;
  targetPct: number;
  /** null when insufficient. */
  measuredPct: number | null;
  good: number;
  total: number;
  status: SloStatus;
  /** Failures the target allows over the window vs failures seen. */
  budget: { allowed: number; used: number };
  /** The newest write among the rows folded — null when there were none. */
  updatedAt: Date | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function sloReport({
  daily,
  cronFirstSeen,
  now,
  windowDays = SLO_WINDOW_DAYS,
}: {
  daily: readonly DailyCounter[];
  /** When the monitor first saw each cron — the denominator starts there. */
  cronFirstSeen: ReadonlyMap<string, Date>;
  now: Date;
  windowDays?: number;
}): SloRow[] {
  const since = new Date(now.getTime() - windowDays * 86_400_000);
  const sinceDay = dayKeyUtc(since);
  type Acc = { ok: number; failed: number; unknown: number; updatedAt: Date | null };
  const byComponent = new Map<string, Acc>();
  for (const row of daily) {
    if (row.day < sinceDay) continue;
    const acc = byComponent.get(row.component) ?? { ok: 0, failed: 0, unknown: 0, updatedAt: null };
    acc.ok += row.ok;
    acc.failed += row.failed;
    acc.unknown += row.unknown;
    if (row.updatedAt && (!acc.updatedAt || row.updatedAt.getTime() > acc.updatedAt.getTime())) {
      acc.updatedAt = row.updatedAt;
    }
    byComponent.set(row.component, acc);
  }
  const rows: SloRow[] = [];
  for (const spec of SLO_TARGETS) {
    const acc = byComponent.get(spec.component) ?? { ok: 0, failed: 0, unknown: 0, updatedAt: null };
    const kind = sloKindOf(spec.component);
    let total: number;
    let good: number;
    if (kind === 'cron') {
      const name = spec.component.slice('cron:'.length);
      const job = CRON_JOBS.find((j) => j.name === name);
      const firstSeen = cronFirstSeen.get(spec.component) ?? null;
      const from = firstSeen && firstSeen.getTime() > since.getTime() ? firstSeen : since;
      total = job && firstSeen ? slotsBetween(parseCronSchedule(job.schedule), from, now) : 0;
      good = Math.min(acc.ok, total);
    } else if (kind === 'requests') {
      // A request row is written whole by the fold and never carries an
      // `unknown`: the denominator is every response Vercel counted.
      total = acc.ok + acc.failed;
      good = acc.ok;
    } else {
      total = acc.ok + acc.failed + acc.unknown;
      good = acc.ok;
    }
    const enough =
      kind === 'cron'
        ? total >= SLO_MIN_EXPECTED_RUNS
        : kind === 'requests'
          ? total >= SLO_MIN_REQUESTS
          : total >= SLO_MIN_SAMPLES;
    const measuredPct = enough ? round2((good / total) * 100) : null;
    // The chip and the budget are ONE decision, in integers: failures allowed
    // per ten thousand, so a row can never read "Met" over "over budget by 1"
    // (99.9 of 1,000 responses is exactly one allowed failure, and floating
    // point would have said zero).
    const failBp = Math.round((100 - spec.targetPct) * 100);
    const allowed = Math.floor((total * failBp) / 10_000);
    const used = total - good;
    rows.push({
      component: spec.component,
      label: spec.label,
      kind,
      targetPct: spec.targetPct,
      measuredPct,
      good,
      total,
      status: !enough ? 'insufficient' : used <= allowed ? 'met' : 'missed',
      budget: { allowed, used },
      updatedAt: acc.updatedAt,
    });
  }
  return rows;
}

export const SLO_STATUS_LABELS: Record<SloStatus, string> = {
  met: 'Met',
  missed: 'Missed',
  insufficient: 'Not enough data',
};

export const SLO_STATUS_TONES: Record<SloStatus, string> = {
  met: 'border-foreground/15 bg-foreground/[0.06] text-foreground',
  missed: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  insufficient: 'border-dashed border-foreground/30 bg-transparent text-muted-foreground',
};
