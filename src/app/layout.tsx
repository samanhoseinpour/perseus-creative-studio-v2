import './globals.css';
import 'lenis/dist/lenis.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import { ThemeProvider, ConsentProvider } from '@/components';
// Direct import (not the barrel): the idle-deferred boundary only holds if the
// barrel never re-pins sonner — same rule as SpotLightLazy/ScrollToTopLazy.
import DeferredToaster from '@/components/DeferredToaster';

const interFont = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  // Only the weights the UI actually uses (font-normal/medium/semibold/bold).
  // 800/900 had zero usages and each weight is its own render-blocking woff2 —
  // re-add a weight here only when a class that needs it lands.
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

// Declare the viewport explicitly rather than leaning on Next's implicit
// default. With streaming metadata, crawlers that don't run JS (and aren't on
// Next's known-bots list) can otherwise see a <head> without it — which is
// what Semrush flagged as "no viewport tag".
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

// Document-level defaults only. Page-facing SEO (title/description/OG/canonical/
// robots) lives in the `(marketing)` group layout so it never leaks onto the
// `(admin)` section, which sets its own `noindex` metadata.
export const metadata: Metadata = {
  metadataBase: new URL('https://www.perseustudio.com'),
  title: 'Perseus Creative Studio',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Perseus',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-CA" className={interFont.variable} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content="Perseus" />
      </head>
      {/* min-h-dvh, not screen (100vh): the utility outranks globals.css's
          base-layer body { min-height: 100dvh }, and 100vh overshoots the iOS
          visual viewport by the URL-bar height — a phantom scroll on every
          page that otherwise fits. */}
      <body
        className={`${interFont.className} relative min-h-dvh overflow-x-hidden antialiased`}
      >
        {/* ConsentProvider is a lightweight localStorage-backed context. It
            lives here (not in the marketing group) so the global 404's chrome
            can read it and so admin pages share one theme/consent root — the
            analytics *loaders* and cookie banner that actually consume consent
            stay in the (marketing) layout, keeping /admin free of trackers. */}
        <ConsentProvider>
          <ThemeProvider>
            {children}
            <DeferredToaster />
          </ThemeProvider>
        </ConsentProvider>
      </body>
    </html>
  );
}
