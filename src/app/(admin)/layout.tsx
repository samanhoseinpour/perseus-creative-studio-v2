import type { Metadata, Viewport } from 'next';

// Direct import, not the barrel: the `(admin)` tree is deliberately barrel-free.
// `@/components` eagerly pulls the services/blogs registries and imageBlur's
// base64 map, and `@/components/Pwa` would drag OfflineBanner → contactOutbox →
// IndexedDB into the admin client chunk. Same rule as DeferredToaster in the
// root layout.
import ServiceWorkerRegister from '@/components/Pwa/ServiceWorkerRegister';

// The admin section is deliberately walled off from the public site: no
// crawling, no marketing chrome (Navbar/Footer/Lenis/analytics all live in the
// `(marketing)` group). Real session enforcement is added in the nested
// `admin/layout.tsx`; this group layout only sets the bare shell + noindex.
export const metadata: Metadata = {
  // A template so each admin page sets its own short title and gets the suffix;
  // `default` is the fallback for any admin page that declares no title.
  title: {
    default: 'Admin · Perseus Creative Studio',
    template: '%s · Perseus Creative Studio',
  },
  robots: { index: false, follow: false },

  // --- The dashboard is its own installable app -----------------------------
  //
  // A browser installs whichever manifest is linked from the page you're
  // standing on, and two manifests with different `id`s are two different apps
  // that coexist on one device. So installing from /admin/login yields
  // "Perseus Dashboard" (start_url /admin), while installing from the marketing
  // site still yields the untouched "Perseus Creative Studio" app (start_url /).
  // That's the whole mechanism — no cookie, no launch router, and the session
  // cookie is httpOnly so a client-side branch was never possible anyway.
  //
  // This key overrides the root `src/app/manifest.json` file convention:
  // mergeStaticMetadata applies a manifest file only for the segment that owns
  // it (the root), and runs after this segment's own metadata keys merge.
  //
  // The manifest lives at the ROOT, not under /admin, because the manifest link
  // is fetched without credentials in production — a /admin/* URL would be
  // bounced to the login page by src/proxy.ts and the install would fail.
  manifest: '/dashboard.webmanifest',

  // Replaced wholesale by Next (not merged), so `capable`/`statusBarStyle` have
  // to be restated alongside the title.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Perseus Dashboard',
  },

  // CAREFUL: declaring `icons` at all OVERRIDES the file-convention icons rather
  // than adding to them — Next only injects src/app/icon*.* when `metadata.icons`
  // is absent. So `icon0.svg` has to be re-declared here by hand or admin tabs
  // silently fall back to favicon.ico. (favicon.ico is handled separately and
  // survives regardless.) Keep this list in step with src/app/.
  //
  // `apple` is the load-bearing one: iOS reads <link rel="apple-touch-icon"> for
  // a Home Screen web app, NOT the manifest icons, so without it the installed
  // dashboard would wear the marketing icon.
  icons: {
    icon: [{ url: '/icon0.svg', type: 'image/svg+xml', sizes: 'any' }],
    apple: { url: '/dashboard-apple-icon.png', sizes: '180x180' },
  },
};

// Only `themeColor` — the root layout's width/initialScale/viewportFit survive,
// because Next's mergeViewport clones the parent and overwrites only the keys a
// child actually declares. That matters: AdminBottomBar positions off
// env(safe-area-inset-bottom), which needs the root's viewportFit: 'cover'.
//
// The root declares a flat #ffffff, which in a standalone window puts a white
// status-bar plate above a dark dashboard. The manifest's theme_color can't be
// media-queried; this meta tag can.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fcfcfc' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0c0d' },
  ],
};

export default function AdminGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // svh, not screen (100vh): on iOS Safari 100vh includes the collapsed URL
    // bar, so the box outgrows the visual viewport and every short admin page
    // gets a phantom scroll. Matches the protected layout's min-h-svh.
    //
    // `print:bg-transparent` because the print surfaces below (payslip, client
    // report) inject `* { print-color-adjust: exact }` to keep their charts, and
    // that `*` reaches up here too — an unguarded `bg-background` would print
    // this full-height slab as a near-black plate behind the whole sheet on a
    // dark-theme admin. See src/lib/printSheet.ts.
    <div className="min-h-svh bg-background text-foreground print:bg-transparent">
      {children}
      {/* Registered here as well as in the (marketing) layout so a member who
          has never browsed the public site in this browser profile still has a
          service worker — Chrome wants one before it will offer to install.
          This does NOT relax the /admin caching rule: the bypass is enforced
          inside sw.js's fetch handler, not by registration scope. */}
      <ServiceWorkerRegister />
    </div>
  );
}
