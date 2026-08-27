/**
 * The dropdown-trigger self-check (no DB, no env, no browser).
 *
 * A Radix DropdownMenu opens on `pointerdown` and ignores the `click` that
 * follows; on a machine where pointerdown never reaches the page every menu in
 * the dashboard is dead while every click-driven button beside it works — the
 * 2026-08-27 report. The fallback in src/components/Admin/DropdownMenu.tsx
 * opens on the click when Radix did not act on the press, and both ways it can
 * be wrong are silent: fire after Radix already acted and the menu toggles
 * straight shut again (the bug, reproduced by its fix); stand down when it
 * should fire and nothing changes at all.
 *
 * `radixHandlesPointerDown` and `clickShouldOpen` are a pure leaf
 * (menuTrigger.ts, the `resolvePull` precedent) so this file can reach them.
 * It also reads Radix's own trigger source and refuses to pass if the
 * predicate it mirrors has moved. Run it after touching menuTrigger.ts or
 * upgrading radix-ui.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import {
  CLICK_FALLBACK_WINDOW_MS,
  clickShouldOpen,
  radixHandlesPointerDown,
} from '@/components/Admin/menuTrigger';

let pass = 0;
let fail = 0;
const ok = (name: string, got: unknown, want: unknown) => {
  const good = JSON.stringify(got) === JSON.stringify(want);
  console.log(
    `${good ? 'PASS' : 'FAIL'}  ${name}  got=${JSON.stringify(got)}${good ? '' : ` want=${JSON.stringify(want)}`}`,
  );
  if (good) pass++;
  else fail++;
};

// ---- the predicate Radix applies to a press --------------------------------
ok('a plain left press is Radix’s', radixHandlesPointerDown({ button: 0, ctrlKey: false }), true);
// macOS ctrl-click is a right click; Radix steps aside and so must we — a
// press we predicted wrongly would stand the fallback down on a click Radix
// never acted on.
ok('a ctrl-left press is NOT Radix’s', radixHandlesPointerDown({ button: 0, ctrlKey: true }), false);
ok('a right press is not Radix’s', radixHandlesPointerDown({ button: 2, ctrlKey: false }), false);
ok('a middle press is not Radix’s', radixHandlesPointerDown({ button: 1, ctrlKey: false }), false);
ok('a disabled trigger handles nothing', radixHandlesPointerDown({ button: 0, ctrlKey: false }, true), false);

// ---- the click decision -----------------------------------------------------
const now = 10_000;
ok('an open menu never reopens on click', clickShouldOpen({ open: true, handledAt: null, now }), false);
ok(
  'an open menu never reopens even with a stale record',
  clickShouldOpen({ open: true, handledAt: now - 60_000, now }),
  false,
);
ok('a click with no pointerdown behind it opens', clickShouldOpen({ open: false, handledAt: null, now }), true);
ok(
  'a click right after a handled press stands down',
  clickShouldOpen({ open: false, handledAt: now - 120, now }),
  false,
);
ok(
  'exactly at the window still counts as the same press',
  clickShouldOpen({ open: false, handledAt: now - CLICK_FALLBACK_WINDOW_MS, now }),
  false,
);
ok(
  'one ms past the window is a new activation',
  clickShouldOpen({ open: false, handledAt: now - CLICK_FALLBACK_WINDOW_MS - 1, now }),
  true,
);
ok(
  'a backward clock stands down rather than reopening',
  clickShouldOpen({ open: false, handledAt: now + 50, now }),
  false,
);
ok('the window is a real number of milliseconds', CLICK_FALLBACK_WINDOW_MS > 0 && CLICK_FALLBACK_WINDOW_MS <= 5_000, true);

// ---- the arcs, end to end. Each is a machine this has to be right on. -------
/** One trigger's life: a press may or may not be handled, then a click lands. */
function arc(press: { button: number; ctrlKey: boolean } | null, gapMs: number, open: boolean) {
  const handledAt = press && radixHandlesPointerDown(press) ? now - gapMs : null;
  return clickShouldOpen({ open, handledAt, now });
}
// The working machine: pointerdown opened it, the click that follows is a no-op.
ok('an ordinary click on a working mouse is a no-op', arc({ button: 0, ctrlKey: false }, 90, true), false);
// The reported machine: the press never arrived, only the click did.
ok('a click whose pointerdown was swallowed opens', arc(null, 0, false), true);
// A stuck or held Ctrl on Windows: the press arrives, Radix ignores it, the
// click still fires (Windows, unlike macOS, fires click for ctrl-click).
ok('a ctrl-click on Windows opens', arc({ button: 0, ctrlKey: true }, 90, false), true);
// Voice control after an abandoned drag: the old press is well outside the
// window, so the synthesised click is its own activation.
ok('a synthesised click long after an abandoned press opens', arc({ button: 0, ctrlKey: false }, 30_000, false), true);
// A non-modal menu closed by a press on its own trigger: Radix toggled it shut
// on the pointerdown; the click must not swing it open again.
ok('the click after a press that CLOSED the menu stands down', arc({ button: 0, ctrlKey: false }, 200, false), false);

// ---- drift guard: the predicate we mirror is still Radix’s ------------------
// The leaf claims to match react-dropdown-menu's trigger byte for byte. If a
// Radix upgrade changes the rule, this fails instead of every menu double-
// toggling on the machines the fallback exists for.
// The package's exports map only exposes its entry, so resolve THAT and read
// the ESM build sitting beside it — the file the app actually bundles.
const radixEntry = createRequire(import.meta.url).resolve(
  '@radix-ui/react-dropdown-menu',
);
const radixTriggerSource = readFileSync(
  join(dirname(radixEntry), 'index.mjs'),
  'utf8',
);
ok(
  'Radix’s trigger still acts on exactly "left button, no Ctrl, not disabled"',
  radixTriggerSource.includes('!disabled && event.button === 0 && event.ctrlKey === false'),
  true,
);
ok(
  'Radix’s trigger still opens on pointerdown, not click (or the fallback is dead weight)',
  /onPointerDown: composeEventHandlers\(props\.onPointerDown, \(event\) => \{\s*if \(!disabled && event\.button === 0/.test(
    radixTriggerSource,
  ),
  true,
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
