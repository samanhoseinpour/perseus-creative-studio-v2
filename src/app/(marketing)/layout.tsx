import type { Metadata } from 'next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

import {
  Navbar,
  Footer,
  ScrollProgress,
  RouteProgress,
  ScrollToTop,
  ConsentBanner,
  ConsentGatedAnalytics,
  ServiceWorkerRegister,
  OfflineBanner,
  SmartLenis,
} from '@/components';
// Direct import (not the barrel): the lazy boundary only holds if the barrel
// never re-pins the underlying SpotLight — same rule as GlobeLazy.
import SpotLightLazy from '@/components/ui/SpotLightLazy';
import { SITE_URL, FULL_INDEX_ROBOTS, OG_IMAGE } from '@/constants';

export const metadata: Metadata = {
  title: 'Build a Brand People Love - Perseus Creative Studio',
  description:
    'Perseus Creative Studio is a trusted marketing agency in Vancouver — experts in branding, video and photography, websites, social media, and digital marketing.',
  keywords: [],

  alternates: {
    canonical: 'https://www.perseustudio.com',
  },

  robots: FULL_INDEX_ROBOTS,

  openGraph: {
    title: 'Build a Brand People Love - Perseus Creative Studio',
    description:
      'Perseus Creative Studio is a trusted marketing agency in Vancouver — experts in branding, video and photography, websites, social media, and digital marketing.',
    url: 'https://www.perseustudio.com',
    siteName: 'Perseus Creative Studio',
    locale: 'en_CA',
    type: 'website',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio Logo',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    site: '@Perseustudio1',
    creator: '@Perseustudio1',
  },
};

// Site-wide JSON-LD: Organization (with @id so per-page nodes can reference
// it instead of inlining the full publisher block) and WebSite.
const siteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Perseus Creative Studio',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/images/perseus-logo-black.avif`,
        width: 702,
        height: 240,
      },
      sameAs: [
        'https://www.instagram.com/perseustudio/',
        'https://www.facebook.com/p/Perseus-Creative-Studio-61559184362913/',
        'https://x.com/Perseustudio1',
        'https://linkedin.com/company/perseus-creative-studio',
        'https://www.youtube.com/@PerseusCreativeStudio',
        'https://www.tiktok.com/@perseustudio',
        'https://medium.com/@teamperseustudio',
      ],
      email: 'info@perseustudio.com',
      telephone: '+1-778-887-8363',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'North Vancouver',
        addressRegion: 'BC',
        addressCountry: 'CA',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: 'info@perseustudio.com',
        telephone: '+1-778-887-8363',
        areaServed: 'CA',
        availableLanguage: 'English',
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'Perseus Creative Studio',
      inLanguage: 'en-CA',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SmartLenis>
        <ConsentGatedAnalytics />
        <script
          id="site-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <RouteProgress />
        <ScrollProgress />
        <Navbar />
        {children}
        <Footer />
        <SpotLightLazy
          className="blur-xl max-md:hidden"
          size={192}
          springOptions={{
            bounce: 0.3,
            duration: 0.1,
          }}
        />
        <ConsentBanner />
        <OfflineBanner />
        <ScrollToTop />
        <ServiceWorkerRegister />
      </SmartLenis>
      <SpeedInsights />
      <Analytics />
    </>
  );
}
