'use client';

import { useEffect, useState } from 'react';
import { Dialog } from 'radix-ui';
import { LuSparkles, LuX } from 'react-icons/lu';

import Button from '@/components/Button';
import { adminLink, glassChip } from '@/components/Admin/Glass';
import GlassDialog from '@/components/Admin/GlassDialog';
import ReleaseList from '@/components/Admin/ReleaseList';
import { scheduleDialogOpen } from '@/components/Admin/promptTiming';
import {
  RELEASES_SEEN_EVENT,
  openReleaseHistory,
  type Release,
} from '@/lib/releaseFields';
import { markReleasesSeen } from '@/app/(admin)/admin/(protected)/_actions/releases';
import { cn } from '@/lib/utils';

/**
 * The one-time "here's what changed" note, mounted in the protected layout
 * beside PasskeyPrompt.
 *
 * NO FLASH, because the server decides. Unlike PasskeyPrompt — which reads
 * localStorage and therefore MUST start closed to avoid a hydration mismatch —
 * the watermark is server state and the layout is already dynamic, so the
 * open/closed decision is settled in the first HTML. This state is per-PERSON,
 * not per-browser: it has to survive a new laptop, which is exactly why it is a
 * column and not localStorage.
 *
 * It still opens on a beat rather than immediately, for the reason
 * PasskeyPrompt gives: "let the dashboard and its shader paint first; a dialog
 * that appears mid hydration reads as a glitch."
 */

export default function ReleaseNotice({ releases }: { releases: Release[] }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!releases.length) return;

    // Retries while something else owns the screen, and gives up after ~1
    // minute — see scheduleDialogOpen. `releases.length` cannot change on its
    // own either, since the only thing that moves it is a dismissal, so the
    // retry is what stops "stand down for one navigation" becoming "stand down
    // for the whole session". The dot still stands if it gives up.
    return scheduleDialogOpen(() => setOpen(true));
  }, [releases.length]);

  /**
   * Every close is a "seen" — "Got it", Escape, the overlay and the ✕ alike. A
   * passkey prompt asks you to DO something, so PasskeyPrompt snoozes on
   * close; a changelog asks you to READ something, and closing it is the
   * completion of the interaction rather than a refusal.
   *
   * The dot lives in a sibling island with no shared client parent, so the
   * sidebar is told through a window event — the ⌘K palette's own bridge. The
   * alternative, revalidating the admin layout, would cost roughly ten Neon
   * round trips to clear one dot.
   */
  function dismiss() {
    setOpen(false);
    if (saving) return;
    setSaving(true);
    window.dispatchEvent(new Event(RELEASES_SEEN_EVENT));
    // Fire-and-forget on purpose: the dialog is already gone, and a failure
    // only means it offers itself again on the next navigation. Nothing to
    // report to someone who has just closed it.
    void markReleasesSeen().finally(() => setSaving(false));
  }

  if (!releases.length) return null;

  const count = releases.reduce((n, r) => n + r.entries.length, 0);

  return (
    <GlassDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
      maxWidth="34rem"
      aria-describedby="release-notice-desc"
      header={
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                glassChip,
              )}
            >
              <LuSparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold tracking-tight text-foreground">
                What’s new
              </Dialog.Title>
              <Dialog.Description
                id="release-notice-desc"
                className="mt-0.5 text-xs text-muted-foreground"
              >
                {count === 1
                  ? 'One update since you were last here.'
                  : `${count} updates since you were last here.`}
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
              aria-label="Dismiss"
              className="!px-2.5"
            >
              {''}
            </Button>
          </Dialog.Close>
        </div>
      }
      footer={
        <div className="flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
          {/* Opens the history in place rather than navigating to a
              fragment — no URL to double (see VersionStamp for the Next
              16.2.10 segment-cache bug that made #whats-new#whats-new). */}
          <button
            type="button"
            onClick={() => {
              dismiss();
              openReleaseHistory();
            }}
            className={cn('text-xs text-muted-foreground', adminLink)}
          >
            See all updates
          </button>
          <Button
            type="button"
            size="small"
            shimmer={false}
            showIcon={false}
            onClick={dismiss}
            className="w-full sm:w-auto"
          >
            Got it
          </Button>
        </div>
      }
    >
      <ReleaseList releases={releases} onNavigate={dismiss} />
    </GlassDialog>
  );
}
