'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LuCheck, LuHistory } from 'react-icons/lu';

import Button from '@/components/Button';
import { RELEASES_SEEN_EVENT, openReleaseHistory } from '@/lib/releaseFields';
import { markReleasesSeen } from '@/app/(admin)/admin/(protected)/_actions/releases';

/**
 * The profile card's two controls: read the history, and clear your place.
 *
 * Marking read stays an explicit button, but it is no longer the ONLY way to
 * clear the marker — reading an update in the history dialog now does it too
 * (ReleaseHistoryDialog.markSeen). The button survives because it is the way
 * to clear the dot WITHOUT reading: "I know what shipped, stop telling me".
 *
 * The distinction the original reasoning protected still holds. Simply landing
 * on /admin/profile — to change a password, say — still marks nothing, so you
 * cannot lose your place by accident. Only an explicit act clears it: this
 * button, or opening an update.
 *
 * It listens for RELEASES_SEEN_EVENT as well as dispatching it, so closing the
 * dialog hides this button in the same frame the pills above it clear. It calls
 * router.refresh() on its own click so the server-rendered card catches up;
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
  // Mirror-during-render (AdminSidebar's shape): a new release resets the
  // local override, or the button would never come back on this page.
  const [lastCount, setLastCount] = useState(unseenCount);
  if (lastCount !== unseenCount) {
    setLastCount(unseenCount);
    setDone(false);
  }
  useEffect(() => {
    // Dispatched by the history dialog when it closes. No router.refresh()
    // here: the dialog's close is not our click, and refreshing the layout
    // from a listener would fire once per mounted island.
    const clear = () => setDone(true);
    window.addEventListener(RELEASES_SEEN_EVENT, clear);
    return () => window.removeEventListener(RELEASES_SEEN_EVENT, clear);
  }, []);
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
