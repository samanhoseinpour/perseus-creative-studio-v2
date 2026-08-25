/**
 * The unbidden-dialog timing self-check (no DB, no env, no browser).
 *
 * `src/components/Admin/promptTiming.ts` decides when a dialog nobody asked
 * for may take the screen, and BOTH of its failure modes are silent: open too
 * eagerly and you land on top of PasskeyPrompt or the open mobile nav, or eat
 * what someone was typing into an autofocused search box; give up wrongly and
 * the note simply never appears, with nothing anywhere to say so.
 *
 * The selector is the load-bearing part and it is pinned deliberately. It is
 * plain `[role="dialog"]` rather than the Radix-specific
 * `[role="dialog"][data-state="open"]` because MobileSheet is hand-rolled and
 * carries no `data-state` — the narrow version missed it entirely and opened
 * over the nav. Mutating it back to the narrow form fails four assertions
 * here, which is the proof those assertions are not vacuous.
 *
 * Run it after touching promptTiming.ts, or after adding a third dialog that
 * opens at the viewer rather than in reply to a click.
 */
import {
  blockedFromOpening,
  scheduleDialogOpen,
  OPEN_DELAY_MS,
  RETRY_MS,
  MAX_TRIES,
} from '@/components/Admin/promptTiming';

let pass = 0;
let fail = 0;
const ok = (name: string, got: unknown, want: unknown) => {
  const good = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${good ? 'PASS' : 'FAIL'}  ${name}  got=${JSON.stringify(got)}`);
  if (good) pass++;
  else fail++;
};

/** Just enough DOM and timer surface for promptTiming to run under node. */
type FakeElement = { tagName: string; isContentEditable: boolean };
const g = globalThis as unknown as {
  document: {
    querySelector: (sel: string) => object | null;
    readonly activeElement: FakeElement | null;
  };
  setTimeout: (fn: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
};

// ── fake DOM ────────────────────────────────────────────────────────────────
let dialogSelectorHits: string[] = [];
let active: FakeElement | null = null;
g.document = {
  querySelector: (sel: string) => (dialogSelectorHits.includes(sel) ? {} : null),
  get activeElement() { return active; },
};

// ── fake timers ─────────────────────────────────────────────────────────────
let now = 0;
let queue: { at: number; id: number; fn: () => void }[] = [];
let nextId = 1;
const realST = g.setTimeout;
const realCT = g.clearTimeout;
g.setTimeout = (fn: () => void, ms: number) => {
  const id = nextId++;
  queue.push({ at: now + ms, id, fn });
  return id;
};
g.clearTimeout = (id: number) => {
  queue = queue.filter((t) => t.id !== id);
};
const advance = (ms: number) => {
  const target = now + ms;
  for (;;) {
    const due = queue.filter((t) => t.at <= target).sort((a, b) => a.at - b.at)[0];
    if (!due) break;
    queue = queue.filter((t) => t.id !== due.id);
    now = due.at;
    due.fn();
  }
  now = target;
};
const reset = () => { now = 0; queue = []; dialogSelectorHits = []; active = null; };

// ── blockedFromOpening ──────────────────────────────────────────────────────
console.log('\n— blockedFromOpening');
reset();
ok('nothing open, nothing focused → free', blockedFromOpening(), false);

dialogSelectorHits = ['[role="dialog"], [role="alertdialog"]'];
ok('another dialog in the DOM → blocked', blockedFromOpening(), true);

reset();
active = { tagName: 'INPUT', isContentEditable: false };
ok('someone typing in an INPUT → blocked', blockedFromOpening(), true);
active = { tagName: 'TEXTAREA', isContentEditable: false };
ok('…a TEXTAREA too', blockedFromOpening(), true);
active = { tagName: 'DIV', isContentEditable: true };
ok('…and a contentEditable', blockedFromOpening(), true);
active = { tagName: 'BUTTON', isContentEditable: false };
ok('a focused BUTTON is not typing → free', blockedFromOpening(), false);

// ── scheduleDialogOpen ──────────────────────────────────────────────────────
console.log('\n— scheduleDialogOpen');
reset();
let opened = 0;
scheduleDialogOpen(() => opened++);
advance(OPEN_DELAY_MS - 1);
ok('does NOT open before the paint beat', opened, 0);
advance(1);
ok('opens on the beat when unblocked', opened, 1);

reset();
opened = 0;
dialogSelectorHits = ['[role="dialog"], [role="alertdialog"]'];
scheduleDialogOpen(() => opened++);
advance(OPEN_DELAY_MS);
ok('blocked at the beat → still closed', opened, 0);
advance(RETRY_MS * 3);
ok('…keeps retrying, still blocked', opened, 0);
dialogSelectorHits = [];
advance(RETRY_MS);
ok('…opens once the other dialog closes', opened, 1);

reset();
opened = 0;
dialogSelectorHits = ['[role="dialog"], [role="alertdialog"]'];
scheduleDialogOpen(() => opened++);
advance(OPEN_DELAY_MS + RETRY_MS * (MAX_TRIES + 5));
ok('gives up rather than polling for ever', opened, 0);
ok('…and leaves no timer behind', queue.length, 0);

reset();
opened = 0;
const cancel = scheduleDialogOpen(() => opened++);
cancel();
advance(OPEN_DELAY_MS * 5);
ok('cleanup cancels a pending open', opened, 0);

g.setTimeout = realST;
g.clearTimeout = realCT;
console.log(`\n${fail === 0 ? 'ALL PASS' : `${fail} FAILED`}  (${pass} passed)`);
process.exit(fail === 0 ? 0 : 1);
