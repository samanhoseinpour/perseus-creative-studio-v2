/**
 * Calendar self-check — the timezone door, executable.
 *
 * Run:  node --import tsx scripts/check-calendar.mts    (no DB, no env)
 *
 * src/lib/calendar.ts decides which calendar day every instant in the app
 * belongs to, for every reader. There is no test runner in this repo (see
 * CLAUDE.md), and a regression here is silent: dates keep rendering, they are
 * just the wrong day — which is exactly the bug this module was written to
 * fix. Tasks were being filed a day early and last night's work was appearing
 * under "Today", because the whole dashboard bucketed on America/Vancouver
 * while most of the team works from Tehran (+11.5h in summer).
 *
 * The reported bug is pinned as the first assertion below. If it fails, the
 * door is broken — fix the code, not the fixture.
 */
import {
  STUDIO_TZ,
  dayKeyIn,
  dayStartIn,
  daysBetweenDayKeys,
  isValidTimeZone,
  monthTokenIn,
  monthWindowIn,
  parseMonthToken,
  recentSinceIn,
  resolveZone,
  shiftDayKey,
  shiftMonthToken,
  supportedTimeZones,
  zonedFormat,
} from '@/lib/calendar';

const TEHRAN = 'Asia/Tehran';

let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : ` want=${JSON.stringify(want)}`}`,
  );
};

// ---- THE REPORTED BUG, pinned.
// 2026-08-19 22:15 UTC is 2026-08-20 01:45 in Tehran and 2026-08-19 15:15 in
// Vancouver. Adding a task at that moment from Tehran must default to Aug 20.
const BUG = new Date('2026-08-19T22:15:00.000Z');
eq('the bug: Tehran sees Aug 20', dayKeyIn(TEHRAN, BUG), '2026-08-20');
eq('the bug: Vancouver sees Aug 19', dayKeyIn(STUDIO_TZ, BUG), '2026-08-19');

// The digest's Today/Yesterday split at the same instant: work finished at
// 2026-08-19 20:00 Tehran is YESTERDAY for a Tehran reader and TODAY for a
// Vancouver one. Both are correct; that is the whole point.
const DONE = new Date('2026-08-19T16:30:00.000Z'); // 20:00 Tehran, 09:30 PT
eq('digest: Tehran files it on Aug 19', dayKeyIn(TEHRAN, DONE), '2026-08-19');
eq(
  'digest: Tehran today is Aug 20, so that is Yesterday',
  dayKeyIn(TEHRAN, DONE) === dayKeyIn(TEHRAN, BUG),
  false,
);
eq(
  'digest: Vancouver today is Aug 19, so that is Today',
  dayKeyIn(STUDIO_TZ, DONE) === dayKeyIn(STUDIO_TZ, BUG),
  true,
);

// ---- day-start round trip: local midnight of a key is never after an instant
// on that key, and is always within 24h of it.
for (const tz of [STUDIO_TZ, TEHRAN, 'UTC', 'Australia/Sydney']) {
  for (const iso of [
    '2026-08-19T22:15:00.000Z',
    '2026-11-01T09:30:00.000Z', // Vancouver falls back 02:00 this day
    '2026-03-08T10:30:00.000Z', // Vancouver springs forward 02:00 this day
    '2026-12-31T23:59:59.000Z',
  ]) {
    const at = new Date(iso);
    const start = dayStartIn(tz, dayKeyIn(tz, at));
    const delta = at.getTime() - start.getTime();
    eq(
      `round trip ${tz} ${iso.slice(0, 10)}`,
      delta >= 0 && delta < 25 * 3_600_000,
      true,
    );
    // ...and the start instant must itself report the same day key.
    eq(`start keys back ${tz} ${iso.slice(0, 10)}`, dayKeyIn(tz, start), dayKeyIn(tz, at));
  }
}

// ---- Zones whose DST shift is AT 00:00 local, where midnight NEVER HAPPENS:
// the clock jumps 23:59:59 -> 01:00. A naive offset correction settles an hour
// short, on 23:00 of the previous day, so every window built on it spans the
// wrong day while dayKeyIn labels it correctly — the filter and the label
// disagree, which is the one thing this module exists to prevent. None of the
// current roster is affected (Vancouver shifts at 02:00, Tehran has no DST),
// but /admin/profile offers all 418 zones, so this is reachable.
for (const [tz, key] of [
  ['America/Santiago', '2026-09-06'],
  ['America/Havana', '2026-03-08'],
  ['Atlantic/Azores', '2026-03-29'],
  ['Australia/Lord_Howe', '2026-10-04'], // a 30-minute shift, not an hour
] as [string, string][]) {
  eq(`midnight-shift ${tz} keys back`, dayKeyIn(tz, dayStartIn(tz, key)), key);
  // ...and it must be the FIRST moment of that day, not merely somewhere in
  // it: one minute earlier still has to belong to the previous day.
  eq(
    `midnight-shift ${tz} is the first moment`,
    dayKeyIn(tz, new Date(dayStartIn(tz, key).getTime() - 60_000)) < key,
    true,
  );
}

// ---- DST. Vancouver still observes it; Tehran DROPPED it in 2022. Assert
// both, so a future ICU/tzdata change that reinstates Iranian DST is caught
// here rather than by someone's dates quietly moving.
const vanJan = dayStartIn(STUDIO_TZ, '2026-01-15');
const vanJul = dayStartIn(STUDIO_TZ, '2026-07-15');
eq('Vancouver Jan midnight is 08:00Z (PST)', vanJan.toISOString(), '2026-01-15T08:00:00.000Z');
eq('Vancouver Jul midnight is 07:00Z (PDT)', vanJul.toISOString(), '2026-07-15T07:00:00.000Z');
const tehJan = dayStartIn(TEHRAN, '2026-01-15');
const tehJul = dayStartIn(TEHRAN, '2026-07-15');
eq('Tehran Jan midnight is 20:30Z prev day', tehJan.toISOString(), '2026-01-14T20:30:00.000Z');
eq('Tehran has NO DST (Jul offset == Jan offset)', tehJul.toISOString(), '2026-07-14T20:30:00.000Z');

// The spring-forward day is 23h long: yesterday must still be yesterday.
const springAfter = new Date('2026-03-08T18:00:00.000Z'); // 11:00 PDT Mar 8
eq(
  'DST: yesterday is Mar 7, not ms-math Mar 7 23:00',
  dayKeyIn(STUDIO_TZ, recentSinceIn(STUDIO_TZ, 2, springAfter)),
  '2026-03-07',
);
eq(
  'DST: a 7-day window starts Mar 2',
  dayKeyIn(STUDIO_TZ, recentSinceIn(STUDIO_TZ, 7, springAfter)),
  '2026-03-02',
);

// ---- month windows. THE ACCEPTED EDGE, written down as a decision rather
// than left to be discovered: a task completed Aug 31 20:00 Vancouver time is
// already Sep 1 in Tehran, so it counts toward August for a Vancouver reader
// and September for a Tehran one. Both reports are internally consistent; the
// two disagree only about the last few hours of a month.
const EDGE = new Date('2026-09-01T03:00:00.000Z'); // Aug 31 20:00 PDT
const augVan = monthWindowIn(STUDIO_TZ, '2026-08')!;
const augTeh = monthWindowIn(TEHRAN, '2026-08')!;
eq(
  'edge: in August for Vancouver',
  EDGE >= augVan.since && EDGE < augVan.until,
  true,
);
eq(
  'edge: in September for Tehran',
  EDGE >= augTeh.since && EDGE < augTeh.until,
  false,
);
eq('month token agrees, Vancouver', monthTokenIn(STUDIO_TZ, EDGE), '2026-08');
eq('month token agrees, Tehran', monthTokenIn(TEHRAN, EDGE), '2026-09');

// Windows are half-open and contiguous: August's end IS September's start.
eq(
  'Aug until == Sep since',
  augVan.until.toISOString(),
  monthWindowIn(STUDIO_TZ, '2026-09')!.since.toISOString(),
);
eq('December rolls the year', monthWindowIn(STUDIO_TZ, '2026-12')!.until.toISOString(), '2027-01-01T08:00:00.000Z');
eq('malformed month is null', monthWindowIn(STUDIO_TZ, '2026-13'), null);
eq('empty month is null', monthWindowIn(STUDIO_TZ, ''), null);

// ---- zone resolution must NEVER throw: it runs on every protected render,
// and a RangeError here would 500 the whole dashboard.
eq('resolve junk', resolveZone('Mars/Olympus'), STUDIO_TZ);
eq('resolve empty', resolveZone(''), STUDIO_TZ);
eq('resolve null', resolveZone(null), STUDIO_TZ);
eq('resolve undefined', resolveZone(undefined), STUDIO_TZ);
eq('resolve path traversal', resolveZone('../../etc/passwd'), STUDIO_TZ);
eq('resolve overlong', resolveZone('A'.repeat(200)), STUDIO_TZ);
eq('resolve real zone', resolveZone(TEHRAN), TEHRAN);
eq('validate real zone', isValidTimeZone(TEHRAN), true);
eq('validate junk', isValidTimeZone('Nope/Nope'), false);
eq('validate injection chars', isValidTimeZone("UTC'; drop--"), false);
// A LINK name (not canonical) must still validate — browsers report these,
// and refusing them would reject a real detection.
eq('validate IANA link name', isValidTimeZone('Asia/Calcutta'), true);
eq('resolve keeps the link name', resolveZone('Asia/Calcutta'), 'Asia/Calcutta');

// ---- formatter cache: same instance back, and never poisoned by junk.
const f1 = zonedFormat(TEHRAN, { hour: 'numeric' });
const f2 = zonedFormat(TEHRAN, { hour: 'numeric' });
eq('formatter is cached', f1 === f2, true);
eq('different zone, different formatter', zonedFormat(STUDIO_TZ, { hour: 'numeric' }) === f1, false);
eq(
  'invalid zone falls back to studio, does not throw',
  zonedFormat('Mars/Olympus', { hour: 'numeric' }).resolvedOptions().timeZone,
  STUDIO_TZ,
);
eq('picker list contains the studio zone', supportedTimeZones().includes(STUDIO_TZ), true);
eq('picker list contains Tehran', supportedTimeZones().includes(TEHRAN), true);

// ---- pure calendar-key math: no zone, no DST, no drift.
eq('shift across a month', shiftDayKey('2026-08-28', 7), '2026-09-04');
eq('shift backwards across a year', shiftDayKey('2026-01-01', -1), '2025-12-31');
eq('shift over spring-forward is still 1 day', shiftDayKey('2026-03-07', 1), '2026-03-08');
eq('days between', daysBetweenDayKeys('2026-08-01', '2026-08-31'), 30);
eq('days between is signed', daysBetweenDayKeys('2026-08-31', '2026-08-01'), -30);
eq('days across DST is whole', daysBetweenDayKeys('2026-03-07', '2026-03-09'), 2);
eq('month token shift', shiftMonthToken('2026-01', -1), '2025-12');
eq('month token shift forward', shiftMonthToken('2026-12', 1), '2027-01');
eq('parse good month', parseMonthToken('2026-08'), '2026-08');
eq('parse bad month', parseMonthToken('2026-8'), '');
eq('parse month 00', parseMonthToken('2026-00'), '');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
