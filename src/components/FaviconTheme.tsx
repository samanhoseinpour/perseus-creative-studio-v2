'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';

/**
 * Points the tab icon at the mark that matches OUR theme switch.
 *
 * `src/app/icon0.svg` already adapts on its own, but only to the OS colour
 * scheme — a `@media (prefers-color-scheme)` block inside the SVG, which is the
 * one signal a favicon can read without JavaScript. It cannot see our in-page
 * light/dark toggle, so forcing dark on a light Mac left the tab on the light
 * mark.
 *
 * NEVER MUTATE NEXT'S ICON LINK. That was the first attempt and it failed in a
 * way that looked like the feature simply not working: React 19 hoists <link>
 * into <head> and tracks it as a resource, so changing its href out from under
 * React made it re-create its own link — which then sat AFTER ours, and the
 * browser takes the LAST usable icon declaration. The OS kept working (that is
 * icon0.svg's media query, untouched) while the toggle never did.
 *
 * So this owns a SEPARATE link element that React has never heard of, keeps it
 * last in <head>, and leaves Next's alone. Two SVG icon links is deliberate:
 * ours wins by document order, and if a browser ever preferred the first one it
 * would fall back to the OS-adaptive mark — wrong only for someone whose chosen
 * theme opposes their OS, which is exactly today's behaviour. A benign degrade.
 *
 * The matching pre-paint script in `src/app/layout.tsx` creates this same link
 * before first paint, so the first frame is already right; this takes over for
 * every change afterwards. Both must agree on which art belongs to which theme:
 * the disc always OPPOSES its background, so the light theme gets the BLACK
 * disc and the dark theme the white one.
 *
 * Safari ignores SVG favicons entirely and shows favicon.ico, so none of this
 * reaches it — that file is deliberately left as the static white disc.
 */
const FAVICON = {
  light: '/favicon-light.svg', // black disc, white type — for a light UI
  dark: '/favicon-dark.svg', // white disc, black type — for a dark UI
} as const;

/** Shared with the pre-paint script in layout.tsx — keep the two in step. */
const LINK_ID = 'favicon-theme';

const FaviconTheme = () => {
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    if (resolvedTheme !== 'light' && resolvedTheme !== 'dark') return;
    const href = FAVICON[resolvedTheme];

    // The pre-paint script normally created this already; build it here for the
    // paths that script can't cover (a client navigation into a fresh tree).
    let link = document.getElementById(LINK_ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = LINK_ID;
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      // Matches what Next puts on its own SVG link; without it some browsers
      // rank a raster .ico above a scalable SVG.
      link.setAttribute('sizes', 'any');
    }
    // Compare the attribute, not `link.href` — the property resolves to an
    // absolute URL and would never equal the path we set.
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
    // Last one wins, so re-assert the position rather than assuming it holds:
    // appendChild MOVES a node that is already in the document.
    if (document.head.lastElementChild !== link) document.head.appendChild(link);
  }, [resolvedTheme, pathname]);

  return null;
};

export default FaviconTheme;
