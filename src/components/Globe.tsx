'use client';

import { useRef, useEffect } from 'react';
import createGlobe from 'cobe';

// The globe is a decorative WebGL canvas. Left unmanaged, cobe spins its own
// requestAnimationFrame loop forever — even off-screen, in background tabs, and
// during the initial load when the main thread is busiest. On a CPU-throttled
// phone that lands straight in Total Blocking Time and Speed Index. So we:
//   • only spin up the WebGL context once the canvas is near the viewport
//     (keeps it out of the initial-load main-thread window — on mobile it sits
//     below the welcome copy),
//   • tear it down when it scrolls away or the tab is hidden, and
//   • render a smaller, lower-DPR, fewer-sample globe on small screens.
// prefers-reduced-motion keeps the globe but stops the rotation.
const Globe = ({ className }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const isSmall = window.matchMedia('(max-width: 768px)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2);
    const size = isSmall ? 360 : 600;
    const mapSamples = isSmall ? 8000 : 16000;

    let globe: { destroy: () => void } | null = null;
    let phi = 0;
    let inView = false;

    const create = () => {
      if (globe || !canvasRef.current) return;
      globe = createGlobe(canvasRef.current, {
        devicePixelRatio: dpr,
        width: size * dpr,
        height: size * dpr,
        phi: 0,
        theta: 0,
        dark: 1,
        diffuse: 1.2,
        mapSamples,
        mapBrightness: 6,
        baseColor: [0.3, 0.3, 0.3],
        markerColor: [0.1, 0.8, 1],
        glowColor: [1, 1, 1],
        markers: [
          // longitude latitude
          { location: [37.7595, -122.4367], size: 0.03 },
          { location: [40.7128, -74.006], size: 0.1 },
        ],
        onRender: (state) => {
          // Called on every animation frame.
          state.phi = phi;
          if (!reduceMotion) phi += 0.01;
        },
      });
    };

    const destroy = () => {
      globe?.destroy();
      globe = null;
    };

    // Run the WebGL loop only while the canvas is on-screen AND the tab is
    // visible; otherwise tear it down so it costs nothing.
    const sync = () => {
      if (inView && !document.hidden) create();
      else destroy();
    };

    const io = new IntersectionObserver(
      (entries) => {
        inView = entries.some((e) => e.isIntersecting);
        sync();
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(canvas);

    document.addEventListener('visibilitychange', sync);

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
      destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      // Height is driven by aspect-ratio, NOT a fixed value: once max-width caps
      // the width on a phone, a fixed `height` would leave a tall box with dead
      // space above the globe. `height: auto` + aspect-ratio keeps it square at
      // any width (600² on desktop, shrinking to the column width on mobile).
      style={{ width: 600, height: 'auto', maxWidth: '100%', aspectRatio: 1 }}
      className={className}
    />
  );
};

export default Globe;
