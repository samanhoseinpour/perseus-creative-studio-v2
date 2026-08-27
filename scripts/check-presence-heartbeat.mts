/**
 * The presence-heartbeat self-check (no DB, no env, no browser).
 *
 * The heartbeat has TWO jobs and only one of them is cosmetic. It stamps
 * `last_seen_at` so /admin/users can say "Online" — and it is the ONLY thing
 * that notices a server-side session revocation while nobody is navigating,
 * because a render cannot re-issue the cookie and the proxy only checks that a
 * cookie EXISTS. So when it stops, a dashboard whose session was deleted goes
 * on looking signed in, with nothing anywhere to say so.
 *
 * It did stop, on exactly one platform. The guard used to be a boolean cleared
 * in `.finally()`, which only runs if the promise SETTLES. An iOS Home Screen
 * app is frozen at the process level when backgrounded, which can sever an
 * in-flight fetch without ever settling it — so the guard latched shut and
 * every later tick returned early for the life of the document. Confirmed
 * against the live database on 2026-08-27: a password change had deleted every
 * one of that account's session rows, and the iPhone PWA was still showing the
 * dashboard while macOS and mobile Safari had both bounced.
 *
 * `canPingNow` therefore expresses the guard as a DEADLINE rather than a flag,
 * and this file pins the three refusals that keeps honest. Run it after
 * touching `canPingNow`, PRESENCE_REQUEST_TIMEOUT_MS, or the guard in
 * PresenceHeartbeat.tsx.
 */
import {
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_REQUEST_TIMEOUT_MS,
  canPingNow,
} from '@/lib/presence';

let pass = 0;
let fail = 0;
const ok = (name: string, got: unknown, want: unknown) => {
  const good = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${good ? 'PASS' : 'FAIL'}  ${name}  got=${JSON.stringify(got)}${good ? '' : ` want=${JSON.stringify(want)}`}`);
  if (good) pass++;
  else fail++;
};

const T0 = 1_800_000_000_000;

// ---- the ordinary cases -----------------------------------------------------
ok('idle + visible pings', canPingNow({ visible: true, startedAt: null, now: T0 }), true);
ok('idle + hidden does NOT ping', canPingNow({ visible: false, startedAt: null, now: T0 }), false);
ok(
  'a request in flight blocks a second one',
  canPingNow({ visible: true, startedAt: T0, now: T0 + 1_000 }),
  false,
);
ok(
  'hidden beats everything — a stale request does not unblock a hidden tab',
  canPingNow({ visible: false, startedAt: T0 - 10 * PRESENCE_REQUEST_TIMEOUT_MS, now: T0 }),
  false,
);

// ---- THE regression. A promise that never settles must not disable the
// heartbeat: past the deadline the guard reopens on its own.
ok(
  'a request that never settles is superseded at the deadline',
  canPingNow({ visible: true, startedAt: T0, now: T0 + PRESENCE_REQUEST_TIMEOUT_MS }),
  true,
);
ok(
  'one ms before the deadline it still blocks',
  canPingNow({ visible: true, startedAt: T0, now: T0 + PRESENCE_REQUEST_TIMEOUT_MS - 1 }),
  false,
);
ok(
  'a fetch frozen for an hour (backgrounded iOS app) does not latch',
  canPingNow({ visible: true, startedAt: T0, now: T0 + 3_600_000 }),
  true,
);

// ---- a clock that moves BACKWARD must not latch it either. Date.now() is not
// monotonic; an NTP correction or a manual clock change would otherwise leave
// `now - startedAt` negative for ever, which is the same dead heartbeat by
// another route.
ok(
  'a backward clock jump reopens the guard rather than sealing it',
  canPingNow({ visible: true, startedAt: T0, now: T0 - 60_000 }),
  true,
);

// ---- the timing relationship. A stuck request must cost at most one tick, so
// the deadline has to be shorter than the interval; if it were longer, every
// wedged request would silently skip pings.
ok(
  'the request deadline is shorter than the heartbeat interval',
  PRESENCE_REQUEST_TIMEOUT_MS < PRESENCE_HEARTBEAT_MS,
  true,
);
ok('the deadline is a real timeout, not zero', PRESENCE_REQUEST_TIMEOUT_MS > 0, true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
