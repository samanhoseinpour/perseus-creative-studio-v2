'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { Container } from '@/components';
import { useEdgeFade } from '@/hooks/useEdgeFade';
import { cn } from '@/lib/utils';

interface FeatureProjectGalleryProps {
  /** Large cinematic cards (server-rendered) — one per dot. */
  billboards: React.ReactNode[];
  /** Smaller tiles (server-rendered) that scroll in lock-step beneath. */
  tiles: React.ReactNode[];
}

/** How long each billboard holds — the fill animation and the auto-advance
 *  share this single duration, so the indicator is the countdown. */
const AUTOPLAY_MS = 5000;

// useLayoutEffect on the client (so the loop parks before paint — no flash of
// the un-centered set), plain useEffect on the server (no SSR warning).
const useIsoLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * A clone of Apple's homepage entertainment gallery: a peek-centered carousel
 * of large "billboard" cards with a second row of smaller tiles that scrolls in
 * sync beneath them, plus centered pagination dots. Both rows live in one
 * horizontal scroller, so they share a single scrollLeft — the sync is free.
 *
 * Like Apple's, it **loops seamlessly**: each rail is cloned into three copies
 * and scrollLeft is parked in the middle (real) copy; when it drifts a full set
 * into a clone, we jump it back by one set-width — identical content landing on
 * an identical snap point, so the edges are never empty and there's no visible
 * seam. Because both rails are width-matched (tile = half a billboard, equal
 * gaps, tiles = billboards×2), one reset distance realigns both rows.
 *
 * The active dot is a pill that fills left-to-right over AUTOPLAY_MS; when the
 * fill finishes it steps one billboard **forward** (never a long jump back —
 * the loop makes "forward" wrap around). Selecting a project restarts the fill
 * rather than pausing it; the fill only holds while the tab is hidden, and the
 * whole thing degrades to a static full bar with no autoplay and no clones when
 * the visitor prefers reduced motion.
 *
 * Billboards/tiles arrive as server-rendered children so the real copy's <a>
 * links sit in the initial HTML (crawlable). The two clone copies are added
 * client-side only and marked aria-hidden + inert, so they never duplicate the
 * crawlable/focusable links.
 */
const FeatureProjectGallery = ({
  billboards,
  tiles,
}: FeatureProjectGalleryProps) => {
  const railRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ticking = useRef(false);
  const activeRef = useRef(0);
  const progressRef = useRef<HTMLSpanElement | null>(null);
  const animRef = useRef<Animation | null>(null);

  // Loop bookkeeping.
  const loopRef = useRef(false);
  const strideRef = useRef(0); // width of one full set (px)
  const slideStrideRef = useRef(0); // centre-to-centre of adjacent billboards (px)
  const originRef = useRef(0); // scrollLeft at which real billboard 0 is centred
  const resettingRef = useRef(false); // ignore the scroll event our own reset emits

  // Soft edge-fade for the shared scroller — the same hook the filter rails and
  // journal shelf use, so the peeking neighbours dissolve into the container's
  // left/right edges instead of hard-cutting. One node feeds two refs: the
  // gallery's loop math reads `railRef`, while the hook measures the very same
  // scroller to build its L/R mask (both rows fade together off one scrollLeft).
  const { ref: fadeRef, maskImage, measure } = useEdgeFade<HTMLDivElement>();
  const setRail = useCallback(
    (node: HTMLDivElement | null) => {
      railRef.current = node;
      fadeRef.current = node;
    },
    [fadeRef],
  );

  const [active, setActive] = useState(0);
  const [loop, setLoop] = useState(false);
  // Stays false until the loop is cloned + parked, so we never paint the
  // half-formed (un-looped, no-left-peek) state during hydration.
  const [ready, setReady] = useState(false);

  const N = billboards.length;
  const realCopy = loop ? 1 : 0;
  const copyCount = loop ? 3 : 1;

  const centerOn = useCallback(
    (el: HTMLElement | null, behavior: ScrollBehavior) => {
      const rail = railRef.current;
      if (!rail || !el) return;
      const railRect = rail.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const delta =
        elRect.left + elRect.width / 2 - (railRect.left + railRect.width / 2);
      rail.scrollTo({ left: rail.scrollLeft + delta, behavior });
    },
    [],
  );

  const sync = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const railRect = rail.getBoundingClientRect();
    const railCenter = railRect.left + railRect.width / 2;

    let nearest = 0;
    let best = Infinity;
    slideRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const distance = Math.abs(r.left + r.width / 2 - railCenter);
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    });
    activeRef.current = nearest;
    setActive(nearest);
  }, []);

  // Keep scrollLeft parked inside the middle (real) copy: when it drifts a full
  // set into a clone, jump back by one set. Identical content + identical snap
  // point, so it's invisible; one stride realigns both rails (equal widths).
  const maybeReset = useCallback(() => {
    const rail = railRef.current;
    if (!rail || !loopRef.current) return;
    if (resettingRef.current) {
      resettingRef.current = false;
      return;
    }
    const st = strideRef.current;
    if (st <= 0) return;
    let target = rail.scrollLeft;
    while (target - originRef.current >= st - 0.5) target -= st;
    while (target - originRef.current < -0.5) target += st;
    if (Math.abs(target - rail.scrollLeft) > 0.5) {
      resettingRef.current = true;
      rail.scrollLeft = target;
    }
  }, []);

  // rAF-throttle the scroll handler so the reset + dot tracking stay cheap
  // during a fling.
  const onScroll = () => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      maybeReset();
      sync();
      ticking.current = false;
    });
  };

  // Measure the set/slide strides and park real billboard `toIndex` at centre.
  const measureAndPark = useCallback(
    (toIndex: number) => {
      const rail = railRef.current;
      const s0 = slideRefs.current[0];
      const s1 = slideRefs.current[1];
      if (!rail || !s0 || !s1) return;
      const slideStride =
        s1.getBoundingClientRect().left - s0.getBoundingClientRect().left;
      if (slideStride <= 0) return;
      slideStrideRef.current = slideStride;
      strideRef.current = slideStride * N;
      centerOn(slideRefs.current[toIndex] ?? s0, 'auto');
      originRef.current = rail.scrollLeft - toIndex * slideStride;
    },
    [N, centerOn],
  );

  // Decide whether to loop once mounted (client-only signals: reduced motion and
  // having more than one billboard to loop through).
  useIsoLayoutEffect(() => {
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const enable = !reduce && N > 1;
    loopRef.current = enable;
    setLoop(enable);
    // Nothing to clone/park (reduced motion or a single card) — reveal at once.
    if (!enable) setReady(true);
  }, [N]);

  // Park (before paint, no flash) when looping turns on / N changes, and keep it
  // parked + measured across resizes. Falls back to a plain sync when not
  // looping (reduced motion / single hero).
  useIsoLayoutEffect(() => {
    loopRef.current = loop;
    if (loop) {
      measureAndPark(0);
      // Parked in the middle copy with both edges peeking — safe to show now.
      setReady(true);
    }
    sync();
    measure(); // settle the L/R fades against the parked position
    const onResize = () => {
      if (loopRef.current) measureAndPark(activeRef.current);
      sync();
      measure();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [loop, measureAndPark, sync, measure]);

  const scrollToIndex = useCallback(
    (i: number) => {
      const reduce = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      centerOn(slideRefs.current[i], reduce ? 'auto' : 'smooth');
    },
    [centerOn],
  );

  // Hold/run the indicator fill against tab visibility only. Selecting a project
  // never pauses — it just restarts the fill from the left (via the `active`
  // effect below), so the bar never looks frozen after a tap or click.
  const applyPlayState = useCallback(() => {
    const anim = animRef.current;
    if (!anim) return;
    if (document.hidden) anim.pause();
    else anim.play();
  }, []);

  // Start a fresh fill for the active dot whenever it changes; advancing is
  // driven off the fill's `finish`, so the bar is the countdown. With the loop
  // we step one billboard FORWARD each time (the reset rebalances scrollLeft
  // invisibly, so the last card wraps to the first without a backward jump).
  // Reduced motion shows a static full bar and never auto-advances.
  useEffect(() => {
    const el = progressRef.current;
    if (!el) return;
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reduce || N <= 1) {
      el.style.width = '100%';
      animRef.current = null;
      return;
    }
    const anim = el.animate([{ width: '0%' }, { width: '100%' }], {
      duration: AUTOPLAY_MS,
      easing: 'linear',
      fill: 'forwards',
    });
    animRef.current = anim;
    anim.onfinish = () => {
      const rail = railRef.current;
      const step = slideStrideRef.current;
      if (rail && step > 0) rail.scrollBy({ left: step, behavior: 'smooth' });
    };
    applyPlayState();
    return () => {
      anim.cancel();
      animRef.current = null;
    };
  }, [active, N, applyPlayState]);

  // Pause the loop while the tab is backgrounded so it doesn't run away unseen.
  useEffect(() => {
    document.addEventListener('visibilitychange', applyPlayState);
    return () =>
      document.removeEventListener('visibilitychange', applyPlayState);
  }, [applyPlayState]);

  // Render one rail as `copyCount` copies. Only the real copy is crawlable /
  // focusable and carries the snap refs; the clones are decorative loop padding.
  const renderCopies = (
    children: React.ReactNode[],
    kind: 'billboard' | 'tile',
  ) =>
    Array.from({ length: copyCount }).map((_, c) => {
      const isClone = c !== realCopy;
      return (
        <div
          key={c}
          className="flex shrink-0 gap-4"
          aria-hidden={isClone || undefined}
          inert={isClone || undefined}
        >
          {children.map((child, i) => (
            <div
              key={i}
              ref={
                kind === 'billboard' && c === realCopy
                  ? (node) => {
                      slideRefs.current[i] = node;
                    }
                  : undefined
              }
              className={
                kind === 'billboard'
                  ? 'w-(--col) shrink-0 snap-center'
                  : 'w-[calc((var(--col)-1rem)/2)] shrink-0'
              }
            >
              {child}
            </div>
          ))}
        </div>
      );
    });

  return (
    <div
      aria-roledescription="carousel"
      aria-label="Selected work"
      className={cn(
        'feature-gallery-root transition-opacity duration-300 motion-reduce:transition-none',
        ready ? 'opacity-100' : 'opacity-0',
      )}
    >
      {/* Without JS the loop never parks, so the reveal flag would leave the
          gallery hidden forever — force it visible in that case. */}
      <noscript>
        <style
          dangerouslySetInnerHTML={{
            __html: '.feature-gallery-root{opacity:1 !important}',
          }}
        />
      </noscript>

      {/* One scroller, two stacked rows — they share scrollLeft, so the tile
          rail tracks the billboards with no coupling code. The `--col` var sizes
          both rails so they're the same total width (loop reset realigns both),
          and the side padding centres the active billboard with its neighbours
          peeking — stepping up at 1500px once the card hits its max width. */}
      <div
        ref={setRail}
        onScroll={onScroll}
        style={{ maskImage, WebkitMaskImage: maskImage }}
        className="no-scrollbar mx-auto w-full max-w-[1600px] flex flex-col items-start gap-3 overflow-x-auto overscroll-x-contain py-2 snap-x snap-mandatory sm:gap-5 [--col:86vw] sm:[--col:72vw] lg:[--col:min(64vw,1024px)] px-[calc((min(100vw,1600px)-var(--col))/2)] scroll-px-[calc((min(100vw,1600px)-var(--col))/2)]"
      >
        {/* Top rail — large billboards carry the snap points */}
        <div className="flex w-max gap-4">
          {renderCopies(billboards, 'billboard')}
        </div>

        {/* Bottom rail — smaller tiles dragged along by the shared scroll */}
        {tiles.length > 0 && (
          <div className="flex w-max gap-4">{renderCopies(tiles, 'tile')}</div>
        )}
      </div>

      {/* Centered pagination dots — the active one is a track that fills like a
          progress bar over the autoplay interval (Apple's dots-only gallery). */}
      <Container className="mt-6 flex items-center justify-center gap-2">
        {billboards.map((_, i) => {
          const isActive = i === active;
          return (
            <button
              key={i}
              type="button"
              aria-label={`Go to project ${i + 1}`}
              aria-current={isActive}
              onClick={() => scrollToIndex(i)}
              className={cn(
                'relative h-2 cursor-pointer overflow-hidden rounded-full outline-none transition-[width,background-color] duration-300 ease-out',
                isActive
                  ? 'w-7 bg-black/15'
                  : 'w-2 bg-black/25 hover:bg-black/40',
              )}
            >
              {isActive && (
                <span
                  ref={progressRef}
                  aria-hidden
                  style={{ width: 0 }}
                  className="absolute inset-y-0 left-0 rounded-full bg-black"
                />
              )}
            </button>
          );
        })}
      </Container>
    </div>
  );
};

export default FeatureProjectGallery;
