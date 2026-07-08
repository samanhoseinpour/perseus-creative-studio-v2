'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { GoogleTagManager } from '@next/third-parties/google';
import { useConsent } from './ConsentProvider';

// Clarity only initializes after consent AND the deferral below, so load its
// bundle lazily too — this keeps the @microsoft/clarity wrapper out of the
// initial, always-loaded layout chunk (it was previously imported statically).
const MicrosoftClarity = dynamic(
  () => import('@/app/(marketing)/metrics/MicrosoftClarity'),
  { ssr: false },
);

// Renders the trackers that set cookies / localStorage and would otherwise
// require consent under Quebec Law 25 + GDPR + ePrivacy. Vercel Analytics
// and Speed Insights are intentionally NOT here — they're cookie-free and
// don't require consent under the standard interpretation of those laws.
//
// GA4 is loaded via GTM (the container carries the G-RF80SNFSQ4 config tag), so
// there's no separate <GoogleAnalytics> here — that duplicated the gtag load.

// Defer non-essential trackers past the LCP/TBT window. They evaluate on the
// first of: idle-after-load, a user interaction, or a safety timeout — the
// timeout guarantees no-interaction / bounce sessions and bots still record.
const useDeferredReady = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    let done = false;

    const trigger = () => {
      if (done) return;
      done = true;
      cleanups.forEach((fn) => fn());
      setReady(true);
    };

    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => {
      window.addEventListener(e, trigger, { passive: true, once: true });
      cleanups.push(() => window.removeEventListener(e, trigger));
    });

    // Safety fallback so analytics always eventually load (data integrity).
    const fallback = window.setTimeout(trigger, 4000);
    cleanups.push(() => window.clearTimeout(fallback));

    const onIdle = () => {
      const ric = window.requestIdleCallback;
      if (typeof ric === 'function') {
        const id = ric(trigger, { timeout: 4000 });
        cleanups.push(() => window.cancelIdleCallback(id));
      } else {
        const id = window.setTimeout(trigger, 2000);
        cleanups.push(() => window.clearTimeout(id));
      }
    };

    if (document.readyState === 'complete') {
      onIdle();
    } else {
      window.addEventListener('load', onIdle, { once: true });
      cleanups.push(() => window.removeEventListener('load', onIdle));
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return ready;
};

const ConsentGatedAnalytics = () => {
  const { consent } = useConsent();
  const ready = useDeferredReady();
  if (consent !== 'granted' || !ready) return null;

  return (
    <>
      <GoogleTagManager gtmId="GTM-TL9S8H5J" />
      <MicrosoftClarity />
    </>
  );
};

export default ConsentGatedAnalytics;
