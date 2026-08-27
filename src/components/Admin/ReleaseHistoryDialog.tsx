'use client';

import { useCallback, useEffect, useState } from 'react';
import { Dialog } from 'radix-ui';
import { LuArrowLeft, LuHistory, LuX } from 'react-icons/lu';

import Button from '@/components/Button';
import { adminLink, glassChip } from '@/components/Admin/Glass';
import GlassDialog from '@/components/Admin/GlassDialog';
import ReleaseList from '@/components/Admin/ReleaseList';
import {
  RELEASES_OPEN_EVENT,
  RELEASES_SEEN_EVENT,
  type Release,
  type ReleasesOpenDetail,
} from '@/lib/releaseFields';
import { getReleaseHistory } from '@/app/(admin)/admin/(protected)/_actions/releaseHistory';
import { markReleasesSeen } from '@/app/(admin)/admin/(protected)/_actions/releases';
import { cn } from '@/lib/utils';

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
 *
 * IT CAN OPEN ON ONE RELEASE. The profile card's recent rows ask for a version
 * and the dialog then shows that release alone, with an "All updates" control
 * back to the full list. Filtered in the CLIENT, after the same argument-free
 * fetch — the action still re-derives the audience from the session and takes
 * no parameter, so asking for a version can never be a way to ask for someone
 * else's changelog, or for an entry outside your own areas.
 */
export default function ReleaseHistoryDialog() {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<{
    releases: Release[];
    watermark: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  /** The one release to show, or null for the whole history. */
  const [focus, setFocus] = useState<string | null>(null);

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

  /**
   * OPENING THE HISTORY IS READING IT, so closing it clears the marker.
   *
   * This used to be deliberate the other way round: the dialog carried unread
   * pills but never cleared them, on the reasoning that "clearing your place
   * is something you do deliberately on your profile". That reasoning was
   * about landing on /admin/profile to change a password and losing your
   * place by accident — a real hazard, and still guarded, because the profile
   * page itself still marks nothing. Opening THIS is not an accident: it takes
   * a click on an update, or on "What's new". Leaving the dot lit after
   * somebody has read the note is the thing that reads as broken.
   *
   * ReleaseNotice.dismiss()'s shape, deliberately: fire-and-forget, event
   * first. `markReleasesSeen` is monotonic and argument-free, so a double call
   * from a quick close-reopen is a no-op, and there is nothing to await before
   * letting the dialog shut.
   *
   * `history.watermark` is NOT touched — it is fetched once per page life and
   * feeds the "Unread" pills inside this dialog, which must stay put while
   * somebody is reading. Clearing them under the cursor would be the worse bug.
   */
  const markSeen = useCallback(() => {
    window.dispatchEvent(new Event(RELEASES_SEEN_EVENT));
    void markReleasesSeen();
  }, []);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail =
        event instanceof CustomEvent
          ? (event.detail as ReleasesOpenDetail | undefined)
          : undefined;
      setFocus(detail?.version ?? null);
      setOpen(true);
      void load();
    };
    window.addEventListener(RELEASES_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(RELEASES_OPEN_EVENT, onOpen);
  }, [load]);

  // Everything readable, or just the release that was asked for. An unknown
  // version yields NOTHING rather than silently falling back to the whole
  // history — a row that opened the wrong release would be worse than one that
  // says there is nothing here, and it can only happen if a version was
  // retired, which the append-only rule forbids.
  const shown = history
    ? focus
      ? history.releases.filter((r) => r.version === focus)
      : history.releases
    : [];
  const count = shown.reduce((n, r) => n + r.entries.length, 0);

  return (
    <GlassDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Cleared on close, so the next plain "What's new" is never still
        // holding the last row that was clicked.
        if (!next) {
          setFocus(null);
          markSeen();
        }
      }}
      maxWidth="48rem"
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
                {focus ? `What’s new in ${focus}` : 'What’s new'}
              </Dialog.Title>
              <Dialog.Description
                id="release-history-desc"
                className="mt-0.5 text-xs text-muted-foreground"
              >
                {loading
                  ? 'Loading…'
                  : count === 0
                    ? 'Nothing to show yet.'
                    : focus
                      ? `${count} change${count === 1 ? '' : 's'} in this release.`
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
      {focus && history ? (
        <button
          type="button"
          onClick={() => setFocus(null)}
          className={cn(
            'mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground',
            adminLink,
          )}
        >
          <LuArrowLeft className="size-3" aria-hidden="true" />
          All updates
        </button>
      ) : null}

      {shown.length > 0 ? (
          // Unread markers, but no mark-as-read BUTTON — because closing
          // this dialog already does it (see markSeen). The pills are a
          // reading aid while you are here, not a control.
        <ReleaseList
          releases={shown}
          newerThan={history?.watermark}
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
