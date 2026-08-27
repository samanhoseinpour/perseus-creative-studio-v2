/**
 * The pull-to-refresh self-check (no DB, no env, no browser).
 *
 * An installed dashboard has no address bar, so until now there was no way to
 * reload it at all — you pulled down, iOS rubber-banded, and nothing happened.
 * The gesture that fixes that has to share one finger with everything else on
 * a phone, and every way it can go wrong is silent: steal the gesture and the
 * task board's card swipes stop committing; give it up too readily and the
 * pull does nothing, which is indistinguishable from the bug it replaces.
 *
 * `resolvePull` is a pure leaf (the `resolveGesture` precedent in
 * useSwipeReveal.ts) so this file can reach it. Run it after touching
 * pullToRefresh.ts.
 */
import {
  PULL_THRESHOLD_PX,
  PULL_MAX_PX,
  PULL_DIALOG_SELECTOR,
  resolvePull,
  pullOffset,
} from '@/components/Admin/pullTiming';

let pass = 0;
let fail = 0;
const ok = (name: string, got: unknown, want: unknown) => {
  const good = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${good ? 'PASS' : 'FAIL'}  ${name}  got=${JSON.stringify(got)}${good ? '' : ` want=${JSON.stringify(want)}`}`);
  if (good) pass++;
  else fail++;
};

const at = (dx: number, dy: number, atTop = true) => resolvePull({ dx, dy, atTop });

// ---- the ordinary arc ------------------------------------------------------
ok('no movement is idle', at(0, 0), 'idle');
ok('a short pull at the top is pulling', at(0, 20), 'pulling');
ok('past the threshold it is armed', at(0, PULL_THRESHOLD_PX + 10), 'armed');
ok('exactly at the threshold it is armed', at(0, PULL_THRESHOLD_PX), 'armed');
ok('one px short is still only pulling', at(0, PULL_THRESHOLD_PX - 1), 'pulling');

// ---- the refusals. Each one is a way the gesture could eat another. --------
ok('not at the top: idle however far you drag', at(0, 500, false), 'idle');
ok('dragging UP is never a pull', at(0, -120), 'idle');
// The task board is card-swipe territory below 768px: left deletes, right marks
// done. A pull that fired on a mostly-horizontal drag would fight it.
ok('a horizontal drag is not a pull', at(200, 30), 'idle');
ok('a diagonal that leans horizontal is not a pull', at(90, 80), 'idle');
ok('a diagonal that leans vertical IS a pull', at(30, 90), 'armed');
// The TIE goes to idle — the mirror of resolveGesture's "tie goes to scroll".
// Reading a swipe as a refresh costs the swipe; the reverse costs one repeat.
ok('an exact tie refuses to refresh', at(80, 80), 'idle');

// ---- the indicator can never run off, and never lies about direction ------
ok('no pull, no offset', pullOffset(0), 0);
ok('offset is never negative on an upward drag', pullOffset(-200) >= 0, true);
ok('offset never exceeds the cap', pullOffset(100_000) <= PULL_MAX_PX, true);
let monotonic = true;
let prev = -1;
for (let dy = 0; dy <= 1000; dy += 7) {
  const o = pullOffset(dy);
  if (o < prev) monotonic = false;
  prev = o;
}
ok('offset never goes backwards as the finger travels', monotonic, true);
ok(
  'the armed threshold is reachable while the indicator still follows',
  PULL_THRESHOLD_PX <= PULL_MAX_PX,
  true,
);

// ---- the dialog selector. The BROAD form, and this is load-bearing: the
// admin's mobile nav (MobileSheet) is hand-rolled and carries role="dialog"
// with no data-state, so the Radix-specific form misses it entirely and the
// nav would refresh the page out from under itself. Same lesson as
// promptTiming.ts, which is why they share the constant rather than each
// keeping a copy.
ok(
  'the dialog selector is the broad form, not the Radix one',
  PULL_DIALOG_SELECTOR.includes('[data-state='),
  false,
);
ok('the dialog selector covers role=dialog', PULL_DIALOG_SELECTOR.includes('[role="dialog"]'), true);
ok(
  'the dialog selector covers role=alertdialog',
  PULL_DIALOG_SELECTOR.includes('[role="alertdialog"]'),
  true,
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
