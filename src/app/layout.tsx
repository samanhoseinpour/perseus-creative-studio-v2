import './globals.css';
import 'lenis/dist/lenis.css';
import Script from 'next/script';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ReactLenis } from '@/utils/lenis';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import { Toaster } from 'sonner';

import {
  Navbar,
  Footer,
  ScrollProgress,
  SpotLight,
  ConsentProvider,
  ConsentBanner,
  ConsentGatedAnalytics,
} from '@/components';
import { SITE_URL } from '@/constants';

const interFont = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Build a Brand People Love - Perseus Creative Studio',
  description:
    'Perseus Creative Studio is a trusted digital marketing agency in Vancouver experts in social media marketing, videography, photography, website design and search engine marketing.',
  keywords: [],

  alternates: {
    canonical: 'https://www.perseustudio.com',
  },

  metadataBase: new URL('https://www.perseustudio.com'),

  openGraph: {
    title: 'Build a Brand People Love - Perseus Creative Studio',
    description:
      'Perseus Creative Studio is a trusted digital marketing agency in Vancouver experts in social media marketing, videography, photography, website design and search engine marketing.',
    url: 'https://www.perseustudio.com',
    siteName: 'Perseus Creative Studio',
    locale: 'en_CA',
    type: 'website',
    images: [
      {
        url: 'https://ik.imagekit.io/perseus/logo-white.png',
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
// it instead of inlining the full publisher block) and WebSite + SearchAction
// (enables the SERP sitelinks search box pointing at /blogs?query=…).
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
        url: 'https://ik.imagekit.io/perseus/logo-black.png',
        width: 600,
        height: 60,
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
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'Perseus Creative Studio',
      inLanguage: 'en-CA',
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: [
        {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/blogs?query={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-CA" className={interFont.variable}>
      <head>
        <meta name="apple-mobile-web-app-title" content="Perseus" />
        <link rel="preconnect" href="https://ik.imagekit.io" crossOrigin="" />
        <link rel="dns-prefetch" href="https://ik.imagekit.io" />
      </head>
      <ConsentProvider>
        <ReactLenis root>
          <ConsentGatedAnalytics />
          <body
            className={`${interFont.className} relative min-h-screen overflow-x-hidden antialiased`}
          >
            <Script
              id="site-ld"
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
            />
            <ScrollProgress />
            <Navbar />
            {children}
            <Footer />
            <SpotLight
              className="blur-xl max-md:hidden"
              size={192}
              springOptions={{
                bounce: 0.3,
                duration: 0.1,
              }}
            />
            <Toaster position="top-right" />
            <ConsentBanner />
          </body>
        </ReactLenis>
        <SpeedInsights />
        <Analytics />
      </ConsentProvider>
    </html>
  );
}
