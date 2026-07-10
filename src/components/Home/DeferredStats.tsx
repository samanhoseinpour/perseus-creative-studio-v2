'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// Stats is the heaviest hydration unit on the home page: 27 city markers
// (pulse + dot + label each), ~26 motion-drawn SVG arcs, five CountUp springs,
// three AnimatePresence blocks and a live clock. `content-visibility: auto`
// only skips its paint — the JS still shipped and hydrated during load. The
// section is decorative proof (numbers + a city list) with no crawlable links,
// so like DeferredSocialProof we keep it out of the server HTML and the
// navigation RSC payload entirely and mount it client-side once the reader
// scrolls within range.
const Stats = dynamic(() => import('@/components/Stats'), { ssr: false });

// Start loading well before the block scrolls into view so it's already painted
// by the time the reader arrives — no pop-in during a normal scroll.
const ROOT_MARGIN = '1200px 0px';

const DeferredStats = () => {
  const sentinel = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    // No IntersectionObserver (ancient browsers / SSR-less edge cases): just
    // render so the section is never lost.
    if (typeof IntersectionObserver === 'undefined') {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: ROOT_MARGIN },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={sentinel}
      // Reserve roughly the section's height until it mounts so the blocks
      // below don't sit too high and then jump as it loads. It mounts 1200px
      // before the viewport reaches it, so any residual delta never lands
      // on-screen (no CLS). Once shown, natural height takes over.
      className={cn(
        show ? 'cv-auto animate-in fade-in-0 duration-700' : undefined,
      )}
      style={show ? undefined : { minHeight: '1400px' }}
    >
      {show && <Stats />}
    </div>
  );
};

export default DeferredStats;
