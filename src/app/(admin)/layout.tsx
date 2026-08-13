import type { Metadata } from 'next';

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
    <div className="min-h-svh bg-background text-foreground">{children}</div>
  );
}
