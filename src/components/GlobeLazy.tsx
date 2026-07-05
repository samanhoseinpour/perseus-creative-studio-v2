'use client';

import dynamic from 'next/dynamic';

// Client-side lazy boundary for the decorative cobe globe (ThemedShader
// pattern — ssr:false is the only mode that reliably escapes the shared eager
// chunk group, so cobe/WebGL download only on pages that render a globe).
// Zero visual difference: the canvas is blank until cobe boots (and creation
// is IntersectionObserver-gated inside), and the loading placeholder below
// reserves the exact same box the canvas takes (width 600 capped to 100%,
// square via aspect-ratio), so there's no layout shift while the chunk loads.
const Globe = dynamic(() => import('./Globe'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden
      style={{ width: 600, height: 'auto', maxWidth: '100%', aspectRatio: 1 }}
    />
  ),
});

export default Globe;
