'use client';

import { useEffect, useRef } from 'react';

import { setSubmissionStatus } from '@/app/(admin)/admin/(protected)/_actions/inbox';
import { safeAction } from './safeAction';

/**
 * Flips a `new` submission to `read` when its detail page opens — the standard
 * inbox auto-read. Rendered only for `status === 'new'` rows. The `useRef`
 * guard stops React 19 StrictMode's double-invoked mount effect from firing the
 * action twice. No router.refresh(): the action's layout-scope revalidation
 * already returns the re-rendered badge/list state on its own response.
 *
 * Routed through `safeAction` purely to absorb a transport-level rejection —
 * offline, or a deploy that changed this action's id while the tab sat open.
 * The result is deliberately ignored: a row that stays `new` is the same thing
 * the reader is already looking at, and it flips on the next open. What is NOT
 * acceptable is an unhandled rejection, which would surface as a console error
 * on a page that rendered perfectly well.
 */
export default function MarkReadOnOpen({ id }: { id: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void safeAction(setSubmissionStatus(id, 'read'));
  }, [id]);

  return null;
}
