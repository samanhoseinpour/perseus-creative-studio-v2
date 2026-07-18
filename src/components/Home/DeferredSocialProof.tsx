'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PartnerRails } from '@/components/Partners';

// The two below-the-fold social-proof sections — the client testimonials and
// the client-logo marquee — are the heaviest part of the home page's payload:
// the marquee alone renders ~76 logo cells (each logo three times: a hidden
// reduced-motion grid plus the doubled seamless rail). Neither carries a
// crawlable link or JSON-LD, so we keep them OUT of the server-rendered HTML
// and the navigation RSC payload entirely and mount them on the client only
// once the reader scrolls within range. That trims the per-navigation Flight
// payload home visitors pull on every client-side route change.
//
// (GoogleReviews stays server-rendered on purpose — it's an async Server
// Component that fetches review data, so it can't move behind `ssr: false`.)
const HomeTestimonials = dynamic(
  () => import('@/components/Home/HomeTestimonials'),
  { ssr: false },
);
const Partners = dynamic(() => import('@/components/Partners'), { ssr: false });

// Start loading well before the block scrolls into view so it's already painted
// by the time the reader arrives — no pop-in during a normal scroll.
const ROOT_MARGIN = '1200px 0px';

const DeferredSocialProof = ({
  partnerLogos,
}: {
  /** getPartnerLogos('home') rails, fetched by the server page — the marquee
   *  itself stays client-only, but its data rides the page's Flight payload. */
  partnerLogos: PartnerRails;
}) => {
  const sentinel = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    // No IntersectionObserver (ancient browsers / SSR-less edge cases): just
    // render so the sections are never lost.
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
      // Reserve roughly the block's height until it mounts so the sections below
      // (Google reviews, FAQ, blog) don't sit too high and then jump as it
      // loads. Once shown, natural height takes over (no residual gap).
      className={cn(show && 'animate-in fade-in-0 duration-700')}
      style={show ? undefined : { minHeight: '1100px' }}
    >
      {show && (
        <>
          <HomeTestimonials />
          {(partnerLogos.rail1.length > 0 ||
            partnerLogos.rail2.length > 0) && (
            <Partners logos={partnerLogos} />
          )}
        </>
      )}
    </div>
  );
};

export default DeferredSocialProof;
