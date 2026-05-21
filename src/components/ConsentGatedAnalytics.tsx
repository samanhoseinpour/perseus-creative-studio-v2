'use client';

import Script from 'next/script';
import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google';
import MicrosoftClarity from '@/app/metrics/MicrosoftClarity';
import { useConsent } from './ConsentProvider';

// Renders the trackers that set cookies / localStorage and would otherwise
// require consent under Quebec Law 25 + GDPR + ePrivacy. Vercel Analytics
// and Speed Insights are intentionally NOT here — they're cookie-free and
// don't require consent under the standard interpretation of those laws.
const ConsentGatedAnalytics = () => {
  const { consent } = useConsent();
  if (consent !== 'granted') return null;

  return (
    <>
      <GoogleAnalytics gaId="G-RF80SNFSQ4" />
      <GoogleTagManager gtmId="GTM-TL9S8H5J" />
      <MicrosoftClarity />
      <Script
        src="https://t.contentsquare.net/uxa/5ce4dd2874cf2.js"
        strategy="lazyOnload"
      />
    </>
  );
};

export default ConsentGatedAnalytics;
