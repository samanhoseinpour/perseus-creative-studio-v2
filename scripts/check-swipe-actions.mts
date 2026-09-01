/**
 * Phone-board swipe self-check — the gesture arbitration, executable.
 *
 * Run:  node --import tsx scripts/check-swipe-actions.mts   (no DB, no env)
 *
 * Below 768px /admin/tasks renders each task as a card, and one finger has to
 * mean three different things on it: the page scrolls, the card swipes, a
 * still finger selects. Nothing about that is checkable by looking at a
 * screen — every wrong answer still renders a plausible card — so the two
 * pure functions the whole gesture rests on live in useSwipeReveal.ts as
 * leaves (the taskPredicates.ts precedent) and are pinned here.
 *
 * Three failures this exists to catch, in order of what they cost:
 *
 *   - A right-swipe may only ever push work FORWARD along the ladder, and
 *     must resolve to nothing at the end of it. Anything that could move a
 *     task BACKWARDS pulls it out of a month that has been reported, and
 *     /share/reports/[token] recomputes live, so a link already sent to a
 *     client changes with it. That is not something a flick may do, and the
 *     refusal is invisible until someone's numbers move.
 *   - A scroll read as a swipe drags a card the reader never meant to touch
 *     and can commit a delete. Ties between the axes therefore go to SCROLL:
 *     the two mistakes are not equal, and the other one costs one repeated
 *     gesture.
 *   - A commit threshold measured in pixels rather than as a fraction of the
 *     card's own width feels like a different gesture on a 320px phone and a
 *     760px tablet held in portrait.
 *
 * Run it after touching resolveGesture, resolveSwipeAction, or the three
 * constants below.
 */
import {
  advanceLabel,
  canSwipeAdvance,
  LONG_PRESS_MS,
  resolveGesture,
  resolveSwipeAction,
  SWIPE_COMMIT_RATIO,
  SWIPE_SLOP,
} from '@/hooks/useSwipeReveal';
import {
  advanceTargets,
  SHIPPED_STATUSES,
  TASK_STATUS_LABELS,
  TASK_STATUS_SLUGS,
  type TaskStatusSlug,
} from '@/lib/taskFields';

let fails = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)}${ok ? '' : ` want=${JSON.stringify(want)}`}`,
  );
};

// A 360px card — a small phone, so the ratios land on awkward numbers rather
// than round ones. Commit distance is 360 * 0.35 = 126px.
const W = 360;
const COMMIT = W * SWIPE_COMMIT_RATIO;

// ── The constants themselves ───────────────────────────────────────────────
// Pinned as literals: each is a feel decision someone will one day "tidy",
// and each has a failure mode at the wrong value. Slop too small and every
// tap becomes a swipe; the long press too short and scrolling selects rows.

eq('slop is 8px', SWIPE_SLOP, 8);
eq('long press is 500ms', LONG_PRESS_MS, 500);
eq('commit ratio is 0.35 of the card', SWIPE_COMMIT_RATIO, 0.35);

// ── resolveGesture: scroll vs swipe vs press ───────────────────────────────

eq('a still finger is undecided before the timer', resolveGesture(0, 0, 0), 'pending');
eq(
  'still, one tick short of the press',
  resolveGesture(0, 0, LONG_PRESS_MS - 1),
  'pending',
);
eq('still, exactly at the press', resolveGesture(0, 0, LONG_PRESS_MS), 'press');
eq('still, well past it', resolveGesture(2, 2, LONG_PRESS_MS + 400), 'press');

// Slop is a box, not a radius: a finger 7px along BOTH axes has still not
// committed to anything, which is what stops a shaky tap arming a delete.
eq('inside the slop box on both axes', resolveGesture(7, 7, 100), 'pending');
eq('one px past the slop, sideways', resolveGesture(SWIPE_SLOP, 1, 100), 'swipe');
eq('one px past the slop, downwards', resolveGesture(1, SWIPE_SLOP, 100), 'scroll');

// Past the slop, dominance decides and the timer no longer matters — a slow
// drag must not become a long-press halfway through.
eq('a slow drag is still a drag', resolveGesture(40, 3, LONG_PRESS_MS + 999), 'swipe');
eq('a slow scroll is still a scroll', resolveGesture(3, 40, LONG_PRESS_MS + 999), 'scroll');

eq('clearly horizontal', resolveGesture(60, 10, 200), 'swipe');
eq('clearly vertical', resolveGesture(10, 60, 200), 'scroll');
eq('horizontal, leftwards', resolveGesture(-60, 10, 200), 'swipe');
eq('vertical, upwards', resolveGesture(10, -60, 200), 'scroll');
eq('diagonal, horizontal-dominant', resolveGesture(-50, 49, 200), 'swipe');
eq('diagonal, vertical-dominant', resolveGesture(50, -51, 200), 'scroll');
// THE tie. Reading a scroll as a swipe can commit a delete; reading a swipe
// as a scroll costs one repeated gesture. Ties go to the cheap mistake.
eq('a dead tie goes to scroll', resolveGesture(30, 30, 200), 'scroll');
eq('a dead tie goes to scroll, mirrored', resolveGesture(-30, 30, 200), 'scroll');

// ── resolveSwipeAction: what a release commits ─────────────────────────────

eq('short left travel springs back', resolveSwipeAction('todo', -(COMMIT - 1), W), null);
eq('left travel at the threshold deletes', resolveSwipeAction('todo', -COMMIT, W), 'delete');
eq('a long left flick deletes', resolveSwipeAction('todo', -W, W), 'delete');
eq('short right travel springs back', resolveSwipeAction('todo', COMMIT - 1, W), null);
eq('right travel at the threshold advances', resolveSwipeAction('todo', COMMIT, W), 'advance');
eq('no travel commits nothing', resolveSwipeAction('todo', 0, W), null);

// The ratio, not a pixel count: the same fraction of a wide card and a narrow
// one must both commit, and a travel that commits on a phone must NOT commit
// on a card two-and-a-bit times wider.
eq('126px commits on a 360px card', resolveSwipeAction('todo', -126, 360), 'delete');
eq('126px does NOT commit on a 760px card', resolveSwipeAction('todo', -126, 760), null);
eq('266px commits on a 760px card', resolveSwipeAction('todo', -266, 760), 'delete');

// An unmeasured card (width 0) must refuse rather than treat every twitch as
// a full-width flick — 0 * 0.35 is 0, and |dx| >= 0 is true for ANY travel.
eq('an unmeasured card commits nothing', resolveSwipeAction('todo', -500, 0), null);
eq('a negative width commits nothing', resolveSwipeAction('todo', -500, -10), null);

// ── Where a flick may go, over the whole status vocabulary ─────────────────
// Written as a sweep rather than six literals so a status added later is
// forced through this decision instead of silently inheriting one.

/** The stages each status may be flicked to, or [] for "nowhere". A SECOND,
 *  independent statement of the fork: advanceTargets derives it from the
 *  status sets, and this map spells it out, so a change to those constants
 *  fails here rather than quietly changing what a swipe does.
 *
 *  Note `done` lists BOTH. Delivered and posted are exclusive, so the gesture
 *  cannot pick one — it commits the intent and the confirm asks which. What
 *  the swipe still guarantees on its own is that neither answer goes
 *  backwards. */
const ADVANCE_TO: Record<TaskStatusSlug, TaskStatusSlug[]> = {
  todo: ['done'],
  in_progress: ['done'],
  needs_approval: ['done'],
  done: ['delivered', 'posted'],
  delivered: [],
  posted: [],
};

for (const status of TASK_STATUS_SLUGS) {
  const targets = ADVANCE_TO[status];
  eq(`advanceTargets('${status}')`, [...advanceTargets(status)], targets);
  eq(
    `right-swipe on '${status}' ${targets.length ? 'advances' : 'refuses'}`,
    resolveSwipeAction(status, W, W),
    targets.length ? 'advance' : null,
  );
  eq(`canSwipeAdvance('${status}')`, canSwipeAdvance(status), targets.length > 0);
  // Delete is offered on EVERY status, the terminals included: removing a task
  // is already fronted by a confirm that names what it costs.
  eq(`left-swipe on '${status}' deletes`, resolveSwipeAction(status, -W, W), 'delete');
}

// A flick only ever goes FORWARD, which is the property the whole refusal
// rests on. Asserted over the sweep rather than trusted from the map above: a
// target that ever pointed backwards would let a flick reopen reported work,
// and every screen would still look right.
const LADDER_INDEX = (s: TaskStatusSlug) =>
  (SHIPPED_STATUSES as readonly string[]).indexOf(s);
for (const status of TASK_STATUS_SLUGS) {
  const from = LADDER_INDEX(status);
  for (const target of advanceTargets(status)) {
    eq(
      `'${status}' → '${target}' advances forward, never back`,
      from === -1 || LADDER_INDEX(target) > from,
      true,
    );
  }
}

// The reveal's own words. A fork cannot name a single stage, and naming one
// anyway is the quiet failure here: the card would promise "Delivered" and
// then open a dialog asking which, or worse, promise it and be taken at its
// word by whoever built the next surface off this label.
eq("advanceLabel('todo')", advanceLabel('todo'), 'Done');
eq("advanceLabel('needs_approval')", advanceLabel('needs_approval'), 'Done');
eq("advanceLabel('done') names the question", advanceLabel('done'), 'Deliver or post');
for (const status of TASK_STATUS_SLUGS) {
  // Empty exactly when there is nowhere to go, so the reveal can never paint a
  // labelled action behind a swipe that refuses.
  eq(
    `advanceLabel('${status}') is empty iff it refuses`,
    advanceLabel(status) === '',
    !canSwipeAdvance(status),
  );
  // And never a bare stage name where two are possible.
  if (advanceTargets(status).length > 1) {
    eq(
      `advanceLabel('${status}') names no single stage`,
      advanceTargets(status).some(
        (t) => advanceLabel(status) === TASK_STATUS_LABELS[t],
      ),
      false,
    );
  }
}

// A refused direction must resolve to null at every distance, not just at the
// full flick above — a partial right-swipe on a posted row must not creep past
// the threshold into anything at all.
for (const dx of [1, COMMIT - 1, COMMIT, COMMIT + 1, W * 10]) {
  eq(
    `posted row refuses a right-swipe of ${Math.round(dx)}px`,
    resolveSwipeAction('posted', dx, W),
    null,
  );
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
