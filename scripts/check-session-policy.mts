/**
 * Session-policy self-check — the sign-in lifetime, executable.
 *
 * Run:  node --import tsx scripts/check-session-policy.mts    (no DB, no env)
 *
 * src/lib/sessionPolicy.ts holds the three numbers Better Auth is configured
 * with (24h idle, 5-minute refresh, 30-day ceiling), the clamp the
 * `session.update.before` hook applies, and the open-redirect guard behind the
 * login page's `?next=`. There is no test runner in this repo (see CLAUDE.md),
 * and two of the regressions here are silent: a "harmless" edit to a number
 * changes how long a stolen cookie works, and a loosened return-path guard
 * turns the login page into an open redirect. Run this after touching
 * sessionPolicy.ts or the `session` block in src/lib/auth.ts.
 */
import {
  SESSION_IDLE_SECONDS,
  SESSION_MAX_AGE_MS,
  SESSION_REFRESH_SECONDS,
  clampSessionExpiry,
  safeAdminReturnPath,
} from '@/lib/sessionPolicy';

let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : ` want=${JSON.stringify(want)}`}`,
  );
};

// ---- the numbers, as literals. If one of these fails, someone changed the
// policy — which is fine, but it must be on purpose, with CLAUDE.md and the
// profile help guide updated to match.
eq('idle window is 24 hours', SESSION_IDLE_SECONDS, 86_400);
eq('refresh granularity is 5 minutes', SESSION_REFRESH_SECONDS, 300);
eq('ceiling is 30 days', SESSION_MAX_AGE_MS, 2_592_000_000);
eq(
  'refresh never exceeds the cookie cache (Better Auth cannot refresh more often than the cache lapses)',
  SESSION_REFRESH_SECONDS <= 5 * 60,
  true,
);
eq('idle window is shorter than the ceiling', SESSION_IDLE_SECONDS * 1000 < SESSION_MAX_AGE_MS, true);

// ---- the clamp. Only ever narrows.
const created = new Date('2026-08-01T10:00:00.000Z');
const cap = new Date(created.getTime() + SESSION_MAX_AGE_MS);
const inside = new Date('2026-08-02T10:00:00.000Z');
const past = new Date('2026-09-15T10:00:00.000Z');
eq('inside the ceiling: untouched', clampSessionExpiry(created, inside).toISOString(), inside.toISOString());
eq('inside: same instance, not a copy', clampSessionExpiry(created, inside) === inside, true);
eq('past the ceiling: exactly createdAt + 30d', clampSessionExpiry(created, past).toISOString(), cap.toISOString());
eq('at the boundary: equal, not clamped below', clampSessionExpiry(created, cap).toISOString(), cap.toISOString());
eq('one ms past: clamped', clampSessionExpiry(created, new Date(cap.getTime() + 1)).toISOString(), cap.toISOString());
// A session older than the ceiling gets an expiry in the PAST — Better Auth
// then rejects it on the next DB read. That is the ceiling landing, not a bug.
const ancient = new Date('2026-01-01T00:00:00.000Z');
eq(
  'already past the ceiling: expiry lands at the cap (in the past)',
  clampSessionExpiry(ancient, inside).toISOString(),
  new Date(ancient.getTime() + SESSION_MAX_AGE_MS).toISOString(),
);

// ---- the return-path guard. Accepts only what the proxy would emit.
const ok = (p: string) => eq(`accepts ${p}`, safeAdminReturnPath(p), p);
const no = (label: string, p: unknown) =>
  eq(`rejects ${label}`, safeAdminReturnPath(p as string), null);

ok('/admin');
ok('/admin/tasks');
ok('/admin/tasks?view=digest');
ok('/admin/reports/acme-corp/print');
ok('/admin/tasks?task=abc&client=xyz');
ok('/admin?x=1');

no('empty string', '');
no('null', null);
no('undefined', undefined);
no('a number', 42);
no('root', '/');
no('a non-admin path', '/blogs');
no('/adminx (prefix is not a path)', '/adminx');
no('/admin-foo', '/admin-foo');
no('an absolute URL', 'https://evil.com/admin');
no('a protocol-relative URL', '//evil.com');
no('//evil.com under admin', '/admin//evil.com');
no('a backslash trick', '/admin/\\evil.com');
no('backslash before the slash', '\\/admin');
no('a colon before the first slash', 'javascript:/admin');
no('a fragment', '/admin/tasks#x');
no('a newline', '/admin/tasks\n');
no('a CR', '/admin/tasks\r');
no('a space', '/admin/tasks x');
no('a null byte', '/admin/tasks\u0000');
no('the login page (loop)', '/admin/login');
no('the login page with a query', '/admin/login?next=/admin');
no('a login sub-path', '/admin/login/x');
no('reset-password', '/admin/reset-password');
no('reset-password with a query', '/admin/reset-password?token=abc');
no('an oversized path', '/admin/' + 'a'.repeat(600));

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
