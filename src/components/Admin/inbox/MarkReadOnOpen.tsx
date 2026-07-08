'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { setSubmissionStatus } from '@/app/(admin)/admin/(protected)/_actions/inbox';

/**
 * Flips a `new` submission to `read` when its detail page opens — the standard
 * inbox auto-read. Rendered only for `status === 'new'` rows. The `useRef`
 * guard stops React 19 StrictMode's double-invoked mount effect from firing the
 * action twice; `router.refresh()` re-reads so the badge/list reflect the read.
 */
export default function MarkReadOnOpen({ id }: { id: string }) {
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    setSubmissionStatus(id, 'read').then((res) => {
      if (res.ok) router.refresh();
    });
  }, [id, router]);

  return null;
}
