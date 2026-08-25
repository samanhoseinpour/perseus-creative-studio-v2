'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LuCheck, LuHistory } from 'react-icons/lu';

import Button from '@/components/Button';
import { RELEASES_SEEN_EVENT, openReleaseHistory } from '@/lib/releaseFields';
import { markReleasesSeen } from '@/app/(admin)/admin/(protected)/_actions/releases';

/**
 * The profile card's two controls: read the history, and clear your place.
 *
 * Marking read stays an EXPLICIT button rather than something that happens
 * because you opened your profile — someone here to change their password
 * should not silently lose the marker showing where they left off. It calls
 * router.refresh() so the server-rendered "unread" pill above clears with it;
 * that is this page's documented pattern (its own child forms do the same),
 * and it is not the "no refresh after a revalidating action" rule, because
 * markReleasesSeen deliberately does not revalidate.
 */
export default function OpenReleaseHistory({
  unseenCount,
}: {
  unseenCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const showMark = unseenCount > 0 && !done;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {showMark && (
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
      )}
      {done && (
        <p role="status" className="text-xs text-muted-foreground">
          All caught up
        </p>
      )}
      <Button
        type="button"
        size="small"
        shimmer={false}
        icon={LuHistory}
        iconPosition="left"
        onClick={() => openReleaseHistory()}
      >
        Read all updates
      </Button>
    </div>
  );
}
