/**
 * Monitoring self-check — every pure decision behind /admin/monitoring, and
 * (with --db) the real write statements against a real Postgres.
 *
 * Run:  node --import tsx scripts/check-monitoring.mts
 *       node --env-file=.env.local --import tsx scripts/check-monitoring.mts --db
 *
 * Why it exists: every mistake this system can make is SILENT. A fingerprint
 * that quietly includes the message stores an applicant's email in a metric
 * row; a weekly cron judged by a daily threshold pages someone on Tuesday; a
 * stale reading that still renders "Healthy" is worse than no page at all; and
 * a duplicate cron invocation (Vercel documents them) that opens two incidents
 * sends two alerts. None of those throw, none show in a filter test, and the
 * page keeps rendering a plausible number over each of them.
 *
 * The pure half pins, against src/lib/monitoringFields.ts:
 *  - the privacy boundary: a built row has EXACTLY the allowlisted columns, no
 *    string column carries an email, a bearer token, a connection string or
 *    the raw message, and the fingerprint is invariant to message content
 *  - the closed grammars for error names, codes, route patterns and message
 *    keys, including the Resend plain-object error and the DrizzleQueryError
 *    whose `.name` is the useless 'Error'
 *  - the schedule parser (accepts exactly the five registered shapes, refuses
 *    the rest), previous/next-run math across the week boundary, and lateness
 *    judged per job — the weekly digest is NOT stale on Thursday
 *  - that CRON_JOBS and vercel.json agree, both ways
 *  - bucket boundaries, the four range windows and the fixed-column fold
 *  - buildSignals at every threshold, the recursion guard (monitoring-alert
 *    counts feed nothing), and the whole incident lifecycle in decideIncidents
 *  - deriveOverallStatus: stale ⇒ unknown, a failed read ⇒ unknown, never
 *    healthy over a stale or failing check
 *  - the alert composers carry the title, the severity and the link and never
 *    the message
 *  - the two Vercel reads: the request-log allowlist (query strings, domains
 *    and foreign log text never survive; our own JSON lines reduce to their
 *    closed field set), the CLI-identical query builders, and the request
 *    counts fold — 5xx is the only failure, a day with no rows is zero, and
 *    an answer that fills the group cap is refused rather than folded short
 *  - the third SLO kind: requests need a thousand responses, count 4xx as
 *    success, and remember when they were last counted
 *
 * The --db half seeds `ZZ-CHECK`-prefixed rows through its own Pool-backed
 * drizzle (the check-activity-log precedent — no `--conditions` flag, no
 * `server-only` import) and proves the statements are idempotent under the
 * concurrency Vercel promises: ten parallel upserts are one row with count
 * ten, two parallel opens are one open incident, two parallel claims have one
 * winner, and a day's request counts raised twice are one row with the
 * values, not doubled — and a lower answer never lowers a stored day. Every
 * row is swept in a finally, on the way in as well.
 *
 * Run this after touching src/lib/monitoringFields.ts, src/db/monitoringStatements.ts,
 * src/lib/vercelApi.ts or the four monitoring tables.
 */
import { readFileSync } from 'node:fs';

import {
  ALERT_CAP_PER_RUN,
  BURST_CRITICAL,
  BURST_WARNING,
  BURST_WINDOW_MS,
  CHECK_STATUSES,
  CRON_GRACE_MS,
  CRON_JOBS,
  DEPENDENCY_CHECKS,
  DEPENDENCY_CONSECUTIVE,
  ERROR_BUCKET_COLUMNS,
  EVALUATOR_SCHEDULE,
  EVALUATOR_STALE_MS,
  GLOBAL_BURST_CRITICAL,
  GLOBAL_BURST_KEY,
  INCIDENT_KINDS,
  MONITORING_RANGES,
  OBSERVED_FAILURES_WARNING,
  OVERALL_STATUSES,
  OVERALL_STATUS_TONES,
  RANGE_SPECS,
  REOPEN_WINDOW_MS,
  RESOLVE_GRACE_MS,
  SCOPE_MAX,
  SEVERITIES,
  bucketRetentionCutoff,
  bucketStartFor,
  buildErrorBucketRow,
  buildSignals,
  checkOutcomeRow,
  classifyComponent,
  composeIncidentEmail,
  composeRecoveryEmail,
  cronComponent,
  cronHealth,
  decideIncidents,
  deriveOverallStatus,
  describeSchedule,
  errorCode,
  fingerprintFor,
  foldSeries,
  incidentRetentionCutoff,
  isFailingStatus,
  isMonitoringRange,
  messageKey,
  nextRun,
  normalizeRoutePath,
  parseCronSchedule,
  parseRange,
  previousRun,
  rangeWindow,
  relativeAge,
  safeErrorName,
  safeToken,
  schedulePeriodMs,
  vercelLinks,
  dayKeyUtc,
  foldRequestCounts,
  newestRequestRows,
  parseRequestLogAnswer,
  parseRequestLogRow,
  requestCountsQuery,
  requestLogsUrl,
  slotsBetween,
  sloKindOf,
  sloReport,
  summarizeRecentLogs,
  RECENT_LOGS_MAX_ROWS,
  RECENT_LOGS_MINUTES,
  RECENT_LOGS_TIMEOUT_MS,
  REQUEST_STATUS_GROUP_LIMIT,
  REQUESTS_COMPONENT,
  REQUESTS_STALE_MS,
  SLO_MIN_REQUESTS,
  SLO_MIN_SAMPLES,
  SLO_MIN_EXPECTED_RUNS,
  SLO_TARGETS,
  VERCEL_TEAM_ID,
  type IncidentSignal,
  type SafeRequestRow,
} from '@/lib/monitoringFields';

let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : ` want=${JSON.stringify(want)}`}`,
  );
};
const throws = (label: string, fn: () => unknown) => {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  eq(label, threw, true);
};
const section = (name: string) => console.log(`\n— ${name}`);

const T = (iso: string) => new Date(iso);

// ------------------------------------------------------------- vocabulary --
section('vocabulary');

eq('four sources', ['request', 'action', 'dependency', 'cron'].length, 4);
eq('check statuses include unknown (never green when unchecked)', CHECK_STATUSES.includes('unknown'), true);
eq('overall statuses', [...OVERALL_STATUSES], ['healthy', 'degraded', 'incident', 'unknown']);
eq('every overall status has a tone', OVERALL_STATUSES.filter((s) => !OVERALL_STATUS_TONES[s]), []);
eq('three severities', [...SEVERITIES], ['info', 'warning', 'critical']);
eq('three incident kinds', [...INCIDENT_KINDS], ['error_burst', 'dependency', 'cron']);
eq('six probed dependencies', DEPENDENCY_CHECKS.length, 6);
eq(
  'the two database transports are critical, nothing else is',
  DEPENDENCY_CHECKS.filter((c) => c.critical).map((c) => c.component),
  ['database', 'auth-database'],
);

// ------------------------------------------------------- cron registry ----
section('cron registry ↔ vercel.json');

const vercelJson = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  crons: { path: string; schedule: string }[];
};
eq(
  'every registered job is in vercel.json with the same schedule',
  CRON_JOBS.filter(
    (job) => !vercelJson.crons.some((c) => c.path === job.path && c.schedule === job.schedule),
  ).map((j) => j.name),
  [],
);
eq(
  'every vercel.json cron is registered (nothing runs unwatched)',
  vercelJson.crons.filter((c) => !CRON_JOBS.some((j) => j.path === c.path)).map((c) => c.path),
  [],
);
eq('the evaluator schedule is the registered one', CRON_JOBS.find((j) => j.name === 'monitoring')?.schedule, EVALUATOR_SCHEDULE);
eq('stale threshold is more than two evaluator periods', EVALUATOR_STALE_MS > 2 * schedulePeriodMs(parseCronSchedule(EVALUATOR_SCHEDULE)), true);
eq('cron component key', cronComponent('weekly-digest'), 'cron:weekly-digest');
eq('every registered schedule parses', CRON_JOBS.filter((j) => { try { parseCronSchedule(j.schedule); return false; } catch { return true; } }), []);

// ------------------------------------------------------- schedule parser ---
section('parseCronSchedule — the four shapes, nothing else');

eq('*/15', parseCronSchedule('*/15 * * * *'), { kind: 'every', minutes: 15 });
eq('0 14 * * *', parseCronSchedule('0 14 * * *'), { kind: 'daily', hour: 14, minute: 0 });
eq('0 15 * * 1', parseCronSchedule('0 15 * * 1'), { kind: 'weekly', weekday: 1, hour: 15, minute: 0 });
eq('30 * * * *', parseCronSchedule('30 * * * *'), { kind: 'hourly', minute: 30 });
eq('7 = Sunday, folded to 0', parseCronSchedule('0 9 * * 7'), { kind: 'weekly', weekday: 0, hour: 9, minute: 0 });
throws('day-of-month refused (0 0 1 * *)', () => parseCronSchedule('0 0 1 * *'));
throws('uneven every refused (*/7)', () => parseCronSchedule('*/7 * * * *'));
throws('hour 25 refused', () => parseCronSchedule('0 25 * * *'));
throws('weekday range refused (1-5)', () => parseCronSchedule('0 15 * * 1-5'));
throws('six fields refused', () => parseCronSchedule('0 0 15 * * *'));
throws('junk refused', () => parseCronSchedule('every monday'));
eq('describe every', describeSchedule({ kind: 'every', minutes: 15 }), 'Every 15 minutes');
eq('describe daily says UTC', describeSchedule({ kind: 'daily', hour: 15, minute: 0 }), 'Daily at 15:00 UTC');
eq('describe weekly names the day', describeSchedule({ kind: 'weekly', weekday: 1, hour: 15, minute: 0 }), 'Mondays at 15:00 UTC');

// -------------------------------------------------------- run arithmetic --
section('previousRun / nextRun (UTC, across the week boundary)');

const every15 = parseCronSchedule('*/15 * * * *');
const daily14 = parseCronSchedule('0 14 * * *');
const mon15 = parseCronSchedule('0 15 * * 1');
// 2026-08-27 is a Thursday.
eq('every: 10:07:30 → 10:00', previousRun(every15, T('2026-08-27T10:07:30Z')).toISOString(), '2026-08-27T10:00:00.000Z');
eq('every: next after 10:07:30 → 10:15', nextRun(every15, T('2026-08-27T10:07:30Z')).toISOString(), '2026-08-27T10:15:00.000Z');
eq('every: exactly on the slot is that slot', previousRun(every15, T('2026-08-27T10:15:00Z')).toISOString(), '2026-08-27T10:15:00.000Z');
eq('daily: 13:59 → yesterday 14:00', previousRun(daily14, T('2026-08-27T13:59:00Z')).toISOString(), '2026-08-26T14:00:00.000Z');
eq('daily: 14:00:00 → today 14:00', previousRun(daily14, T('2026-08-27T14:00:00Z')).toISOString(), '2026-08-27T14:00:00.000Z');
eq('daily: next after 13:59 → today 14:00', nextRun(daily14, T('2026-08-27T13:59:00Z')).toISOString(), '2026-08-27T14:00:00.000Z');
eq('weekly: Thursday → last Monday', previousRun(mon15, T('2026-08-27T10:00:00Z')).toISOString(), '2026-08-24T15:00:00.000Z');
eq('weekly: Thursday → next Monday', nextRun(mon15, T('2026-08-27T10:00:00Z')).toISOString(), '2026-08-31T15:00:00.000Z');
eq('weekly: Monday 14:59 → the Monday before', previousRun(mon15, T('2026-08-24T14:59:00Z')).toISOString(), '2026-08-17T15:00:00.000Z');
eq('weekly: Monday 15:00 → today', previousRun(mon15, T('2026-08-24T15:00:00Z')).toISOString(), '2026-08-24T15:00:00.000Z');
eq('weekly: Sunday → the Monday six days back', previousRun(mon15, T('2026-08-30T23:00:00Z')).toISOString(), '2026-08-24T15:00:00.000Z');
eq('period: weekly is seven days', schedulePeriodMs(mon15), 7 * 86_400_000);

// ----------------------------------------------------------- cron health --
section('cronHealth — lateness judged per job, never one threshold');

const okDaily = cronHealth({ schedule: daily14, lastRunAt: T('2026-08-26T14:00:20Z'), lastStatus: 'ok', consecutiveFailures: 0, firstSeenAt: T('2026-08-01T00:00:00Z'), now: T('2026-08-27T14:10:00Z') });
eq('daily inside grace is on time', okDaily.state, 'ok');
eq('daily 31 min late is missed once (warning)', cronHealth({ schedule: daily14, lastRunAt: T('2026-08-26T14:00:20Z'), lastStatus: 'ok', consecutiveFailures: 0, firstSeenAt: null, now: T('2026-08-27T14:31:00Z') }), {
  state: 'missed', severity: 'warning', expectedAt: T('2026-08-27T14:00:00Z'), nextAt: T('2026-08-28T14:00:00Z'), missedRuns: 1,
});
eq('daily missed twice is critical', cronHealth({ schedule: daily14, lastRunAt: T('2026-08-26T14:00:20Z'), lastStatus: 'ok', consecutiveFailures: 0, firstSeenAt: null, now: T('2026-08-28T14:31:00Z') }).missedRuns, 2);
eq('daily missed twice is critical (severity)', cronHealth({ schedule: daily14, lastRunAt: T('2026-08-26T14:00:20Z'), lastStatus: 'ok', consecutiveFailures: 0, firstSeenAt: null, now: T('2026-08-28T14:31:00Z') }).severity, 'critical');
// THE case the brief names: a weekly job three days after its slot is fine.
eq('weekly digest on Thursday is NOT stale', cronHealth({ schedule: mon15, lastRunAt: T('2026-08-24T15:00:10Z'), lastStatus: 'ok', consecutiveFailures: 0, firstSeenAt: null, now: T('2026-08-27T10:00:00Z') }).state, 'ok');
eq('weekly digest Monday 15:31 with no run is missed', cronHealth({ schedule: mon15, lastRunAt: T('2026-08-24T15:00:10Z'), lastStatus: 'ok', consecutiveFailures: 0, firstSeenAt: null, now: T('2026-08-31T15:31:00Z') }), {
  state: 'missed', severity: 'warning', expectedAt: T('2026-08-31T15:00:00Z'), nextAt: T('2026-09-07T15:00:00Z'), missedRuns: 1,
});
eq('a 15-minute job that skipped three slots is missed, not on time', cronHealth({ schedule: every15, lastRunAt: T('2026-08-27T10:00:05Z'), lastStatus: 'ok', consecutiveFailures: 0, firstSeenAt: null, now: T('2026-08-27T10:46:00Z') }).state, 'missed');
eq('a 15-minute job 20 min after its run is fine', cronHealth({ schedule: every15, lastRunAt: T('2026-08-27T10:00:05Z'), lastStatus: 'ok', consecutiveFailures: 0, firstSeenAt: null, now: T('2026-08-27T10:20:00Z') }).state, 'ok');
eq('last run failed → failed (warning)', cronHealth({ schedule: daily14, lastRunAt: T('2026-08-27T14:00:20Z'), lastStatus: 'failed', consecutiveFailures: 1, firstSeenAt: null, now: T('2026-08-27T14:10:00Z') }).severity, 'warning');
eq('two failures in a row → critical', cronHealth({ schedule: daily14, lastRunAt: T('2026-08-27T14:00:20Z'), lastStatus: 'failed', consecutiveFailures: 2, firstSeenAt: null, now: T('2026-08-27T14:10:00Z') }).severity, 'critical');
eq('never ran, first slot not yet due → pending', cronHealth({ schedule: daily14, lastRunAt: null, lastStatus: null, consecutiveFailures: 0, firstSeenAt: T('2026-08-27T10:00:00Z'), now: T('2026-08-27T13:00:00Z') }).state, 'pending');
eq('never ran, first slot passed + grace → missed', cronHealth({ schedule: daily14, lastRunAt: null, lastStatus: null, consecutiveFailures: 0, firstSeenAt: T('2026-08-27T10:00:00Z'), now: T('2026-08-27T14:31:00Z') }).state, 'missed');
eq('never ran and never seen → pending (nothing to judge from)', cronHealth({ schedule: daily14, lastRunAt: null, lastStatus: null, consecutiveFailures: 0, firstSeenAt: null, now: T('2026-08-27T14:31:00Z') }).state, 'pending');
eq('grace is 30 minutes', CRON_GRACE_MS, 30 * 60_000);

// ------------------------------------------------------------- buckets ----
section('buckets, ranges, series');

eq('12:04:59.999 → 12:00', bucketStartFor(T('2026-08-27T12:04:59.999Z')).toISOString(), '2026-08-27T12:00:00.000Z');
eq('12:05:00 → 12:05', bucketStartFor(T('2026-08-27T12:05:00.000Z')).toISOString(), '2026-08-27T12:05:00.000Z');
eq('four ranges', [...MONITORING_RANGES], ['1h', '24h', '7d', '30d']);
eq('junk range falls back to 24h', parseRange('1y'), '24h');
eq('isMonitoringRange rejects junk', isMonitoringRange('7 days'), false);
for (const range of MONITORING_RANGES) {
  const spec = RANGE_SPECS[range];
  eq(`${range}: steps × step = window`, spec.steps * spec.stepMs, spec.windowMs);
}
const now = T('2026-08-27T12:07:00Z');
const win = rangeWindow('1h', now);
eq('1h window ends at the close of the current bucket', win.until.toISOString(), '2026-08-27T12:10:00.000Z');
eq('1h window starts an hour before', win.since.toISOString(), '2026-08-27T11:10:00.000Z');
eq('previous window abuts', win.previousSince.toISOString(), '2026-08-27T10:10:00.000Z');
const series = foldSeries(
  [
    { bucketStart: T('2026-08-27T11:10:00Z'), count: 2 },
    { bucketStart: T('2026-08-27T11:12:00Z'), count: 1 }, // same 5-min step
    { bucketStart: T('2026-08-27T12:05:00Z'), count: 7 }, // last step
    { bucketStart: T('2026-08-27T11:05:00Z'), count: 99 }, // before the window
    { bucketStart: T('2026-08-27T12:10:00Z'), count: 99 }, // after the window
  ],
  '1h',
  now,
);
eq('1h series has 12 columns', series.length, 12);
eq('first column sums its rows', series[0].count, 3);
eq('last column holds the newest bucket', series[11].count, 7);
eq('out-of-window rows are ignored', series.reduce((s, p) => s + p.count, 0), 10);
eq('30d series has 30 columns', foldSeries([], '30d', now).length, 30);
eq('bucket retention is 30 days', (now.getTime() - bucketRetentionCutoff(now).getTime()) / 86_400_000, 30);
eq('incident retention is 90 days', (now.getTime() - incidentRetentionCutoff(now).getTime()) / 86_400_000, 90);

// -------------------------------------------------- error name and code ---
section('safeErrorName / errorCode / classifyComponent');

class DrizzleQueryError extends Error {
  query = 'select 1 where email = $1';
  params = ['someone@example.com'];
  constructor() {
    super('Failed query: select 1 where email = $1\nparams: someone@example.com');
    this.name = 'Error'; // exactly what drizzle does
  }
}
eq('a TypeError is a TypeError', safeErrorName(new TypeError('x')), 'TypeError');
eq('DrizzleQueryError is read off the constructor, not .name', safeErrorName(new DrizzleQueryError()), 'DrizzleQueryError');
eq('the Resend plain object keeps its code name', safeErrorName({ message: 'to someone@example.com', statusCode: 422, name: 'validation_error' }), 'validation_error');
eq('a string throw is NonError', safeErrorName('boom'), 'NonError');
eq('undefined is NonError', safeErrorName(undefined), 'NonError');
eq('a name with spaces is refused', safeErrorName({ name: 'bad name!' }), 'Error');
eq('an over-long name is refused', safeErrorName({ name: 'x'.repeat(70) }), 'Error');
eq('a bare Error is Error', safeErrorName(new Error('x')), 'Error');

eq('SQLSTATE on the cause chain', errorCode({ cause: { code: '23505' } }), '23505');
eq('Node code', errorCode(Object.assign(new Error('x'), { code: 'ECONNRESET' })), 'ECONNRESET');
eq('HTTP status', errorCode({ statusCode: 404 }), '404');
eq('null statusCode is not a code', errorCode({ statusCode: null, name: 'validation_error' }), null);
eq('a message-shaped code is refused', errorCode({ code: 'select * from users where email = x' }), null);
eq('a lowercase code is refused', errorCode({ code: 'econnreset' }), null);
eq('cause walk is bounded', errorCode({ cause: { cause: { cause: { cause: { cause: { cause: { cause: { code: '23505' } } } } } } } }), null);

eq('NeonDbError → database', classifyComponent('NeonDbError', null), 'database');
eq('DrizzleQueryError → database', classifyComponent('DrizzleQueryError', null), 'database');
eq('a SQLSTATE → database', classifyComponent('Error', '23505'), 'database');
eq('BlobAccessError → blob', classifyComponent('BlobAccessError', null), 'blob');
eq('BlobServiceRateLimited → blob', classifyComponent('BlobServiceRateLimited', null), 'blob');
eq('BlobServiceNotAvailable → blob (no Error suffix)', classifyComponent('BlobServiceNotAvailable', null), 'blob');
eq('a bare Blob is not a blob error', classifyComponent('Blob', null), null);
eq('WebPushError → push', classifyComponent('WebPushError', null), 'push');
eq('TypeError → nothing', classifyComponent('TypeError', null), null);
eq('a Node code alone → nothing', classifyComponent('Error', 'ECONNRESET'), null);

// ------------------------------------------------------- scope grammars ---
section('normalizeRoutePath / messageKey / safeToken');

eq('a route pattern survives', normalizeRoutePath('/admin/reports/[slug]'), '/admin/reports/[slug]');
eq('a query string is cut', normalizeRoutePath('/admin/tasks?q=secret'), '/admin/tasks');
eq('a fragment is cut', normalizeRoutePath('/admin/tasks#x'), '/admin/tasks');
eq('a route group survives', normalizeRoutePath('/(admin)/admin/(protected)/tasks'), '/(admin)/admin/(protected)/tasks');
eq('no leading slash → unknown', normalizeRoutePath('admin'), 'unknown');
eq('a space → unknown', normalizeRoutePath('/x y'), 'unknown');
eq('undefined → unknown', normalizeRoutePath(undefined), 'unknown');
eq('over-long paths are cut to SCOPE_MAX', normalizeRoutePath(`/${'a'.repeat(200)}`).length, SCOPE_MAX);
eq('a message key survives', messageKey('[tasks] createTask failed'), '[tasks] createTask failed');
eq('the em-dash push message survives', messageKey('[push] VAPID rejected — keys rotated or misconfigured'), '[push] VAPID rejected — keys rotated or misconfigured');
eq('an exception message is not a key', messageKey('Failed query: select 1\nparams: x'), 'unknown');
eq('a key with an email is not a key', messageKey('[notify] email failed for someone@example.com'), 'unknown');
eq('a non-string is not a key', messageKey(undefined), 'unknown');
eq('a Vercel request id is a token', safeToken('sfo1::iad1::abcd-1690000000000-abcdef123456', 64), 'sfo1::iad1::abcd-1690000000000-abcdef123456');
eq('a deployment id is a token', safeToken('dpl_7Gw5ZMBpQA8h9GF832KGp7nwbuh3', 40), 'dpl_7Gw5ZMBpQA8h9GF832KGp7nwbuh3');
eq('a digest is a token', safeToken('1234567890', 40), '1234567890');
eq('a token with a space is refused', safeToken('abc def', 64), null);
eq('a token over max is refused', safeToken('a'.repeat(65), 64), null);
eq('a NEXT_HTTP_ERROR_FALLBACK;404 digest is refused (semicolon)', safeToken('NEXT_HTTP_ERROR_FALLBACK;404', 40), null);

// --------------------------------------------------------- fingerprint ----
section('fingerprintFor — deterministic, message-blind');

const base = { source: 'request' as const, scope: '/admin/tasks', routeType: 'render', errorName: 'TypeError', code: null };
eq('16 hex chars', /^[0-9a-f]{16}$/.test(fingerprintFor(base)), true);
eq('deterministic', fingerprintFor(base), fingerprintFor({ ...base }));
eq('scope changes it', fingerprintFor(base) === fingerprintFor({ ...base, scope: '/admin/reports' }), false);
eq('error name changes it', fingerprintFor(base) === fingerprintFor({ ...base, errorName: 'RangeError' }), false);
eq('code changes it', fingerprintFor(base) === fingerprintFor({ ...base, code: '23505' }), false);
eq('route type changes it', fingerprintFor(base) === fingerprintFor({ ...base, routeType: 'action' }), false);
eq('source changes it', fingerprintFor(base) === fingerprintFor({ ...base, source: 'action' }), false);
eq('pinned value (a change here is a change to every stored group)', fingerprintFor(base), fingerprintFor({ source: 'request', scope: '/admin/tasks', routeType: 'render', errorName: 'TypeError', code: null }));

// ------------------------------------------------ the privacy boundary ----
section('buildErrorBucketRow — the privacy boundary');

const LEAKY_MESSAGE = 'Failed query: insert into contact_submissions ... params: someone@example.com,Bearer sk_live_abc,postgres://user:pass@host/db,eyJhbGciOi';
const leaky = Object.assign(new TypeError(LEAKY_MESSAGE), { digest: '4242424242', params: ['someone@example.com'] });
const rowA = buildErrorBucketRow({
  source: 'request', scope: '/admin/reports/[slug]', routeType: 'render', error: leaky,
  environment: 'production', deployment: 'dpl_abc123', requestId: 'sfo1::iad1::x-1-y', at: T('2026-08-27T12:07:00Z'),
});
eq('a row has exactly the allowlisted columns', Object.keys(rowA).sort(), [...ERROR_BUCKET_COLUMNS].sort());
const FORBIDDEN: [RegExp, string][] = [
  [/@[\w.-]+\.\w+/, 'an email address'],
  [/Bearer /, 'a bearer token'],
  [/postgres:\/\//, 'a connection string'],
  [/eyJ/, 'a JWT'],
  [/params:/, 'bound parameters'],
  [/Failed query/, 'the raw message'],
];
for (const [key, value] of Object.entries(rowA)) {
  if (typeof value !== 'string') continue;
  for (const [re, what] of FORBIDDEN) eq(`${key} carries no ${what}`, re.test(value), false);
}
eq('bucketed to five minutes', rowA.bucketStart.toISOString(), '2026-08-27T12:05:00.000Z');
eq('the name is the class', rowA.errorName, 'TypeError');
eq('the route pattern is the scope', rowA.scope, '/admin/reports/[slug]');
eq('the digest is kept (it is the id on the user’s screen)', rowA.lastDigest, '4242424242');
eq('the request id is kept', rowA.lastRequestId, 'sfo1::iad1::x-1-y');
eq('first and last deployment start equal', rowA.firstDeployment === rowA.lastDeployment && rowA.lastDeployment === 'dpl_abc123', true);
eq('no component for a TypeError', rowA.component, null);
const rowB = buildErrorBucketRow({ ...{ source: 'request' as const, scope: '/admin/reports/[slug]', routeType: 'render', environment: 'production' }, error: new TypeError('a completely different message with other@example.com') });
eq('two messages, one fingerprint', rowA.fingerprint, rowB.fingerprint);
eq('junk environment → development', buildErrorBucketRow({ source: 'request', scope: '/x', error: new Error('x'), environment: 'staging' }).environment, 'development');
eq('junk routeType → null', buildErrorBucketRow({ source: 'request', scope: '/x', routeType: 'edge', error: new Error('x'), environment: 'production' }).routeType, null);
eq('proxy routeType is accepted', buildErrorBucketRow({ source: 'request', scope: '/x', routeType: 'proxy', error: new Error('x'), environment: 'production' }).routeType, 'proxy');
eq('an action row is keyed by the message literal', buildErrorBucketRow({ source: 'action', scope: '[tasks] createTask failed', error: new DrizzleQueryError(), environment: 'production' }).scope, '[tasks] createTask failed');
eq('an action row classifies the database from the class', buildErrorBucketRow({ source: 'action', scope: '[tasks] createTask failed', error: new DrizzleQueryError(), environment: 'production' }).component, 'database');
eq('an action row with a junk key is unknown', buildErrorBucketRow({ source: 'action', scope: 'whatever happened', error: new Error('x'), environment: 'production' }).scope, 'unknown');
eq('a dependency row must name a component', buildErrorBucketRow({ source: 'dependency', scope: 'email', component: 'email', error: { name: 'validation_error', statusCode: 422 }, environment: 'production' }).scope, 'email');
eq('a dependency row keeps the explicit component', buildErrorBucketRow({ source: 'dependency', scope: 'email', component: 'email', error: { name: 'validation_error', statusCode: 422 }, environment: 'production' }).component, 'email');
eq('a dependency row keeps the HTTP status as code', buildErrorBucketRow({ source: 'dependency', scope: 'email', component: 'email', error: { name: 'validation_error', statusCode: 422 }, environment: 'production' }).code, '422');
eq('a cron row must name a registered job', buildErrorBucketRow({ source: 'cron', scope: 'not-a-job', error: new Error('x'), environment: 'production' }).scope, 'unknown');
eq('a cron row keeps a registered job', buildErrorBucketRow({ source: 'cron', scope: 'weekly-digest', error: new Error('x'), environment: 'production' }).scope, 'weekly-digest');
eq('a request id with a space is dropped', buildErrorBucketRow({ source: 'request', scope: '/x', error: new Error('x'), environment: 'production', requestId: 'has a space' }).lastRequestId, null);
eq('a non-Error throw still builds', buildErrorBucketRow({ source: 'request', scope: '/x', error: 'boom', environment: 'production' }).errorName, 'NonError');

// ------------------------------------------------------------- checks -----
section('checkOutcomeRow — bounds (the streak itself is folded in SQL, see --db)');

const outcome = checkOutcomeRow('database', 'dependency', { status: 'failed', durationMs: 4001.4, errorName: 'NeonDbError', detail: 'Timed out' }, now);
eq('duration is rounded', outcome.durationMs, 4001);
eq('checkedAt is now', outcome.checkedAt.toISOString(), now.toISOString());
eq('a negative duration is clamped', checkOutcomeRow('x', 'cron', { status: 'ok', durationMs: -5, errorName: null, detail: null }, now).durationMs, 0);
eq('a detail is bounded', checkOutcomeRow('x', 'cron', { status: 'ok', durationMs: 1, errorName: null, detail: 'y'.repeat(500) }, now).detail?.length, 160);
eq('an error name is re-validated', checkOutcomeRow('x', 'cron', { status: 'failed', durationMs: 1, errorName: 'not a name!', detail: null }, now).errorName, 'Error');
eq('failed and unknown are failing statuses', [isFailingStatus('failed'), isFailingStatus('unknown'), isFailingStatus('ok'), isFailingStatus('unconfigured')], [true, true, false, false]);

// ------------------------------------------------------------ signals -----
section('buildSignals — every threshold');

const burst = (count: number, fingerprint = 'f1'): Parameters<typeof buildSignals>[0]['bursts'][number] => ({
  fingerprint, source: 'request', scope: '/admin/tasks', errorName: 'TypeError', count, deployment: 'dpl_1', lastRequestId: null, lastDigest: null,
});
const noSignals = { probes: [], observed: [], bursts: [], crons: [], environment: 'production' as const };
eq('nothing → nothing', buildSignals(noSignals), []);
eq(`${BURST_WARNING - 1} in a window → nothing`, buildSignals({ ...noSignals, bursts: [burst(BURST_WARNING - 1)] }), []);
eq(`${BURST_WARNING} in a window → warning`, buildSignals({ ...noSignals, bursts: [burst(BURST_WARNING)] }).map((s) => [s.kind, s.key, s.severity]), [['error_burst', 'f1', 'warning']]);
eq(`${BURST_CRITICAL} in a window → critical`, buildSignals({ ...noSignals, bursts: [burst(BURST_CRITICAL)] })[0].severity, 'critical');
eq('a burst title is class + route', buildSignals({ ...noSignals, bursts: [burst(BURST_WARNING)] })[0].title, 'TypeError on /admin/tasks');
eq('a burst detail is a count and a window', buildSignals({ ...noSignals, bursts: [burst(BURST_WARNING)] })[0].detail, `${BURST_WARNING} in the last ${BURST_WINDOW_MS / 60_000} minutes`);
const spread = buildSignals({ ...noSignals, bursts: Array.from({ length: 10 }, (_, i) => burst(2, `f${i}`)) });
eq('twenty errors across ten groups of two → only the global critical', spread.map((s) => [s.key, s.severity]), [[GLOBAL_BURST_KEY, 'critical']]);
eq(`${GLOBAL_BURST_CRITICAL - 1} spread thin → nothing`, buildSignals({ ...noSignals, bursts: Array.from({ length: GLOBAL_BURST_CRITICAL - 1 }, (_, i) => burst(1, `g${i}`)) }), []);
eq('dependency-source rows never count as a burst', buildSignals({ ...noSignals, bursts: [{ ...burst(50), source: 'dependency' }] }), []);

const probe = (component: (typeof DEPENDENCY_CHECKS)[number]['component'], status: (typeof CHECK_STATUSES)[number], streak: number) => ({ component, status, consecutiveFailures: streak, errorName: status === 'failed' ? 'NeonDbError' : null });
eq('one failed probe → nothing yet', buildSignals({ ...noSignals, probes: [probe('database', 'failed', 1)] }), []);
eq(`${DEPENDENCY_CONSECUTIVE} failed database probes → critical`, buildSignals({ ...noSignals, probes: [probe('database', 'failed', DEPENDENCY_CONSECUTIVE)] }).map((s) => [s.kind, s.key, s.severity]), [['dependency', 'database', 'critical']]);
eq('two failed blob probes → warning', buildSignals({ ...noSignals, probes: [probe('blob-public', 'failed', 2)] })[0].severity, 'warning');
eq('two unknown probes → warning, worded as not completing', buildSignals({ ...noSignals, probes: [probe('email', 'unknown', 2)] })[0].title, 'Email check is not completing');
eq('unconfigured in production → warning', buildSignals({ ...noSignals, probes: [probe('push', 'unconfigured', 0)] })[0].severity, 'warning');
eq('unconfigured in development → nothing', buildSignals({ ...noSignals, environment: 'development', probes: [probe('push', 'unconfigured', 0)] }), []);
eq(`${OBSERVED_FAILURES_WARNING - 1} observed email failures → nothing`, buildSignals({ ...noSignals, observed: [{ component: 'email', count: OBSERVED_FAILURES_WARNING - 1 }] }), []);
eq(`${OBSERVED_FAILURES_WARNING} observed email failures → warning`, buildSignals({ ...noSignals, observed: [{ component: 'email', count: OBSERVED_FAILURES_WARNING }] }).map((s) => [s.key, s.severity, s.title]), [['email', 'warning', 'Email is failing in use']]);
eq('blob failures count against BOTH file checks', buildSignals({ ...noSignals, observed: [{ component: 'blob', count: 3 }] }).map((s) => s.key), ['blob-private', 'blob-public']);
eq('probe + observed fold to one signal at the higher severity', buildSignals({ ...noSignals, probes: [probe('database', 'failed', 2)], observed: [{ component: 'database', count: 9 }] }).map((s) => [s.key, s.severity]), [['database', 'critical']]);
eq('…whose detail carries both readings', buildSignals({ ...noSignals, probes: [probe('database', 'failed', 2)], observed: [{ component: 'database', count: 9 }] })[0].detail, 'Failed 2 checks in a row · NeonDbError · 9 failures in the last hour');
eq('monitoring-alert failures feed no rule (the recursion guard)', buildSignals({ ...noSignals, observed: [{ component: 'monitoring-alert', count: 50 }] }), []);
eq('an unknown observed component feeds no rule', buildSignals({ ...noSignals, observed: [{ component: 'unknown', count: 50 }] }), []);

const missedHealth = cronHealth({ schedule: mon15, lastRunAt: T('2026-08-24T15:00:10Z'), lastStatus: 'ok', consecutiveFailures: 0, firstSeenAt: null, now: T('2026-08-31T15:31:00Z') });
eq('a missed cron is a warning with the expected slot', buildSignals({ ...noSignals, crons: [{ name: 'weekly-digest', health: missedHealth, consecutiveFailures: 0, errorName: null }] }).map((s) => [s.kind, s.key, s.severity, s.title, s.detail]), [['cron', 'weekly-digest', 'warning', 'Weekly digest did not run', 'Expected at 15:00 UTC · 1 run missed']]);
const failedHealth = cronHealth({ schedule: daily14, lastRunAt: T('2026-08-27T14:00:20Z'), lastStatus: 'failed', consecutiveFailures: 2, firstSeenAt: null, now: T('2026-08-27T14:10:00Z') });
eq('a twice-failed cron is critical', buildSignals({ ...noSignals, crons: [{ name: 'due-reminders', health: failedHealth, consecutiveFailures: 2, errorName: 'NeonDbError' }] }).map((s) => [s.severity, s.title, s.detail]), [['critical', 'Due reminders failed', 'Failed 2 runs in a row · NeonDbError']]);
const okHealth = cronHealth({ schedule: daily14, lastRunAt: T('2026-08-27T14:00:20Z'), lastStatus: 'ok', consecutiveFailures: 0, firstSeenAt: null, now: T('2026-08-27T14:10:00Z') });
eq('an on-time cron is silent', buildSignals({ ...noSignals, crons: [{ name: 'due-reminders', health: okHealth, consecutiveFailures: 0, errorName: null }] }), []);

// ---------------------------------------------------------- incidents -----
section('decideIncidents — open / touch / escalate / cool / resolve / reopen');

const sig = (key: string, severity: 'warning' | 'critical' = 'warning'): IncidentSignal => ({
  kind: 'error_burst', key, component: '/admin/tasks', severity, title: `TypeError on /admin/tasks`, detail: '5 in the last 15 minutes', deployment: null, lastRequestId: null, lastDigest: null,
});
const t0 = T('2026-08-27T12:00:00Z');
eq('a new signal opens', decideIncidents({ signals: [sig('a')], open: [], recentlyResolved: [], now: t0 }).open.map((s) => s.key), ['a']);
eq('the same signal twice opens once', decideIncidents({ signals: [sig('a'), sig('a')], open: [], recentlyResolved: [], now: t0 }).open.length, 1);
const openA = { id: 'row-a', kind: 'error_burst' as const, key: 'a', severity: 'warning' as const, lastSeenAt: t0 };
eq('an existing open row is touched, not reopened', decideIncidents({ signals: [sig('a')], open: [openA], recentlyResolved: [], now: t0 }).touch.map((t) => [t.id, t.escalate]), [['row-a', false]]);
eq('warning → critical escalates', decideIncidents({ signals: [sig('a', 'critical')], open: [openA], recentlyResolved: [], now: t0 }).touch[0].escalate, true);
eq('critical → warning does not de-escalate', decideIncidents({ signals: [sig('a')], open: [{ ...openA, severity: 'critical' }], recentlyResolved: [], now: t0 }).touch[0].escalate, false);
eq('a burst gone quiet inside its grace cools', decideIncidents({ signals: [], open: [openA], recentlyResolved: [], now: new Date(t0.getTime() + RESOLVE_GRACE_MS.error_burst - 1) }).cooling.map((c) => c.id), ['row-a']);
eq('a burst quiet for the whole grace resolves', decideIncidents({ signals: [], open: [openA], recentlyResolved: [], now: new Date(t0.getTime() + RESOLVE_GRACE_MS.error_burst) }).resolve.map((c) => c.id), ['row-a']);
eq('a dependency incident resolves on the first clean reading', decideIncidents({ signals: [], open: [{ ...openA, kind: 'dependency', key: 'database' }], recentlyResolved: [], now: t0 }).resolve.length, 1);
eq('a cron incident resolves on the first clean reading', decideIncidents({ signals: [], open: [{ ...openA, kind: 'cron', key: 'due-reminders' }], recentlyResolved: [], now: t0 }).resolve.length, 1);
const resolvedA = { id: 'row-a', kind: 'error_burst' as const, key: 'a', resolvedAt: t0 };
eq('a key resolved inside the reopen window reopens, no new row', decideIncidents({ signals: [sig('a')], open: [], recentlyResolved: [resolvedA], now: new Date(t0.getTime() + REOPEN_WINDOW_MS - 1) }).reopen.map((r) => r.id), ['row-a']);
eq('…and opens nothing', decideIncidents({ signals: [sig('a')], open: [], recentlyResolved: [resolvedA], now: new Date(t0.getTime() + REOPEN_WINDOW_MS - 1) }).open, []);
eq('a key resolved past the window opens fresh', decideIncidents({ signals: [sig('a')], open: [], recentlyResolved: [resolvedA], now: new Date(t0.getTime() + REOPEN_WINDOW_MS) }).open.length, 1);
eq('a different kind with the same key is a different incident', decideIncidents({ signals: [{ ...sig('a'), kind: 'dependency' }], open: [openA], recentlyResolved: [], now: t0 }).open.length, 1);
eq('alert cap is small', ALERT_CAP_PER_RUN <= 5, true);

// ------------------------------------------------------ overall status ----
section('deriveOverallStatus — never green on stale');

const fresh = new Date(now.getTime() - 60_000);
const stale = new Date(now.getTime() - EVALUATOR_STALE_MS - 1);
const okChecks = DEPENDENCY_CHECKS.map((c) => ({ component: c.component, status: 'ok' as const }));
eq('all ok, nothing open, fresh → healthy', deriveOverallStatus({ checks: okChecks, openIncidents: [], lastCheckedAt: fresh, now }).status, 'healthy');
eq('a failed page read → unknown, whatever else is true', deriveOverallStatus({ checks: okChecks, openIncidents: [], lastCheckedAt: fresh, sectionsFailed: 1, now }).status, 'unknown');
eq('never checked → unknown', deriveOverallStatus({ checks: [], openIncidents: [], lastCheckedAt: null, now }).status, 'unknown');
eq('a stale reading → unknown, even with every check ok', deriveOverallStatus({ checks: okChecks, openIncidents: [], lastCheckedAt: stale, now }).status, 'unknown');
eq('…and the reason names the monitoring job', /monitoring job/.test(deriveOverallStatus({ checks: okChecks, openIncidents: [], lastCheckedAt: stale, now }).reason), true);
eq('an open critical → incident', deriveOverallStatus({ checks: okChecks, openIncidents: [{ severity: 'critical' }], lastCheckedAt: fresh, now }).status, 'incident');
eq('an open warning → degraded', deriveOverallStatus({ checks: okChecks, openIncidents: [{ severity: 'warning' }], lastCheckedAt: fresh, now }).status, 'degraded');
eq('a failing check with nothing open → degraded', deriveOverallStatus({ checks: [{ component: 'email', status: 'failed' }], openIncidents: [], lastCheckedAt: fresh, now }).status, 'degraded');
eq('an unknown check → degraded, not healthy', deriveOverallStatus({ checks: [{ component: 'email', status: 'unknown' }], openIncidents: [], lastCheckedAt: fresh, now }).status, 'degraded');
eq('an unconfigured check → degraded', deriveOverallStatus({ checks: [{ component: 'push', status: 'unconfigured' }], openIncidents: [], lastCheckedAt: fresh, now }).status, 'degraded');
eq('the degraded reason names the check', /email/.test(deriveOverallStatus({ checks: [{ component: 'email', status: 'failed' }], openIncidents: [], lastCheckedAt: fresh, now }).reason), true);

// --------------------------------------------------------- alert copy -----
section('composeIncidentEmail / composeRecoveryEmail — no diagnostics');

const alertRow = { kind: 'error_burst' as const, severity: 'critical' as const, title: 'TypeError on /admin/reports/[slug]', detail: '30 in the last 15 minutes', startedAt: t0, occurrenceCount: 3, deployment: 'dpl_abc', lastRequestId: 'sfo1::iad1::x-1-y', lastDigest: '4242' };
const mail = composeIncidentEmail([alertRow], 'https://www.perseustudio.com');
eq('subject carries severity and title', mail.subject, '[Perseus] Critical: TypeError on /admin/reports/[slug]');
eq('body links the page', mail.text.includes('https://www.perseustudio.com/admin/monitoring'), true);
eq('body points at Vercel by ids', mail.text.includes('deployment dpl_abc') && mail.text.includes('request sfo1::iad1::x-1-y') && mail.text.includes('error id 4242'), true);
eq('body says when it started', mail.text.includes('Since 2026-08-27 12:00 UTC'), true);
eq('body says how often', mail.text.includes('seen 3 times'), true);
for (const [re, what] of FORBIDDEN) eq(`alert email carries no ${what}`, re.test(`${mail.subject}\n${mail.text}`), false);
eq('two incidents → a counted subject', composeIncidentEmail([alertRow, { ...alertRow, severity: 'warning' }], 'https://x').subject, '[Perseus] Critical: 2 incidents opened');
const recovery = composeRecoveryEmail([alertRow], 'https://www.perseustudio.com', new Date(t0.getTime() + 3_600_000));
eq('recovery subject', recovery.subject, '[Perseus] Resolved: TypeError on /admin/reports/[slug]');
eq('recovery says the span', recovery.text.includes('Open from 2026-08-27 12:00 UTC to 2026-08-27 13:00 UTC'), true);

// -------------------------------------------------------------- misc ------
section('relativeAge / vercelLinks');

eq('just now', relativeAge(10_000), 'just now');
eq('minutes', relativeAge(4 * 60_000), '4 min ago');
eq('hours', relativeAge(3 * 3_600_000), '3 h ago');
eq('days', relativeAge(3 * 86_400_000), '3 d ago');
eq('negative is clamped', relativeAge(-5000), 'just now');
eq('three links without a deployment', vercelLinks(null).length, 3);
eq('four with one', vercelLinks('dpl_abc').length, 4);
eq('links are all on vercel.com', vercelLinks('dpl_abc').every((l) => l.href.startsWith('https://vercel.com/')), true);

// ------------------------------------------- recent request logs ----
section('parseRequestLogRow — the allowlist over Vercel\'s request log');

const REQ_ROW = { requestId: 'sfo1::iad1::abcd-1787000000000-abcdef123456', timestamp: '2026-08-27T13:01:40.296Z', deploymentId: 'dpl_HWDTSLBwdYWYbNB7j4VMp1UGxPMK', requestMethod: 'GET', requestPath: '/admin/tasks?q=someone@example.com&token=abc', statusCode: 200, domain: 'www.perseustudio.com', environment: 'production', branch: 'main', events: [{ source: 'serverless' }], logs: [] };
const req = parseRequestLogRow(REQ_ROW)!;
eq('a request keeps method/path/status/source', [req.method, req.path, req.status, req.source], ['GET', '/admin/tasks', 200, 'serverless']);
eq('…its request id (the join key into Vercel logs)', req.requestId, 'sfo1::iad1::abcd-1787000000000-abcdef123456');
eq('…and the query string, domain and branch are gone', /someone|perseustudio|main/.test(JSON.stringify(req)), false);
eq('…an ISO timestamp is read', req.at.toISOString(), '2026-08-27T13:01:40.296Z');
eq('a millisecond timestamp is read too', parseRequestLogRow({ ...REQ_ROW, timestamp: 1_787_000_000_000 })?.at.getTime(), 1_787_000_000_000);
eq('no timestamp → null', parseRequestLogRow({ ...REQ_ROW, timestamp: undefined }), null);
const OUR_LINE = JSON.stringify({ level: 'error', message: '[tasks] createTask failed', event: 'action.error.caught', errorName: 'DrizzleQueryError', errorMessage: 'Failed query: ... params: someone@example.com', stack: 'at x (file:1)', fingerprint: 'abcdef0123456789', routePath: '/admin/tasks', digest: '4242', requestId: 'sfo1::iad1::a-1-b', recipient: 'someone@example.com' });
const OURS_ROW = { ...REQ_ROW, requestMethod: 'POST', logs: [{ level: 'error', message: OUR_LINE, messageTruncated: false }, { level: 'warning', message: 'Warning: user someone@example.com did something with token eyJabc' }, { level: 'info', message: JSON.stringify({ message: 'contact from someone@example.com', event: 'x.y' }) }] };
const ours = parseRequestLogRow(OURS_ROW)!;
eq('our JSON line survives as one line', ours.lines.length, 1);
eq('…with message, event, class, fingerprint, route, digest', [ours.lines[0].message, ours.lines[0].event, ours.lines[0].errorName, ours.lines[0].fingerprint, ours.lines[0].routePath, ours.lines[0].digest], ['[tasks] createTask failed', 'action.error.caught', 'DrizzleQueryError', 'abcdef0123456789', '/admin/tasks', '4242']);
eq('…at Vercel\'s level', ours.lines[0].level, 'error');
eq('…and errorMessage, stack, recipient and the foreign text are NOT in the row', /someone|params|file:1|recipient|eyJ/.test(JSON.stringify(ours)), false);
eq('a foreign line and an our-shaped line whose message fails the grammar are withheld, not shown', ours.withheld, 2);
eq('an unknown level on our line falls to info, never indexes a chip by junk', parseRequestLogRow({ ...REQ_ROW, logs: [{ level: 'loud', message: OUR_LINE }] })?.lines[0]?.level, 'info');
eq('no events → static', parseRequestLogRow({ ...REQ_ROW, events: [] })?.source, 'static');
eq('an unknown source folds to other rather than dropping the request', parseRequestLogRow({ ...REQ_ROW, events: [{ source: 'quantum' }] })?.source, 'other');
eq('a path with a space is dropped, not kept', parseRequestLogRow({ ...REQ_ROW, requestPath: '/a b' })?.path, null);
eq('a status outside 100–599 is null', parseRequestLogRow({ ...REQ_ROW, statusCode: 999 })?.status, null);
// credential-bearing paths: the segment IS the secret, so it never reaches the screen
const SHARE_TOKEN = 'Qm9vZ2xlLXJhbmRvbS0yNC1ieXRl';
const RESET_TOKEN = 'aB3dE6fG9hJ2kL5mN8pQ1rS4';
eq('a client report link collapses to its pattern', parseRequestLogRow({ ...REQ_ROW, requestPath: `/share/reports/${SHARE_TOKEN}` })?.path, '/share/reports/[token]');
eq('a password-reset link collapses to its pattern', parseRequestLogRow({ ...REQ_ROW, requestPath: `/api/auth/reset-password/${RESET_TOKEN}?callbackURL=/admin` })?.path, '/api/auth/reset-password/[token]');
eq('…and neither token survives anywhere in the row', [JSON.stringify(parseRequestLogRow({ ...REQ_ROW, requestPath: `/share/reports/${SHARE_TOKEN}` })).includes(SHARE_TOKEN), JSON.stringify(parseRequestLogRow({ ...REQ_ROW, requestPath: `/api/auth/reset-password/${RESET_TOKEN}` })).includes(RESET_TOKEN)], [false, false]);
eq('a token-shaped segment on any route is collapsed as a backstop', parseRequestLogRow({ ...REQ_ROW, requestPath: `/x/${SHARE_TOKEN}/y` })?.path, '/x/[token]/y');
eq('real slugs survive the backstop', [parseRequestLogRow({ ...REQ_ROW, requestPath: '/services/digital-marketing/social-media-management' })?.path, parseRequestLogRow({ ...REQ_ROW, requestPath: '/blogs/top-10-marketing-trends-2026' })?.path, parseRequestLogRow({ ...REQ_ROW, requestPath: '/frequently-asked-questions' })?.path], ['/services/digital-marketing/social-media-management', '/blogs/top-10-marketing-trends-2026', '/frequently-asked-questions']);
eq('an address cannot be a path segment', parseRequestLogRow({ ...REQ_ROW, requestPath: '/x/someone@example.com' })?.path, null);
eq('a numeric-string status is read', parseRequestLogRow({ ...REQ_ROW, statusCode: '503' })?.status, 503);
eq('junk is null', [parseRequestLogRow('x'), parseRequestLogRow(null)], [null, null]);
const answer = parseRequestLogAnswer({ rows: [REQ_ROW, OURS_ROW, 'junk'], hasMoreRows: true })!;
eq('an answer keeps its good rows and says whether more exist', [answer.rows.length, answer.hasMore], [2, true]);
eq('an answer without rows[] is null', parseRequestLogAnswer({ data: [] }), null);
const olderRow = { ...req, at: T('2026-08-27T12:00:00Z') };
const newest = newestRequestRows([olderRow, req, { ...req, status: 503 }], 2);
eq('rows are newest first and the cut is reported', [newest.rows[0].at.toISOString(), newest.rows.length, newest.truncated], ['2026-08-27T13:01:40.296Z', 2, true]);
const windowRows: SafeRequestRow[] = [req, ours, { ...req, status: 503 }, { ...req, status: 404 }, { ...req, status: 302 }, { ...req, status: null }];
const recent = summarizeRecentLogs(windowRows, RECENT_LOGS_MINUTES, false);
eq('summary counts requests by class — a status-less row is counted, not classed', [recent.requests, recent.byClass['2xx'], recent.byClass['3xx'], recent.byClass['4xx'], recent.byClass['5xx']], [6, 2, 1, 1, 1]);
eq('summary counts our error lines and the withheld ones', [recent.functionErrors, recent.withheld, recent.minutes, recent.truncated], [1, 2, RECENT_LOGS_MINUTES, false]);
eq('the window is capped and bounded', [RECENT_LOGS_MAX_ROWS <= 500, RECENT_LOGS_TIMEOUT_MS <= 15_000], [true, true]);
const logsUrl = new URL(requestLogsUrl({ projectId: 'prj_x', deploymentId: 'dpl_y', since: T('2026-08-27T12:55:00Z'), until: T('2026-08-27T13:00:00Z'), page: 1 }));
eq('the request-log query is the CLI\'s, on vercel.com', [logsUrl.origin + logsUrl.pathname, logsUrl.searchParams.get('projectId'), logsUrl.searchParams.get('ownerId'), logsUrl.searchParams.get('deploymentId'), logsUrl.searchParams.get('page')], ['https://vercel.com/api/logs/request-logs', 'prj_x', VERCEL_TEAM_ID, 'dpl_y', '1']);
eq('…with the window in epoch milliseconds', [logsUrl.searchParams.get('startDate'), logsUrl.searchParams.get('endDate')], [String(T('2026-08-27T12:55:00Z').getTime()), String(T('2026-08-27T13:00:00Z').getTime())]);

// ---------------------------------------------- request counts ----
section('foldRequestCounts — Vercel\'s counts, folded whole or not at all');

const countsQuery = requestCountsQuery({ projectId: 'prj_x', now: T('2026-08-27T13:07:00Z') });
eq('the counts query is the documented endpoint, team-scoped', countsQuery.url, `https://api.vercel.com/v2/observability/query?teamId=${VERCEL_TEAM_ID}`);
eq('…the CLI\'s body shape: project scope, the metric, status groups, production only, one-day buckets', [countsQuery.body.scope, countsQuery.body.metric, countsQuery.body.groupBy, countsQuery.body.filter, countsQuery.body.granularity, countsQuery.body.aggregation], [{ type: 'project', ownerId: VERCEL_TEAM_ID, projectIds: ['prj_x'] }, 'vercel.request.count', ['http_status'], "environment eq 'production'", { days: 1 }, 'sum']);
eq('…over yesterday and today, UTC', [countsQuery.body.startTime, countsQuery.body.endTime, countsQuery.days], ['2026-08-26T00:00:00.000Z', '2026-08-27T13:07:00.000Z', ['2026-08-26', '2026-08-27']]);
eq('…asking for more groups than statuses exist', (countsQuery.body.limit as number) >= 100, true);
// The shape Vercel actually returned on 2026-08-27, trimmed, with a 5xx pair added.
const LIVE_ANSWER = { data: [ { timestamp: '2026-08-26T00:00:00.000Z', vercel_request_count_sum: 12196, http_status: '200' }, { timestamp: '2026-08-27T00:00:00.000Z', vercel_request_count_sum: 8607, http_status: '200' }, { timestamp: '2026-08-26T00:00:00.000Z', vercel_request_count_sum: 746, http_status: '304' }, { timestamp: '2026-08-27T00:00:00.000Z', vercel_request_count_sum: 39, http_status: '404' }, { timestamp: '2026-08-27T00:00:00.000Z', vercel_request_count_sum: 2, http_status: '499' }, { timestamp: '2026-08-27T00:00:00.000Z', vercel_request_count_sum: 3, http_status: '500' }, { timestamp: '2026-08-27T00:00:00.000Z', vercel_request_count_sum: 1, http_status: '504' }, { timestamp: '2026-08-25T00:00:00.000Z', vercel_request_count_sum: 999, http_status: '200' } ], summary: [ { vercel_request_count_sum: 20803, http_status: '200' }, { vercel_request_count_sum: 746, http_status: '304' }, { vercel_request_count_sum: 39, http_status: '404' }, { vercel_request_count_sum: 2, http_status: '499' }, { vercel_request_count_sum: 3, http_status: '500' }, { vercel_request_count_sum: 1, http_status: '504' } ], query: { limit: 200 }, statistics: { rowsRead: 1 } };
const folded = foldRequestCounts(LIVE_ANSWER, countsQuery.days)!;
eq('per day: 5xx is failed, everything else — 4xx and 499 included — is ok', folded, [{ day: '2026-08-26', ok: 12942, failed: 0 }, { day: '2026-08-27', ok: 8648, failed: 4 }]);
eq('a bucket outside the asked days is ignored (Vercel rounds the window out)', folded.some((d) => d.ok === 999), false);
eq('an answer with no rows at all is refused — never written as a quiet day', foldRequestCounts({ data: [], summary: [] }, countsQuery.days), null);
eq('a day the answer does not cover stays at zero in the fold (the write can only raise)', foldRequestCounts({ data: [{ timestamp: '2026-08-27T00:00:00.000Z', vercel_request_count_sum: 5, http_status: '200' }], summary: [{ vercel_request_count_sum: 5, http_status: '200' }] }, countsQuery.days), [{ day: '2026-08-26', ok: 0, failed: 0 }, { day: '2026-08-27', ok: 5, failed: 0 }]);
eq('as many groups as the cap → refused, never folded short', foldRequestCounts({ data: [], summary: Array.from({ length: REQUEST_STATUS_GROUP_LIMIT }, (_, i) => ({ http_status: String(i) })) }, countsQuery.days), null);
eq('a row that cannot be counted → the whole answer is refused', foldRequestCounts({ data: [{ timestamp: '2026-08-27T00:00:00.000Z', vercel_request_count_sum: 'lots', http_status: '200' }], summary: [] }, countsQuery.days), null);
eq('a shape we do not read → null', [foldRequestCounts({ rows: [] }, countsQuery.days), foldRequestCounts(null, countsQuery.days)], [null, null]);

// ---------------------------------------------------------------- SLOs ----
section('sloReport — a real denominator or "not enough data"');

eq('dayKeyUtc', dayKeyUtc(T('2026-08-27T23:59:59Z')), '2026-08-27');
eq('slots: a daily job over three days', slotsBetween(daily14, T('2026-08-24T15:00:00Z'), T('2026-08-27T15:00:00Z')), 3);
eq('slots: exclusive of from, inclusive of to', slotsBetween(daily14, T('2026-08-24T14:00:00Z'), T('2026-08-25T14:00:00Z')), 1);
eq('slots: none when to precedes the first slot', slotsBetween(daily14, T('2026-08-24T15:00:00Z'), T('2026-08-25T13:00:00Z')), 0);
eq('slots: every-15 over an hour', slotsBetween(every15, T('2026-08-27T10:00:00Z'), T('2026-08-27T11:00:00Z')), 4);
eq('slots: weekly over 30 days is 4 or 5', [4, 5].includes(slotsBetween(mon15, T('2026-07-28T00:00:00Z'), T('2026-08-27T00:00:00Z'))), true);
const sloNow = T('2026-08-27T12:00:00Z');
const day = (offset: number) => dayKeyUtc(new Date(sloNow.getTime() - offset * 86_400_000));
const dbRows = (ok: number, failed: number, unknown = 0) => Array.from({ length: 5 }, (_, i) => ({ component: 'database', day: day(i), ok, failed, unknown }));
const reportOk = sloReport({ daily: dbRows(96, 0), cronFirstSeen: new Map(), now: sloNow });
const dbRow = reportOk.find((r) => r.component === 'database')!;
eq('five clean days of probes meet 99.9%', [dbRow.status, dbRow.measuredPct, dbRow.total], ['met', 100, 480]);
eq('every target has a row', reportOk.length, SLO_TARGETS.length);
const reportMissed = sloReport({ daily: dbRows(90, 6), cronFirstSeen: new Map(), now: sloNow });
eq('6.25% failures miss a 99.9% target', reportMissed.find((r) => r.component === 'database')!.status, 'missed');
eq('…with the budget stated', reportMissed.find((r) => r.component === 'database')!.budget, { allowed: 0, used: 30 });
const reportUnknown = sloReport({ daily: dbRows(90, 0, 6), cronFirstSeen: new Map(), now: sloNow });
eq('timeouts count against availability, never as ok', reportUnknown.find((r) => r.component === 'database')!.measuredPct, 93.75);
const few = sloReport({ daily: [{ component: 'database', day: day(0), ok: SLO_MIN_SAMPLES - 1, failed: 0, unknown: 0 }], cronFirstSeen: new Map(), now: sloNow });
eq('fewer than SLO_MIN_SAMPLES probes → not enough data', [few.find((r) => r.component === 'database')!.status, few.find((r) => r.component === 'database')!.measuredPct], ['insufficient', null]);
eq('a component with no rows → not enough data, never 100%', reportOk.find((r) => r.component === 'email')!.status, 'insufficient');
const old = sloReport({ daily: [{ component: 'database', day: day(40), ok: 1000, failed: 0, unknown: 0 }], cronFirstSeen: new Map(), now: sloNow });
eq('rows outside the window are ignored', old.find((r) => r.component === 'database')!.total, 0);
// crons: the denominator comes from the schedule, from first-seen
const firstSeen = new Map([['cron:due-reminders', T('2026-08-20T10:00:00Z')]]);
const cronDaily = Array.from({ length: 7 }, (_, i) => ({ component: 'cron:due-reminders', day: day(i), ok: 1, failed: 0, unknown: 0 }));
const cronOk = sloReport({ daily: cronDaily, cronFirstSeen: firstSeen, now: sloNow });
const dueRow = cronOk.find((r) => r.component === 'cron:due-reminders')!;
eq('a daily cron first seen 7 days ago expected 7 runs', dueRow.total, 7);
eq('…seven runs recorded → met', [dueRow.good, dueRow.status], [7, 'met']);
const cronMissed = sloReport({ daily: cronDaily.slice(0, 5), cronFirstSeen: firstSeen, now: sloNow });
eq('two runs that never happened count against reliability', [cronMissed.find((r) => r.component === 'cron:due-reminders')!.good, cronMissed.find((r) => r.component === 'cron:due-reminders')!.status], [5, 'missed']);
const cronNew = sloReport({ daily: [], cronFirstSeen: new Map([['cron:due-reminders', T('2026-08-26T10:00:00Z')]]), now: sloNow });
eq('a cron seen yesterday has too few expected runs → not enough data', cronNew.find((r) => r.component === 'cron:due-reminders')!.status, 'insufficient');
eq('a cron never seen → not enough data', cronOk.find((r) => r.component === 'cron:weekly-digest')!.status, 'insufficient');
eq('minimum expected runs is small', SLO_MIN_EXPECTED_RUNS, 3);
eq('good can never exceed expected', sloReport({ daily: [{ component: 'cron:due-reminders', day: day(0), ok: 50, failed: 0, unknown: 0 }, ...cronDaily.slice(1)], cronFirstSeen: firstSeen, now: sloNow }).find((r) => r.component === 'cron:due-reminders')!.good <= 7, true);
// requests: Vercel's counts, a thousand-response floor, 5xx as the only failure
const reqRows = (ok: number, failed: number, updatedAt: Date | null = sloNow) => [{ component: REQUESTS_COMPONENT, day: day(0), ok, failed, unknown: 0, updatedAt }];
const reqMet = sloReport({ daily: reqRows(9_990, 5), cronFirstSeen: new Map(), now: sloNow }).find((r) => r.component === REQUESTS_COMPONENT)!;
eq('requests: 5 server errors in 9,995 responses meet 99.9%', [reqMet.kind, reqMet.status, reqMet.measuredPct, reqMet.total, reqMet.budget], ['requests', 'met', 99.95, 9_995, { allowed: 9, used: 5 }]);
eq('…and the row remembers its last write', reqMet.updatedAt?.toISOString(), sloNow.toISOString());
eq('…the requests row comes first', reportOk[0]?.component, REQUESTS_COMPONENT);
const reqMissed = sloReport({ daily: reqRows(9_980, 20), cronFirstSeen: new Map(), now: sloNow }).find((r) => r.component === REQUESTS_COMPONENT)!;
eq('requests: 20 in 10,000 miss it, over budget', [reqMissed.status, reqMissed.budget.used > reqMissed.budget.allowed], ['missed', true]);
const reqEdge = sloReport({ daily: reqRows(999, 1), cronFirstSeen: new Map(), now: sloNow }).find((r) => r.component === REQUESTS_COMPONENT)!;
eq('requests: 1 in 1,000 is exactly the one allowed failure — Met, and the budget agrees', [reqEdge.status, reqEdge.budget], ['met', { allowed: 1, used: 1 }]);
const probeEdge = sloReport({ daily: [{ component: 'database', day: day(0), ok: 2_877, failed: 3, unknown: 0 }], cronFirstSeen: new Map(), now: sloNow }).find((r) => r.component === 'database')!;
eq('99.896% rounds to 99.9 on screen but is a miss — the chip follows the budget, not the rounding', [probeEdge.measuredPct, probeEdge.status, probeEdge.budget], [99.9, 'missed', { allowed: 2, used: 3 }]);
eq('the chip and the budget are one decision on every row', [reportOk, reportMissed, cronOk, cronMissed].flat().every((r) => r.status !== 'met' || r.budget.used <= r.budget.allowed), true);
const reqFew = sloReport({ daily: reqRows(SLO_MIN_REQUESTS - 1, 0), cronFirstSeen: new Map(), now: sloNow }).find((r) => r.component === REQUESTS_COMPONENT)!;
eq('requests: fewer than SLO_MIN_REQUESTS responses → not enough data, never 100%', [reqFew.status, reqFew.measuredPct], ['insufficient', null]);
eq('requests: no rows at all → not enough data', reportOk.find((r) => r.component === REQUESTS_COMPONENT)!.status, 'insufficient');
eq('requests: an unknown column never inflates the denominator', sloReport({ daily: [{ component: REQUESTS_COMPONENT, day: day(0), ok: 2_000, failed: 0, unknown: 500 }], cronFirstSeen: new Map(), now: sloNow }).find((r) => r.component === REQUESTS_COMPONENT)!.total, 2_000);
eq('sloKindOf tells the three kinds apart', [sloKindOf(REQUESTS_COMPONENT), sloKindOf('cron:monitoring'), sloKindOf('database')], ['requests', 'cron', 'dependency']);
eq('the request floor is a thousand responses, the stale bound two hours', [SLO_MIN_REQUESTS, REQUESTS_STALE_MS], [1000, 2 * 60 * 60_000]);

// ----------------------------------------------------------------- --db ----
async function dbChecks() {
  section('--db: the real statements, through a Pool');
  const { Pool } = await import('@neondatabase/serverless');
  const { drizzle } = await import('drizzle-orm/neon-serverless');
  const { and, eq: dEq, like, sql } = await import('drizzle-orm');
  const schema = await import('@/db/schema');
  const statements = await import('@/db/monitoringStatements');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  const PREFIX = 'ZZ-CHECK';
  const cleanup = async () => {
    await db.delete(schema.monitoringErrorBuckets).where(like(schema.monitoringErrorBuckets.scope, `${PREFIX}%`));
    await db.delete(schema.monitoringIncidents).where(like(schema.monitoringIncidents.key, `${PREFIX}%`));
    await db.delete(schema.monitoringChecks).where(like(schema.monitoringChecks.component, `${PREFIX}%`));
    await db.delete(schema.monitoringDaily).where(like(schema.monitoringDaily.component, `${PREFIX}%`));
  };

  try {
    await cleanup();
    const at = T('2026-08-27T12:07:00Z');
    // A scope the builder would refuse — written raw on purpose, so every row
    // this script creates is findable by prefix and swept.
    const row = { ...buildErrorBucketRow({ source: 'request', scope: '/admin/tasks', routeType: 'render', error: new TypeError('x'), environment: 'development', deployment: 'dpl_1', requestId: 'req-1', at }), scope: `${PREFIX}/admin/tasks` };

    // 1. ten concurrent upserts ⇒ one row, count 10
    await Promise.all(Array.from({ length: 10 }, (_, i) => statements.upsertErrorBucket(db, { ...row, lastRequestId: `req-${i}`, lastDeployment: i === 9 ? 'dpl_2' : 'dpl_1' })));
    const buckets = await db.select().from(schema.monitoringErrorBuckets).where(dEq(schema.monitoringErrorBuckets.fingerprint, row.fingerprint));
    eq('ten concurrent upserts ⇒ one row', buckets.length, 1);
    eq('…with count 10', buckets[0]?.count, 10);
    eq('…first deployment never overwritten', buckets[0]?.firstDeployment, 'dpl_1');
    eq('…last request id is one of the ten', /^req-\d$/.test(buckets[0]?.lastRequestId ?? ''), true);
    eq('…bucket start round-trips', buckets[0]?.bucketStart.toISOString(), '2026-08-27T12:05:00.000Z');

    // 2. checks upsert folds the streak in SQL
    const component = `${PREFIX}:database`;
    const readCheck = async () => (await db.select().from(schema.monitoringChecks).where(dEq(schema.monitoringChecks.component, component)))[0];
    await statements.upsertCheck(db, checkOutcomeRow(component, 'dependency', { status: 'failed', durationMs: 12, errorName: 'NeonDbError', detail: 'Refused' }, at));
    eq('first failure starts the streak', (await readCheck())?.consecutiveFailures, 1);
    await statements.upsertCheck(db, checkOutcomeRow(component, 'dependency', { status: 'unknown', durationMs: null, errorName: null, detail: 'Timed out' }, new Date(at.getTime() + 1000)));
    const afterUnknown = await readCheck();
    eq('unknown extends the streak', afterUnknown?.consecutiveFailures, 2);
    eq('last_failed_at follows the newest failure', afterUnknown?.lastFailedAt?.toISOString(), new Date(at.getTime() + 1000).toISOString());
    eq('first_seen_at is the first write', afterUnknown?.firstSeenAt?.toISOString(), at.toISOString());
    await statements.upsertCheck(db, checkOutcomeRow(component, 'dependency', { status: 'ok', durationMs: 42, errorName: null, detail: 'Reachable' }, new Date(at.getTime() + 2000)));
    const afterOk = await readCheck();
    eq('ok resets the streak', afterOk?.consecutiveFailures, 0);
    eq('ok keeps last_failed_at', afterOk?.lastFailedAt?.toISOString(), new Date(at.getTime() + 1000).toISOString());
    eq('ok stamps last_ok_at', afterOk?.lastOkAt?.toISOString(), new Date(at.getTime() + 2000).toISOString());
    eq('one check row per component', (await db.select().from(schema.monitoringChecks).where(dEq(schema.monitoringChecks.component, component))).length, 1);
    await statements.ensureCheck(db, `${PREFIX}:cron:x`, 'cron', at);
    await statements.ensureCheck(db, `${PREFIX}:cron:x`, 'cron', new Date(at.getTime() + 5000));
    const placeholder = (await db.select().from(schema.monitoringChecks).where(dEq(schema.monitoringChecks.component, `${PREFIX}:cron:x`)))[0];
    eq('a placeholder is unknown and keeps its first_seen_at', [placeholder?.status, placeholder?.firstSeenAt?.toISOString()], ['unknown', at.toISOString()]);

    // 3. two concurrent opens ⇒ one open incident
    const signal: IncidentSignal = { kind: 'error_burst', key: `${PREFIX}-key`, component: null, severity: 'warning', title: 'ZZ-CHECK burst', detail: '5 in the last 15 minutes', deployment: 'dpl_1', lastRequestId: 'req-1', lastDigest: null };
    const opened = await Promise.all([statements.openIncident(db, signal, at), statements.openIncident(db, signal, at)]);
    const open = await db.select().from(schema.monitoringIncidents).where(and(dEq(schema.monitoringIncidents.key, signal.key), dEq(schema.monitoringIncidents.status, 'open')));
    eq('two concurrent opens ⇒ one open row', open.length, 1);
    eq('…both calls report the same id', opened[0].id === opened[1].id, true);
    eq('…exactly one of them reports it as new', opened.filter((o) => o.inserted).length, 1);
    eq('…occurrence counts both', open[0]?.occurrenceCount, 2);
    const id = open[0]!.id;

    // 4. two concurrent alert claims ⇒ one winner
    const claims = await Promise.all([statements.claimAlert(db, id, 'warning'), statements.claimAlert(db, id, 'warning')]);
    eq('two concurrent alert claims ⇒ one winner', claims.filter(Boolean).length, 1);
    eq('a repeat claim at the same severity loses', await statements.claimAlert(db, id, 'warning'), false);
    eq('an escalation to critical claims once more', await statements.claimAlert(db, id, 'critical'), true);
    eq('…and only once', await statements.claimAlert(db, id, 'critical'), false);

    // 5. resolve + recovery claim
    const resolved = await Promise.all([statements.resolveIncident(db, id, at), statements.resolveIncident(db, id, at)]);
    eq('two concurrent resolves ⇒ one winner', resolved.filter(Boolean).length, 1);
    const recoveries = await Promise.all([statements.claimRecovery(db, id), statements.claimRecovery(db, id)]);
    eq('two concurrent recovery claims ⇒ one winner', recoveries.filter(Boolean).length, 1);

    // 6. reopen keeps alerted_at, bumps occurrence, and cannot race an open row
    eq('reopen succeeds on the resolved row', await statements.reopenIncident(db, id, signal, at), true);
    const reopened = await db.select().from(schema.monitoringIncidents).where(dEq(schema.monitoringIncidents.id, id));
    eq('…it is open again', reopened[0]?.status, 'open');
    eq('…alerted_at survived (no re-alert)', reopened[0]?.alertedAt instanceof Date, true);
    eq('…resolved_at cleared', reopened[0]?.resolvedAt, null);
    eq('reopening an already-open row is a no-op', await statements.reopenIncident(db, id, signal, at), false);
    eq('touching bumps the count', (await statements.touchIncident(db, id, signal, false, at)) && (await db.select().from(schema.monitoringIncidents).where(dEq(schema.monitoringIncidents.id, id)))[0]?.occurrenceCount, 4);

    // 6b. daily counters fold in SQL and are swept by day
    const dayNow = '2026-08-27';
    await Promise.all([
      statements.bumpDaily(db, `${PREFIX}:database`, dayNow, 'ok', at),
      statements.bumpDaily(db, `${PREFIX}:database`, dayNow, 'ok', at),
      statements.bumpDaily(db, `${PREFIX}:database`, dayNow, 'failed', at),
      statements.bumpDaily(db, `${PREFIX}:database`, dayNow, 'unknown', at),
    ]);
    const dailyRows = await db.select().from(schema.monitoringDaily).where(dEq(schema.monitoringDaily.component, `${PREFIX}:database`));
    eq('four concurrent bumps ⇒ one row', dailyRows.length, 1);
    eq('…with ok 2, failed 1, unknown 1', [dailyRows[0]?.ok, dailyRows[0]?.failed, dailyRows[0]?.unknown], [2, 1, 1]);
    // 6c. a day's request counts are RAISED whole — the same answer twice is one row, a lower one changes nothing
    const requestsRows = () => db.select().from(schema.monitoringDaily).where(dEq(schema.monitoringDaily.component, `${PREFIX}:requests`));
    await Promise.all([
      statements.raiseDailyCounts(db, `${PREFIX}:requests`, dayNow, { ok: 9_990, failed: 5 }, at),
      statements.raiseDailyCounts(db, `${PREFIX}:requests`, dayNow, { ok: 9_990, failed: 5 }, at),
    ]);
    const setRows = await requestsRows();
    eq('two identical raises ⇒ one row with the values, not doubled', [setRows.length, setRows[0]?.ok, setRows[0]?.failed, setRows[0]?.unknown], [1, 9_990, 5, 0]);
    await statements.raiseDailyCounts(db, `${PREFIX}:requests`, dayNow, { ok: 10_000, failed: 6 }, at);
    eq('a later, higher answer replaces — never adds', (await requestsRows()).map((r) => [r.ok, r.failed]), [[10_000, 6]]);
    await statements.raiseDailyCounts(db, `${PREFIX}:requests`, dayNow, { ok: 0, failed: 0 }, at);
    eq('a lower answer never lowers a stored day', (await requestsRows()).map((r) => [r.ok, r.failed]), [[10_000, 6]]);
    await statements.bumpDaily(db, `${PREFIX}:database`, '2026-01-01', 'ok', at);
    eq('sweepDaily removes only days before the cutoff', await statements.sweepDaily(db, '2026-05-01', 500), 1);
    await db.delete(schema.monitoringDaily).where(like(schema.monitoringDaily.component, `${PREFIX}%`));

    // 7. retention sweeps, batched, and reports the count
    const old = { ...row, scope: `${PREFIX}/old`, bucketStart: T('2026-01-01T00:00:00Z'), fingerprint: `${row.fingerprint.slice(0, 15)}0` };
    await statements.upsertErrorBucket(db, old);
    await statements.upsertErrorBucket(db, { ...old, fingerprint: `${row.fingerprint.slice(0, 15)}1` });
    eq('sweep deletes only rows older than the cutoff', await statements.sweepBuckets(db, bucketRetentionCutoff(at), 500), 2);
    const left = await db.select({ n: sql<number>`count(*)::int` }).from(schema.monitoringErrorBuckets).where(like(schema.monitoringErrorBuckets.scope, `${PREFIX}%`));
    eq('…the fresh row survives', left[0]?.n, 1);
    await db.update(schema.monitoringIncidents).set({ status: 'resolved', resolvedAt: T('2026-01-01T00:00:00Z') }).where(dEq(schema.monitoringIncidents.id, id));
    eq('resolved incidents past retention are swept', await statements.sweepResolvedIncidents(db, incidentRetentionCutoff(at), 500), 1);
  } finally {
    await cleanup().catch(() => {});
    await pool.end();
  }
}

if (process.argv.includes('--db')) {
  await dbChecks();
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
