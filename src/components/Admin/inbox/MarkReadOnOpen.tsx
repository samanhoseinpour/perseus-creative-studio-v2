'use client';

import { useEffect, useRef } from 'react';

import { setSubmissionStatus } from '@/app/(admin)/admin/(protected)/_actions/inbox';

/**
 * Flips a `new` submission to `read` when its detail page opens — the standard
 * inbox auto-read. Rendered only for `status === 'new'` rows. The `useRef`
 * guard stops React 19 StrictMode's double-invoked mount effect from firing the
 * action twice. No router.refresh(): the action's layout-scope revalidation
 * already returns the re-rendered badge/list state on its own response.
 */
export default function MarkReadOnOpen({ id }: { id: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void setSubmissionStatus(id, 'read');
  }, [id]);

  return null;
}
