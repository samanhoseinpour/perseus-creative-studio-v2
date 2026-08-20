/**
 * THE timezone door. Nothing else in this codebase may name a timezone or turn
 * an instant into a calendar day — if you find yourself writing
 * `timeZone: '…'` or `new Intl.DateTimeFormat` outside this file, the helper
 * you want is below (payrollAmounts.ts is the same "single conversion door"
 * idiom).
 *
 * Two clocks coexist, and conflating them is the bug this module exists to
 * prevent:
 *
 *  - **The viewer's clock.** Everything a signed-in person reads as "what day
 *    is it" — the task-date defaults, the Today/Tomorrow chips, the overdue
 *    tint, the digest's day headers, every timestamp on every admin screen.
 *    Resolved per request from their stored zone (`viewerZone()` in
 *    adminAccess.ts). The team is split across Vancouver and Tehran — 11.5
 *    hours in summer — so a single hardcoded zone is wrong for most of them
 *    most of the time.
 *  - **The studio clock** (`STUDIO_TZ`). Only for surfaces with no viewer to
 *    follow: the weekly-digest and recurring-tasks crons, and as the fallback
 *    whenever a stored zone is missing or unusable.
 *
 * A zero-dependency leaf (the taskFilters/inboxFilters pattern) so client
 * components can import it without dragging anything server-only into their
 * chunk.
 *
 * Two kinds of value pass through here and they are NOT interchangeable:
 *
 *  - An **instant** (`completed_at`, `created_at` — timestamptz) is a point in
 *    time. Asking which calendar day it falls on requires a zone; that is what
 *    `dayKeyIn`/`monthTokenIn`/`monthWindowIn` are for.
 *  - A **calendar key** (`due_date`, `start_date` — `date` columns, and every
 *    YYYY-MM-DD / YYYY-MM token below) has no instant and no zone. The math on
 *    those keys at the bottom of this file is pure string/UTC arithmetic and
 *    must never acquire a zone parameter.
 */

/** The studio's own zone — the fallback, and the only zone for surfaces that
 *  have no viewer. Never reach for this on a signed-in render. */
export const STUDIO_TZ = 'America/Vancouver';

// ── Zone validation ─────────────────────────────────────────────────────────

/** Shape guard ahead of the try/catch below: keeps a pathological string from
 *  ever reaching the ICU parser, and bounds what can enter VALID. */
const ZONE_RE = /^[A-Za-z0-9+_\-/]{1,64}$/;

/**
 * Zones proven constructible, memoised. Only ever grows with values that ICU
 * accepted, so it is bounded by the IANA database (~600 entries) — junk is
 * rejected by ZONE_RE before it can allocate.
 *
 * Deliberately NOT `Intl.supportedValuesOf('timeZone')`: that returns only
 * CANONICAL names, while `resolvedOptions().timeZone` may report a link
 * (`Asia/Calcutta` for `Asia/Kolkata`). Membership-testing against the
 * canonical list would reject perfectly valid browser-reported zones.
 */
const VALID = new Set<string>([STUDIO_TZ]);

/** Whether ICU can resolve this as a timezone. Never throws. */
export function isValidTimeZone(tz: string): boolean {
  if (!ZONE_RE.test(tz)) return false;
  if (VALID.has(tz)) return true;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
  } catch {
    return false;
  }
  VALID.add(tz);
  return true;
}

/**
 * Any untrusted value → a zone that is safe to format with. A stored zone that
 * ICU no longer recognises (a renamed IANA entry, a hand-edited row) must
 * degrade to studio time, never throw: this runs on every protected render,
 * and a RangeError here would 500 the entire dashboard.
 */
export function resolveZone(tz: string | null | undefined): string {
  return tz && isValidTimeZone(tz) ? tz : STUDIO_TZ;
}

// ── Formatter cache ─────────────────────────────────────────────────────────

/**
 * `new Intl.DateTimeFormat` is expensive enough to matter in a list render, and
 * the old module-level singletons this replaces were free. Keyed by zone +
 * options so callers can keep declaring their options inline.
 *
 * This is derived, immutable data — NOT request state — so it does not violate
 * the stateless-module rule (Fluid Compute reuses instances across concurrent
 * requests; a shared formatter is identical for all of them).
 */
const FORMATTERS = new Map<string, Intl.DateTimeFormat>();

/** Hard ceiling so a caller building options dynamically can't grow this
 *  without bound; past it, formatters are constructed per call rather than
 *  cached. Real usage sits at a few dozen. */
const FORMATTER_CAP = 512;

/**
 * A cached `Intl.DateTimeFormat` pinned to `tz`. The zone is resolved first, so
 * passing an unusable one renders in studio time instead of throwing.
 */
export function zonedFormat(
  tz: string,
  options: Intl.DateTimeFormatOptions,
  locale = 'en-US',
): Intl.DateTimeFormat {
  const zone = resolveZone(tz);
  const key = `${locale}|${zone}|${JSON.stringify(options)}`;
  const hit = FORMATTERS.get(key);
  if (hit) return hit;
  const made = new Intl.DateTimeFormat(locale, { ...options, timeZone: zone });
  if (FORMATTERS.size < FORMATTER_CAP) FORMATTERS.set(key, made);
  return made;
}

// ── Instant → calendar ──────────────────────────────────────────────────────

const PARTS_OPTIONS: Intl.DateTimeFormatOptions = {
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};

function zonedParts(tz: string, at: Date): Record<string, string> {
  return Object.fromEntries(
    zonedFormat(tz, PARTS_OPTIONS)
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
}

/** The zone's UTC offset in minutes at a given UTC instant (negative west of
 *  Greenwich: -420 for Vancouver in PDT, +210 for Tehran). */
function offsetMinutes(tz: string, at: Date): number {
  const p = zonedParts(tz, at);
  const asUtc = Date.UTC(
    +p.year,
    +p.month - 1,
    +p.day,
    // h23 should never emit "24", but some ICU builds have; %24 is inert
    // belt-and-braces.
    +p.hour % 24,
    +p.minute,
    +p.second,
  );
  return (asUtc - at.getTime()) / 60_000;
}

/**
 * UTC instant of the FIRST MOMENT of (year, month, day) in `tz` — month is
 * 1-based; out-of-range day/month values normalize through Date.UTC (so
 * (2026, 13, 1) is Jan 1 2027, which the month-window math leans on).
 *
 * Two-pass offset correction: guess local-midnight-as-UTC, correct by the
 * offset at the guess, re-correct once at the corrected instant. That lands
 * exactly whenever local midnight EXISTS.
 *
 * It doesn't always. A handful of zones shift their clocks AT 00:00 — Chile
 * (America/Santiago), Cuba (America/Havana), the Azores — so on a
 * spring-forward day the local clock jumps straight from 23:59:59 to 01:00 and
 * midnight never happens. The two passes then converge an hour short, on
 * 23:00 of the PREVIOUS day, and every bound built on this (`dayStartIn`,
 * `monthWindowIn`, `recentSinceIn`) silently spans the wrong day — the filter
 * would disagree with the label `dayKeyIn` prints beside it, which is the one
 * invariant this module exists to hold.
 *
 * So the result is verified against the day it claims to start, and bisected
 * forward when it falls short. The gap is not assumed to be an hour (Lord Howe
 * shifts 30 minutes), and the bisection is skipped entirely in the common case
 * — Vancouver shifts at 02:00 and Tehran has no DST, so neither pays for it.
 */
function midnightUtc(
  tz: string,
  year: number,
  month: number,
  day: number,
): Date {
  const guess = Date.UTC(year, month - 1, day);
  const first = guess - offsetMinutes(tz, new Date(guess)) * 60_000;
  let ms = guess - offsetMinutes(tz, new Date(first)) * 60_000;

  // The normalized key this instant must belong to. Read back off `guess`
  // rather than the arguments, so an overflowing (2026, 13, 1) compares
  // against Jan 1 2027 like the rest of the math expects.
  const target = new Date(guess).toISOString().slice(0, 10);
  if (dayKeyIn(tz, new Date(ms)) < target) {
    // Forward-only: an offset error can never exceed a day, and the day's true
    // first moment is the transition instant itself. One-minute resolution is
    // exact — every transition in the tz database lands on a whole minute.
    let lo = ms;
    let hi = ms + 4 * 3_600_000;
    while (hi - lo > 60_000) {
      const mid = lo + Math.floor((hi - lo) / 2);
      if (dayKeyIn(tz, new Date(mid)) < target) lo = mid;
      else hi = mid;
    }
    ms = hi;
  }
  return new Date(ms);
}

/** YYYY-MM-DD in `tz` — day-grouping keys, CSV date columns, and every
 *  "is this today?" comparison. */
export function dayKeyIn(tz: string, at: Date): string {
  const p = zonedParts(tz, at);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Local midnight of a YYYY-MM-DD key in `tz`, as the UTC instant — ready for
 *  gte/lt on a timestamptz column. */
export function dayStartIn(tz: string, key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return midnightUtc(tz, year, month, day);
}

/** The current YYYY-MM token in `tz`. */
export function monthTokenIn(tz: string, at: Date = new Date()): string {
  const p = zonedParts(tz, at);
  return `${p.year}-${p.month}`;
}

/**
 * `since` inclusive, `until` exclusive — ready for gte/lt on completedAt. Null
 * when the token is malformed (callers default silently or 400, per surface).
 * DST months come out 1h short/long by design — they are.
 */
export function monthWindowIn(
  tz: string,
  token: string,
): { since: Date; until: Date } | null {
  if (!MONTH_TOKEN_RE.test(token)) return null;
  const [year, month] = token.split('-').map(Number);
  return {
    since: midnightUtc(tz, year, month, 1),
    until: midnightUtc(tz, year, month + 1, 1),
  };
}

/** Local midnight (days - 1) days back in `tz` — the digest's rolling window,
 *  today inclusive. */
export function recentSinceIn(
  tz: string,
  days: number,
  at: Date = new Date(),
): Date {
  const p = zonedParts(tz, at);
  return midnightUtc(tz, +p.year, +p.month, +p.day - (days - 1));
}

// ── Pure calendar-key math (no zone, ever) ──────────────────────────────────

/** Years 2000–2099 keep the regex honest without being a real constraint. */
export const MONTH_TOKEN_RE = /^20\d{2}-(0[1-9]|1[0-2])$/;

export const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Canonical YYYY-MM token, or '' when malformed (silent-default rule). */
export function parseMonthToken(value: string): string {
  return MONTH_TOKEN_RE.test(value) ? value : '';
}

/** Pure string math for prev/next month links — no zone involvement. */
export function shiftMonthToken(token: string, delta: number): string {
  if (!MONTH_TOKEN_RE.test(token)) return token;
  const [year, month] = token.split('-').map(Number);
  const index = year * 12 + (month - 1) + delta;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

/** Pure calendar math on a YYYY-MM-DD key — Date.UTC normalizes overflow, so
 *  shifting Aug 28 by +7 lands on Sep 4. No zone involvement: keys are
 *  calendar values (the due-window bounds). */
export function shiftDayKey(key: string, delta: number): string {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + delta))
    .toISOString()
    .slice(0, 10);
}

/** Whole days from one YYYY-MM-DD key to another (negative when `to` is
 *  earlier). Both sides parse as UTC midnights, so DST can't shave or add an
 *  hour and round the difference the wrong way — the same reason the columns
 *  are `date` and not `timestamptz`. */
export function daysBetweenDayKeys(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000,
  );
}

/** First day of a YYYY-MM token as a day key. */
export function monthFirstKey(token: string): string {
  return `${token}-01`;
}
