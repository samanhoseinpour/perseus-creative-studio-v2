/**
 * Session policy — how long a signed-in admin stays signed in.
 *
 * A PURE LEAF (the presence.ts shape): no imports, no `server-only`, no Date
 * math beyond arithmetic. The auth config, the proxy, the login page and
 * scripts/check-session-policy.mts all read the SAME three numbers from here,
 * so the policy can't drift between the place that sets a cookie's Max-Age and
 * the place that explains it to a member.
 *
 * The policy (Saman, 2026-08-22):
 *
 * - IDLE: 24 hours. Better Auth's `expiresIn`. The session expires 24h after
 *   it was last REFRESHED, and a refresh happens on any server action or route
 *   handler once `updateAge` has elapsed — in practice the 90-second presence
 *   heartbeat, which only runs while the dashboard is visible. So the clock
 *   runs while the dashboard is NOT on screen: work every day and you are
 *   never prompted; skip a calendar day and you sign in again.
 * - REFRESH: 5 minutes. Better Auth's `updateAge`, set equal to the cookie
 *   cache's maxAge because that is the floor anyway — a cache hit never
 *   touches the DB, so nothing can refresh more often than the cache lapses.
 *   Renders cannot refresh at all (Next 16 forbids cookies().set() outside
 *   actions and route handlers), which is why the heartbeat matters.
 * - CEILING: 30 days from sign-in, regardless of activity. Enforced by the
 *   `session.update.before` hook in src/lib/auth.ts through clampSessionExpiry
 *   below, so Better Auth itself refuses to slide a session past it and a
 *   copied cookie cannot be kept alive forever.
 */

/** How long a session lives after its last refresh (Better Auth `expiresIn`). */
export const SESSION_IDLE_SECONDS = 24 * 60 * 60;

/** How often an active session is re-stamped (Better Auth `updateAge`). */
export const SESSION_REFRESH_SECONDS = 5 * 60;

/** Hard ceiling on a session's total life, measured from sign-in. */
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The ceiling, as a pure function: a refreshed expiry may never pass
 * `createdAt + SESSION_MAX_AGE_MS`. Only ever narrows — a proposed expiry
 * inside the ceiling comes back untouched.
 */
export function clampSessionExpiry(createdAt: Date, proposed: Date): Date {
  const cap = createdAt.getTime() + SESSION_MAX_AGE_MS;
  return proposed.getTime() > cap ? new Date(cap) : proposed;
}

const LOGIN_ONLY_PATHS = ['/admin/login', '/admin/reset-password'];

/**
 * Open-redirect guard for the login page's `?next=`.
 *
 * Accepts only a same-origin admin path — `/admin`, or `/admin/...` with an
 * optional query string — and never the login or reset pages themselves (a
 * loop). Everything else returns null and the caller falls back to `/admin`.
 * Plain string rules, no URL parsing, so the proxy (which WRITES the value)
 * and the login page (which READS it) cannot disagree about what is safe:
 *
 * - no backslash, whitespace, control character or `#` anywhere — browsers
 *   normalise `\` to `/`, and none of these can appear in a path the proxy
 *   would ever emit;
 * - no `//` anywhere, which rules out protocol-relative `//evil.com` and its
 *   `/admin//…` cousins in one stroke;
 * - must be exactly `/admin` or continue with `/` or `?` (`/adminx` is not an
 *   admin path).
 */
export function safeAdminReturnPath(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 512) return null;
  if (/[\\\s#\x00-\x1f\x7f]|\/\//.test(raw)) return null;
  if (!/^\/admin(?=$|[/?])/.test(raw)) return null;
  const path = raw.split('?')[0];
  for (const p of LOGIN_ONLY_PATHS) {
    if (path === p || path.startsWith(`${p}/`)) return null;
  }
  return raw;
}
