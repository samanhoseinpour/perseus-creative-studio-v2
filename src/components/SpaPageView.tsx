'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { sendGTMEvent } from '@next/third-parties/google';

// App Router navigates client-side, so GTM's own "All Pages" Page View trigger
// fires exactly once — when the container boots. Every in-session route change
// after that is invisible to any tag bound to it (the Meta Pixel's ViewContent,
// for one). This pushes a `spa_page_view` event those tags can trigger on.
//
// Pathname only, deliberately. Facet-filtered project views and contact
// prefills push query-string-only URL changes (see CLAUDE.md "Parameterised
// views navigate via NavButton"), so a GTM History Change trigger — the
// no-code alternative — would count every filter toggle as another view of a
// page the visitor never left. `usePathname` also avoids the `useSearchParams`
// CSR bailout that would cost us server-rendered HTML on every route.
//
// Consent-safe by the same logic as the contact form's `contact_submit`: with
// consent denied GTM never boots and this pushes into an inert plain
// window.dataLayer array — no network, nothing leaves the page.
const SpaPageView = () => {
  const pathname = usePathname();
  const mounted = useRef(false);

  useEffect(() => {
    // First run is the initial load, which GTM's own Page View already covers.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    sendGTMEvent({ event: 'spa_page_view', page_path: pathname });
  }, [pathname]);

  return null;
};

export default SpaPageView;
