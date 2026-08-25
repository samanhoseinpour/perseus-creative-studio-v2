'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LuCheck } from 'react-icons/lu';

import Button from '@/components/Button';
import { RELEASES_SEEN_EVENT } from '@/lib/releaseFields';
import { markReleasesSeen } from '@/app/(admin)/admin/(protected)/_actions/releases';

/**
 * "Mark as read" for the What's-new card.
 *
 * An explicit BUTTON rather than auto-marking on render, and the difference
 * matters: someone opening /admin/profile to change their password would
 * otherwise silently lose the marker showing where they left off. Clearing an
 * unread state should be something you did, not something that happened to you.
 *
 * It calls `router.refresh()` on success, which is the documented pattern for
 * THIS page — profile/page.tsx's own comment says its child forms refresh so
 * the server component re-reads. That is not the "no router.refresh after a
 * revalidating action" rule: markReleasesSeen deliberately does NOT
 * revalidate, so without this the server-rendered "Unread" markers above would
 * still be sitting there after the button vanished, and the card would
 * contradict itself.
 *
 * The sidebar is told separately through a window event, because it is a
 * sibling island in the layout with no shared client parent (the ⌘K palette's
 * bridge).
 */
export default function MarkUpdatesRead({ count }: { count: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (count === 0) return null;

  // Not `return null` on success: a button that vanishes under the pointer
  // drops focus to <body> and announces nothing to a screen reader. Swap it
  // for a live-region confirmation instead, so the interaction has an audible
  // and visible end.
  if (done) {
    return (
      <p role="status" className="text-xs text-muted-foreground">
        All caught up
      </p>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="small"
      icon={LuCheck}
      iconPosition="left"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await markReleasesSeen();
          if (!result.ok) return;
          setDone(true);
          window.dispatchEvent(new Event(RELEASES_SEEN_EVENT));
          router.refresh();
        })
      }
    >
      {pending ? 'Marking…' : 'Mark as read'}
    </Button>
  );
}
