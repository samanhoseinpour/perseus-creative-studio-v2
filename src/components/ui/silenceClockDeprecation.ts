'use client';

import { getConsoleFunction, setConsoleFunction } from 'three';

// three r183 deprecated THREE.Clock in favour of THREE.Timer and put the notice
// straight in Clock's constructor. @react-three/fiber still builds its root
// store with `clock: new THREE.Clock()` (still true in 9.7.0, the latest), so
// every <Canvas> mount logs
//
//   THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.
//
// exactly once — in the dev terminal *and* in visitors' consoles, since three
// doesn't gate the warning on NODE_ENV. Nothing here constructs a Clock
// (shader4/5 only read the `state.clock` r3f hands them) and r3f offers no way
// to supply a Timer instead, so it's noise we can't act on.
//
// three's supported escape hatch is setConsoleFunction(): one global hook that
// every THREE.log/warn/error routes through. Drop that single message, forward
// everything else untouched.
//
// DELETE THIS once @react-three/fiber moves its store over to THREE.Timer.

type ThreeConsole = Parameters<typeof setConsoleFunction>[0];

let applied = false;

/**
 * Registers the filter. Called at module scope by shader4/shader5, which r3f
 * only loads via `dynamic()` — module evaluation finishes long before the
 * `<Canvas>` renders and `createStore` constructs the Clock, so the hook is
 * always in place first. Idempotent: both shaders load when the theme flips.
 */
export function silenceClockDeprecation() {
  if (applied) return;
  applied = true;

  // Typed non-nullable, but three leaves it null until something sets one.
  const previous = getConsoleFunction() as ThreeConsole | null;

  setConsoleFunction((type, message, ...params) => {
    if (
      type === 'warn' &&
      message.startsWith('THREE.Clock:') &&
      message.includes('deprecated')
    ) {
      return;
    }

    if (previous) previous(type, message, ...params);
    else console[type](message, ...params);
  });
}
