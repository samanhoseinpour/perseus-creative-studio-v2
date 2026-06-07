'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker — browser-only and production-only. In dev the SW
 * would cache Turbopack's HMR assets and fight fast refresh, so it's disabled
 * there. Renders nothing.
 */
const ServiceWorkerRegister = () => {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      process.env.NODE_ENV !== 'production' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // Registration failing must never break the page — offline support is
        // a progressive enhancement.
      });
    };

    // Wait for load so the SW install doesn't contend with first paint.
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
};

export default ServiceWorkerRegister;
