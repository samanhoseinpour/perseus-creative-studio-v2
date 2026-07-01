import type { Metadata } from 'next';

import {
  Hero,
  FeatureProjects,
  Faqs,
  DeferredSocialProof,
  FromTheBlog,
  HomeWelcome,
  Stats,
  ServicesList,
  GoogleReviews,
} from '@/components';
import { SITE_URL, PERSEUS_LOGO } from '@/constants';

// The site-wide OG image (layout.tsx) is the production photo used as the
// shared social-card fallback for pages without their own. The home page
// overrides it so the Perseus wordmark is what surfaces when the root URL is
// shared. Setting `openGraph` here replaces the layout block, so the title/
// description/url are restated rather than inherited.
export const metadata: Metadata = {
  openGraph: {
    title: 'Build a Brand People Love - Perseus Creative Studio',
    description:
      'Perseus Creative Studio is a trusted marketing agency in Vancouver — experts in branding, video and photography, websites, social media, and digital marketing.',
    url: SITE_URL,
    siteName: 'Perseus Creative Studio',
    locale: 'en_CA',
    type: 'website',
    images: [
      {
        url: `${SITE_URL}${PERSEUS_LOGO}`,
        width: 702,
        height: 240,
        alt: 'Perseus Creative Studio logo',
      },
    ],
  },
};

export default function Home() {
  return (
    <main className="flex flex-col">
      <Hero />
      <HomeWelcome />
      {/* Below-the-fold sections skip their own layout + paint until the reader
          scrolls near them (`content-visibility: auto` via the shared `.cv-auto`
          utility, same as the projects index). On mobile this trims the biggest
          non-JS costs in the load trace — Style & Layout (~2.1s) and Rendering —
          which shortens main-thread tasks (TBT) and Speed Index. Markup is still
          server-rendered, so SEO/hydration are unaffected; every section's
          decorations are contained within their own boxes, so paint containment
          clips nothing. */}
      <div className="cv-auto">
        <Stats />
      </div>
      <div className="cv-auto">
        <ServicesList />
      </div>
      <div className="cv-auto">
        <FeatureProjects />
      </div>
      <DeferredSocialProof />
      <div className="cv-auto">
        <GoogleReviews />
      </div>
      <div className="cv-auto">
        <Faqs />
      </div>
      <div className="cv-auto">
        <FromTheBlog />
      </div>
    </main>
  );
}
