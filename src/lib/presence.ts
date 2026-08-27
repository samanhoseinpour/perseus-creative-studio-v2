/**
 * Presence — "is this person in the admin right now, and if not, when were they
 * last here". Read on /admin/users.
 *
 * A PURE LEAF on purpose (the activityFields.ts shape): no `server-only`, no
 * `db`, no `Intl`, no timezone. The server page and the client row both import
 * it, and the client half is what lets a label decay on a tab left open without
 * a refetch.
 *
 * No Intl here is the load-bearing part. The house rule is that client
 * components never do Date math, because a formatter that runs on both sides
 * drifts and breaks hydration. Presence has to update live, so the compromise
 * is arithmetic only: the caller hands us the elapsed milliseconds and a
 * SERVER-FORMATTED absolute date to fall back on past a week. Nothing in this
 * module can disagree with the server about what day it is, because it never
 * asks.
 */

/** How long after the last heartbeat someone still reads as "Online". */
export const PRESENCE_ONLINE_MS = 5 * 60_000;

/** How often a visible tab pings /admin/presence. */
export const PRESENCE_HEARTBEAT_MS = 90_000;

/**
 * Server-side write throttle. Both writers (the heartbeat route and the
 * protected layout's floor write) skip the UPDATE when the stored value is
 * newer than this, so navigating quickly can't turn into a write per click.
 * Deliberately shorter than the heartbeat: a ping that arrives on time must
 * never be throttled away.
 */
export const PRESENCE_TOUCH_MS = 60_000;

/** How often a rendered row re-computes its own label. */
export const PRESENCE_TICK_MS = 30_000;

/**
 * How long a single heartbeat request may be outstanding before the next tick
 * is allowed to supersede it. Must stay SHORTER than PRESENCE_HEARTBEAT_MS, so
 * a wedged request costs at most one ping.
 */
export const PRESENCE_REQUEST_TIMEOUT_MS = 15_000;

/**
 * Whether a heartbeat may start right now.
 *
 * The in-flight guard is a DEADLINE, not a flag, and that is the whole point of
 * this function. It used to be a boolean cleared in the fetch's `.finally()` —
 * which only runs if the promise SETTLES. An iOS Home Screen app is frozen at
 * the process level when backgrounded, which can sever an in-flight fetch
 * without ever settling it, so the flag latched shut and the heartbeat was dead
 * for the life of the document.
 *
 * That is not merely a stale dot. The heartbeat is the only thing that notices
 * a REVOKED SESSION while nobody is navigating: a render cannot re-issue the
 * cookie (Next forbids cookies().set() outside actions and route handlers) and
 * `src/proxy.ts` only checks that a cookie exists, never that it is live. So a
 * stuck guard leaves a dashboard whose session row was deleted still showing
 * the dashboard — which is exactly what a password change is supposed to end.
 *
 * Two ways in, both closed here:
 * - a request that never settles is superseded once the deadline passes;
 * - a BACKWARD clock jump (Date.now() is not monotonic — an NTP correction is
 *   enough) reopens the guard instead of sealing it, since a negative elapsed
 *   would otherwise never reach the deadline.
 *
 * Pinned by scripts/check-presence-heartbeat.mts.
 *
 * @param startedAt  epoch ms when the outstanding request began, or null if idle.
 */
export function canPingNow(input: {
  visible: boolean;
  startedAt: number | null;
  now: number;
}): boolean {
  // Hidden beats everything: a hidden tab pings for no reason, and a stale
  // request must not become a reason to ping one.
  if (!input.visible) return false;
  if (input.startedAt === null) return true;
  const elapsed = input.now - input.startedAt;
  if (elapsed < 0) return true;
  return elapsed >= PRESENCE_REQUEST_TIMEOUT_MS;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export type Presence = {
  /** Seen within PRESENCE_ONLINE_MS — drives the dot. */
  online: boolean;
  /** The full human sentence: "Online", "Last seen 12m ago", "Never signed in". */
  label: string;
};

/**
 * @param lastSeenMs  epoch ms of the last sighting, or null for never.
 * @param absoluteLabel  server-formatted date ("Jul 31, 2026"), used past a
 *   week — where a relative figure stops being useful and a real date starts.
 * @param now  epoch ms; passed in so the server render and the client tick are
 *   the same code path.
 */
export function presenceFrom(
  lastSeenMs: number | null,
  absoluteLabel: string | null,
  now: number,
): Presence {
  if (lastSeenMs == null) return { online: false, label: 'Never signed in' };

  // Clamp: a clock skew between the browser and the server (or a row stamped a
  // second into the future by `now()`) must read as "Online", never as a
  // negative gap formatted into nonsense.
  const gap = Math.max(0, now - lastSeenMs);
  if (gap <= PRESENCE_ONLINE_MS) return { online: true, label: 'Online' };

  // Floor, not round, from here down: rounding would let 5m30s of silence
  // render as "Last seen 6m ago" while the row above it still said "Online",
  // and it must never overstate how long someone has been gone.
  if (gap < HOUR) {
    return { online: false, label: `Last seen ${Math.floor(gap / MINUTE)}m ago` };
  }
  if (gap < DAY) {
    return { online: false, label: `Last seen ${Math.floor(gap / HOUR)}h ago` };
  }
  const days = Math.floor(gap / DAY);
  if (days <= 7) return { online: false, label: `Last seen ${days}d ago` };

  // Past a week the exact date is the more useful answer — but only the server
  // can format one (it holds the reader's zone), so without it we degrade to
  // the day count rather than inventing a date in the browser.
  return {
    online: false,
    label: absoluteLabel ? `Last seen ${absoluteLabel}` : `Last seen ${days}d ago`,
  };
}

/**
 * Whether a stored timestamp is stale enough to be worth a write. Shared by
 * both server-side writers so the throttle rule lives in one place.
 */
export function shouldTouchPresence(
  lastSeenAt: Date | null,
  now: number = Date.now(),
): boolean {
  return !lastSeenAt || now - lastSeenAt.getTime() > PRESENCE_TOUCH_MS;
}
