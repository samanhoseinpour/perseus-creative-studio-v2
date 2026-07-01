'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import type { PartnersProps } from './Partners';

// The client-logo marquee is the single heaviest block on the site. Its default
// variant renders the *full* client set (~74 logos) as a static grid plus two
// doubled seamless rails — ~220 <img> nodes whose srcsets alone dominate a
// page's RSC payload (they made /about ~506KB). The coins carry no crawlable
// internal links (each links out external + nofollow, or not at all), so we
// keep the whole marquee OUT of the server HTML and mount it on the client only
// once the reader scrolls within range. That trims both the initial document
// and the per-navigation Flight payload on any page that shows it. Mirrors the
// home page's DeferredSocialProof; GoogleReviews stays server-rendered (it's an
// async Server Component and can't move behind ssr:false).
const Partners = dynamic(() => import('./Partners'), { ssr: false });

// Start loading well before it scrolls into view so it's already painted by the
// time the reader arrives — no pop-in during a normal scroll.
const ROOT_MARGIN = '1200px 0px';

const DeferredPartners = (props: PartnersProps) => {
  const sentinel = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    // No IntersectionObserver (ancient browsers): render immediately so the
    // marquee is never lost.
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
      // Reserve roughly the marquee's height until it mounts so the sections
      // after it (reviews, CTA) don't sit too high and then jump as it loads.
      // Natural height takes over once shown (no residual gap).
      className={cn(show && 'animate-in fade-in-0 duration-700')}
      style={show ? undefined : { minHeight: '540px' }}
    >
      {show && <Partners {...props} />}
    </div>
  );
};

export default DeferredPartners;
