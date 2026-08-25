'use client';

import { useCallback, useEffect, useState } from 'react';
import { Dialog } from 'radix-ui';
import { LuHistory, LuX } from 'react-icons/lu';

import Button from '@/components/Button';
import { glassChip } from '@/components/Admin/Glass';
import GlassDialog from '@/components/Admin/GlassDialog';
import ReleaseList from '@/components/Admin/ReleaseList';
import { RELEASES_OPEN_EVENT, type Release } from '@/lib/releaseFields';
import { getReleaseHistory } from '@/app/(admin)/admin/(protected)/_actions/releaseHistory';

/**
 * The whole changelog, on demand — the destination for the footer stamp and
 * the profile card's button.
 *
 * Mounted ONCE in the protected layout beside ReleaseNotice, and reached by a
 * window event rather than a prop, because its three triggers are sibling
 * islands with no client ancestor (the ⌘K palette's bridge).
 *
 * ── WHY THIS IS A DIALOG AND NOT A PAGE SECTION ─────────────────────────────
 *
 * It is the answer to "the profile page gets enormous". The history only grows
 * — a year at this studio's pace is ~18 releases and 70-odd entries, which is
 * 8,000-11,000px rendered — and an inline list pays that in HEIGHT on the
 * profile page and in PAYLOAD on every render. A `<details>` fixes only the
 * first of those. Here the content is fetched on FIRST OPEN, so the profile
 * card stays a fixed height for ever and the layout's payload stays O(1) no
 * matter how long the changelog gets.
 *
 * It is deliberately NOT a route: /admin has no whats-new page, by decision.
 */
export default function ReleaseHistoryDialog() {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<{
    releases: Release[];
    watermark: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    // Fetched once per page life. The changelog only changes on a deploy, and
    // a deploy is a full reload, so there is nothing to invalidate.
    if (history || loading) return;
    setLoading(true);
    try {
      setHistory(await getReleaseHistory());
    } catch {
      setHistory({ releases: [], watermark: '' });
    } finally {
      setLoading(false);
    }
  }, [history, loading]);

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      void load();
    };
    window.addEventListener(RELEASES_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(RELEASES_OPEN_EVENT, onOpen);
  }, [load]);

  const count =
    history?.releases.reduce((n, r) => n + r.entries.length, 0) ?? 0;

  return (
    <GlassDialog
      open={open}
      onOpenChange={setOpen}
      maxWidth="34rem"
      aria-describedby="release-history-desc"
      header={
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${glassChip}`}
            >
              <LuHistory className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
                What’s new
              </Dialog.Title>
              <Dialog.Description
                id="release-history-desc"
                className="mt-0.5 text-xs text-muted-foreground"
              >
                {loading
                  ? 'Loading…'
                  : count === 0
                    ? 'Nothing to show yet.'
                    : `${count} update${count === 1 ? '' : 's'} you can read.`}
              </Dialog.Description>
            </div>
          </div>
          <Dialog.Close asChild>
            <Button
              type="button"
              variant="secondary"
              size="small"
              icon={LuX}
              iconPosition="left"
              aria-label="Close"
              className="!px-2.5"
            >
              {''}
            </Button>
          </Dialog.Close>
        </div>
      }
    >
      {history && history.releases.length > 0 ? (
        // Unread markers, but NO mark-as-read button: clearing your place is
        // something you do deliberately on your profile, not a side effect of
        // glancing at the history from a page footer.
        <ReleaseList
          releases={history.releases}
          newerThan={history.watermark}
          onNavigate={() => setOpen(false)}
        />
      ) : (
        <p className="py-6 text-center text-xs text-muted-foreground">
          {loading ? 'Loading…' : 'Nothing to show yet.'}
        </p>
      )}
    </GlassDialog>
  );
}
