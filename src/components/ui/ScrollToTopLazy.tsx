'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// The real control pulls motion (useScroll/AnimatePresence), lenis and an icon
// — none of which should ride the eager chunk of every route for a button
// that's invisible until 20% scroll. This shim watches scroll with a plain
// listener and only mounts (= downloads) the control once the reader first
// crosses the threshold; from then on the control's own useScroll drives
// show/hide in both directions.
const ScrollToTop = dynamic(() => import('@/components/ui/ScrollToTop'), {
  ssr: false,
});

// Mirrors VISIBILITY_THRESHOLD in ScrollToTop.tsx.
const VISIBILITY_THRESHOLD = 0.2;

const ScrollToTopLazy = () => {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (armed) return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max > VISIBILITY_THRESHOLD) {
        setArmed(true);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    // Covers browser-restored scroll positions on reload/back-nav.
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [armed]);

  return armed ? <ScrollToTop /> : null;
};

export default ScrollToTopLazy;
