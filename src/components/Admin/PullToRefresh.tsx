'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LuArrowDown, LuLoaderCircle } from 'react-icons/lu';

import {
  PULL_DIALOG_SELECTOR,
  PULL_MAX_PX,
  pullOffset,
  resolvePull,
  type PullPhase,
} from './pullTiming';

/** How long the spinner holds. router.refresh() resolves nothing we can await. */
const SETTLE_MS = 600;

/**
 * Pull down at the top of an installed dashboard to refresh it.
 *
 * Renders nothing until a finger is actually pulling. All the decisions live
 * in ./pullTiming.ts, which is pure and pinned by
 * scripts/check-pull-to-refresh.mts; this file owns only the listeners and the
 * paint.
 *
 * iOS HOME-SCREEN ONLY, via `navigator.standalone`, and the narrowness is the
 * point. That is the one place with no reload affordance at all: no address
 * bar, no menu, no keyboard. Everywhere else already has one and would end up
 * with two — Chrome on Android draws its OWN pull-to-refresh in a standalone
 * window, so gating on `display-mode: standalone` instead would put two
 * spinners under one finger there. A desktop installed app has Cmd-R.
 *
 * It does NOT preventDefault and does NOT touch `overscroll-behavior`. iOS
 * already rubber-bands the page at the top; the indicator rides that motion
 * rather than fighting it, so nothing else in the dashboard changes feel and
 * the gesture stays cancellable by just letting go.
 */
export default function PullToRefresh() {
  const router = useRouter();
  const [phase, setPhase] = useState<PullPhase>('idle');
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);

  // Mirrors of the rendered state, because the listeners below are registered
  // once and would otherwise close over the first render's values.
  const phaseRef = useRef<PullPhase>('idle');
  const busyRef = useRef(false);
  const enabled = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  /** Set once a NEW service worker has taken over this page (see commit). */
  const shellChanged = useRef(false);

  const apply = useCallback((next: PullPhase, px: number) => {
    phaseRef.current = next;
    setPhase(next);
    setOffset(px);
  }, []);

  const reset = useCallback(() => {
    start.current = null;
    apply('idle', 0);
  }, [apply]);

  // Resolved in an effect, not a useState initializer: this must never differ
  // between the server render and hydration, and on the server there is no
  // navigator to ask.
  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    enabled.current = nav.standalone === true && coarse;
  }, []);

  // sw.js calls skipWaiting() on install and clients.claim() on activate, so a
  // new worker takes over immediately — but the JS already running in this
  // window is still the build it launched with. `controllerchange` is the one
  // reliable signal that the shell underneath us actually changed, and it is
  // recorded rather than acted on: yanking the page out from under a finger
  // mid-gesture would be worse than waiting for the release.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onChange = () => {
      shellChanged.current = true;
    };
    navigator.serviceWorker.addEventListener('controllerchange', onChange);
    return () =>
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
  }, []);

  const commit = useCallback(() => {
    busyRef.current = true;
    setBusy(true);

    // A genuinely newer app shell is already in charge — only a real reload
    // gets this window onto its code. router.refresh() would fetch fresh data
    // into a stale bundle.
    if (shellChanged.current) {
      window.location.reload();
      return;
    }

    // Ask whether sw.js has changed, but never wait for the answer: it arrives
    // as a controllerchange and arms the branch above for the NEXT pull.
    void navigator.serviceWorker
      ?.getRegistration('/')
      .then((reg) => reg?.update())
      .catch(() => {});

    router.refresh();

    // Time-boxed, because router.refresh() gives nothing to await. The spinner
    // is an acknowledgement that the pull registered, not a progress bar.
    window.setTimeout(() => {
      busyRef.current = false;
      setBusy(false);
      apply('idle', 0);
    }, SETTLE_MS);
  }, [router, apply]);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (!enabled.current || busyRef.current) return;
      if (e.touches.length !== 1) return;
      if (window.scrollY > 0) return;
      // A dialog owns the screen and owns the gesture with it.
      if (document.querySelector(PULL_DIALOG_SELECTOR)) return;
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY };
    };

    const onMove = (e: TouchEvent) => {
      const s = start.current;
      if (!s) return;
      if (e.touches.length !== 1) return reset();
      const t = e.touches[0];
      const next = resolvePull({
        dx: t.clientX - s.x,
        dy: t.clientY - s.y,
        // Re-read live: the page may have scrolled away from the top since the
        // finger landed, at which point this is a scroll and not ours.
        atTop: window.scrollY <= 0,
      });
      if (next === 'idle') return reset();
      apply(next, pullOffset(t.clientY - s.y));
    };

    const onEnd = () => {
      const armed = phaseRef.current === 'armed';
      reset();
      if (armed) commit();
    };

    // Passive: this handler never calls preventDefault, and saying so keeps the
    // scroll off the main thread.
    const opts = { passive: true } as const;
    window.addEventListener('touchstart', onStart, opts);
    window.addEventListener('touchmove', onMove, opts);
    window.addEventListener('touchend', onEnd, opts);
    window.addEventListener('touchcancel', reset, opts);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', reset);
    };
  }, [apply, reset, commit]);

  if (!busy && offset <= 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
      style={{
        marginTop: 'env(safe-area-inset-top)',
        transform: `translateY(${busy ? PULL_MAX_PX * 0.6 : offset}px)`,
      }}
    >
      <span className="flex size-9 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-sm">
        {busy ? (
          <LuLoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
        ) : (
          <LuArrowDown
            className="size-4 transition-transform duration-150 motion-reduce:transition-none"
            style={{ transform: phase === 'armed' ? 'rotate(180deg)' : 'none' }}
          />
        )}
      </span>
    </div>
  );
}
