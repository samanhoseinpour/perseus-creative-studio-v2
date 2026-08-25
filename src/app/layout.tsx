import './globals.css';
import 'lenis/dist/lenis.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import { ThemeProvider, ConsentProvider } from '@/components';
// Direct import (not the barrel): the idle-deferred boundary only holds if the
// barrel never re-pins sonner — same rule as SpotLightLazy/ScrollToTopLazy.
import DeferredToaster from '@/components/DeferredToaster';
// Same rule: a direct import, so the barrel never gets a chance to pull server
// components into this client boundary.
import FaviconTheme from '@/components/FaviconTheme';

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
  // Without this, iOS keeps the page out of the safe areas and every
  // env(safe-area-inset-*) resolves to 0 — the admin bottom bar (and any other
  // home-indicator-adjacent chrome) needs the real values.
  viewportFit: 'cover',
};

// Document-level defaults only. Page-facing SEO (title/description/OG/canonical/
// robots) lives in the `(marketing)` group layout so it never leaks onto the
// `(admin)` section, which sets its own `noindex` metadata.
export const metadata: Metadata = {
  metadataBase: new URL('https://www.perseustudio.com'),
  title: 'Perseus Creative Studio',
  // The SINGLE source of <meta name="apple-mobile-web-app-title">. There used to
  // be a hand-written duplicate in an explicit <head>; it was emitted FIRST, and WebKit
  // honours the first occurrence — which silently overrode the '(admin)' group's
  // 'Perseus Dashboard' override, so the installed dashboard app wore the
  // marketing name. Don't re-add it.
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
      {/* min-h-dvh, not screen (100vh): the utility outranks globals.css's
          base-layer body { min-height: 100dvh }, and 100vh overshoots the iOS
          visual viewport by the URL-bar height — a phantom scroll on every
          page that otherwise fits. */}
      <body
        className={`${interFont.className} relative min-h-dvh overflow-x-hidden antialiased`}
      >
        {/* Pre-paint favicon, and it must stay a blocking inline script — this
            is the one job an effect cannot do. The server-rendered icon0.svg
            answers the OS colour scheme, so a visitor who forced a theme
            AGAINST their OS got the wrong mark until FaviconTheme hydrated: a
            visible ~0.5s flash of the opposite disc. This runs with <head>
            already parsed but before first paint, so the icon is right the
            first time the browser reads it.

            It APPENDS its own link rather than editing Next's. Next's icon link
            is a React-hoisted resource, and mutating it makes React re-create
            its own copy after ours — see the note in FaviconTheme.tsx, which
            adopts this same element by id for every later change.

            'theme' is next-themes' default storageKey; anything other than an
            explicit light/dark means "follow the system", which matchMedia
            answers here so the first frame never needs a second guess. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var l=document.createElement('link');l.id='favicon-theme';l.rel='icon';l.type='image/svg+xml';l.setAttribute('sizes','any');l.href='/favicon-'+t+'.svg';document.head.appendChild(l)}catch(e){}`,
          }}
        />
        {/* ConsentProvider is a lightweight localStorage-backed context. It
            lives here (not in the marketing group) so the global 404's chrome
            can read it and so admin pages share one theme/consent root — the
            analytics *loaders* and cookie banner that actually consume consent
            stay in the (marketing) layout, keeping /admin free of trackers. */}
        <ConsentProvider>
          <ThemeProvider>
            {children}
            {/* Inside ThemeProvider: it reads the resolved theme to point the
                tab icon at the matching mark. Renders nothing. */}
            <FaviconTheme />
            <DeferredToaster />
          </ThemeProvider>
        </ConsentProvider>
      </body>
    </html>
  );
}
