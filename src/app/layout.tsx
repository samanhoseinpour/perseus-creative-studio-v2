import Script from 'next/script';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ReactLenis } from './utils/lenis';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google';
import MicrosoftClarity from './metrics/MicrosoftClarity';
import { Toaster } from 'sonner';

import {
  Navbar,
  Footer,
  ScrollProgress,
  BgGradient,
  SpotLight,
} from './components';

const interFont = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: '500',
});

export const metadata: Metadata = {
  title: 'Build a Brand People Love - Perseus Creative Studio',
  description:
    'Perseus Creative Studio is a trusted digital marketing agency in Vancouver experts in social media marketing, videography, photography, website design and SEO.',
  keywords: ['Vancouver Digital Marketing Agency'],

  alternates: {
    canonical: 'https://www.perseustudio.com',
  },

  metadataBase: new URL('https://www.perseustudio.com'),

  openGraph: {
    title: 'Build a Brand People Love - Perseus Creative Studio',
    description:
      'Perseus Creative Studio is a trusted digital marketing agency in Vancouver experts in social media marketing, videography, photography, website design and SEO.',
    url: 'https://www.perseustudio.com',
    siteName: 'Perseus Creative Studio',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://ik.imagekit.io/perseus/logo-black.png',
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio Home Page Preview',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-title" content="Perseus" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/lenis@1.3.4/dist/lenis.css"
        />
        <Script src="https://t.contentsquare.net/uxa/5ce4dd2874cf2.js" />
      </head>
      <ReactLenis root>
        <GoogleAnalytics gaId="G-RF80SNFSQ4" />
        <GoogleTagManager gtmId="GTM-TL9S8H5J" />
        <MicrosoftClarity />
        <body className={`${interFont.className} antialiased`}>
          <ScrollProgress />
          <BgGradient />
          <Navbar />
          {children}
          <Footer />
          <SpotLight
            className="bg-zinc-700 blur-2xl"
            size={64}
            springOptions={{
              bounce: 0.3,
              duration: 0.1,
            }}
          />
          <Toaster position="top-right" />
        </body>
      </ReactLenis>
      <SpeedInsights />
      <Analytics />
    </html>
  );
}
