'use client';

import Link from 'next/link';
import { useConsent } from './ConsentProvider';

// Bottom-anchored consent banner. Accept and Decline are visually
// equal-weighted to meet Quebec Law 25's requirement that opt-in and opt-out
// be equally accessible. Sharp edges, no rounded corners, no glass tile —
// matches the project's distinctive-UI rule (CLAUDE.md "Conventions to
// respect").
//
// Paint timing is load-bearing: the banner renders in the 'unknown' state too,
// so it's in the STATIC HTML and paints at first paint. Gated behind
// hydration it painted at ~4.7s on throttled mobile and — as the largest
// element in the phone viewport — became the page's LCP (PSI mobile 77,
// 2026-08-13). Returning visitors never see it: a parser-blocking inline
// script in the (marketing) layout sets `data-consent-resolved` on <html>
// BEFORE this markup is parsed, and the arbitrary variant below display:none's
// it pre-paint. Post-hydration, resolved states unmount it for real.
const ConsentBanner = () => {
  const { consent, grant, deny } = useConsent();

  if (consent !== 'pending' && consent !== 'unknown') return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-100 border-t border-white/10 bg-black text-white [[data-consent-resolved]_&]:hidden"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-10 md:flex-row md:items-center md:justify-between md:gap-10 md:py-6">
        <div className="md:max-w-2xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/60">
            Cookies &amp; tracking
          </p>
          <p className="mt-2 text-sm text-white/85">
            We use Google Analytics, Microsoft Clarity, and the Meta Pixel to
            understand how visitors use the site and to measure our ads.
            Accept to enable them, or continue without. Your choice is
            remembered for this browser.{' '}
            <Link
              href="/privacy-policy"
              className="text-white underline underline-offset-4 hover:opacity-80"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
        <div className="flex flex-row gap-3 md:shrink-0">
          <button
            type="button"
            onClick={deny}
            className="flex-1 cursor-pointer rounded-full border border-white/30 bg-transparent px-6 py-3 text-sm font-medium text-white transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:border-white hover:bg-white/5 active:translate-y-px md:flex-none"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={grant}
            className="flex-1 cursor-pointer rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-white/95 active:translate-y-px md:flex-none"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentBanner;
