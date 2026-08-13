'use client';

import dynamic from 'next/dynamic';
import { useIdleReady } from '@/hooks/useIdleReady';

// sonner's Toaster used to mount eagerly in the root layout, putting ~10KB gz
// in the shared chunk of every route for a widget that only matters after an
// interaction. This shim mounts it at post-load idle instead.
//
// Ordering safety: sonner does not replay toast() calls made before the
// Toaster mounts, but every caller is interaction-driven (admin forms,
// ContactHub submit) except OfflineBanner's flush-success toast — and that one
// fires only after a full server-action round trip on the rare visit with a
// queued outbox record, comfortably after the idle gate resolves (load+idle,
// 2.5s cap).
const Toaster = dynamic(() => import('sonner').then((m) => m.Toaster), {
  ssr: false,
});

const DeferredToaster = () => {
  const ready = useIdleReady();
  return ready ? <Toaster position="top-right" /> : null;
};

export default DeferredToaster;
