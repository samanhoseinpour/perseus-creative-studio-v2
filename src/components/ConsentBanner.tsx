'use client';

import Link from 'next/link';
import { useConsent } from './ConsentProvider';

// Bottom-anchored consent banner shown only when consent === 'pending'.
// Accept and Decline are visually equal-weighted to meet Quebec Law 25's
// requirement that opt-in and opt-out be equally accessible. Sharp edges,
// no rounded corners, no glass tile — matches the project's distinctive-UI
// rule (CLAUDE.md "Conventions to respect").
const ConsentBanner = () => {
  const { consent, grant, deny } = useConsent();

  if (consent !== 'pending') return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-100 border-t border-white/10 bg-black text-white"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-5 sm:px-10 md:flex-row md:items-center md:justify-between md:gap-10 md:py-6">
        <div className="md:max-w-2xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
            Cookies &amp; analytics
          </p>
          <p className="mt-2 text-sm text-white/85">
            We use Google Analytics, Microsoft Clarity, and Contentsquare to
            understand how visitors use the site. Accept to enable them, or
            continue without — your choice is remembered for this browser.{' '}
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
