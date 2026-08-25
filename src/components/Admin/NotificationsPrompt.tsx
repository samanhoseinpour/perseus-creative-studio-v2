'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { LuBell, LuX } from 'react-icons/lu';

import Button from '@/components/Button';
import { glassChip } from '@/components/Admin/Glass';
import GlassDialog from '@/components/Admin/GlassDialog';
import { scheduleDialogOpen } from '@/components/Admin/promptTiming';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { cn } from '@/lib/utils';

/**
 * Post-login nudge to turn notifications on for THIS device, shaped after
 * PasskeyPrompt and switching them on from the modal itself rather than
 * sending anyone to /admin/profile — the profile card had been shipped for a
 * day with nobody finding it, and `push_subscriptions` was empty studio-wide.
 *
 * The subscribe machinery is NOT reimplemented here: `usePushSubscription` is
 * the one door, shared with the card, and it carries the four platform rules
 * that each fail silently in a browser. Note this instance does NOT reconcile
 * — the card owns that, because both are mounted on /admin/profile and two
 * reconcilers would mean two writes for one device.
 *
 * IT ONLY EVER OPENS ON `off`. Every other state is a dead end and a modal you
 * cannot act on is worse than none (PasskeyPrompt's "no WebAuthn, no point"):
 *   - `denied` — the browser will not prompt again, so the button would lie;
 *     the card's own copy explains the settings route.
 *   - `needs-install` — an iPhone in a Safari tab, where nothing can be done
 *     until the dashboard is on the Home Screen. The 1.6.0 release note says
 *     so in words, which is the right place for something you cannot fix here.
 *   - `unsupported` — includes `npm run dev`, where VAPID is Production-only
 *     and no worker is registered.
 */

// Namespaced by user id, per PasskeyPrompt's comment: a single shared key lets
// the first admin to dismiss suppress it for every OTHER admin who later signs
// in on that browser.
const snoozeKeyFor = (userId: string) =>
  `perseus.admin.notifyPrompt.snoozedUntil:${userId}`;
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
/** Stand aside for a day when a "What's new" note is queued for this login. */
const YIELD_MS = 24 * 60 * 60 * 1000;

export default function NotificationsPrompt({
  vapidPublicKey,
  userId,
  noticePending,
}: {
  vapidPublicKey: string | null;
  userId: string;
  /**
   * A release note is going to interrupt this login. Two modals in one session
   * is a pile-up, and the note now TELLS people to turn notifications on — so
   * this yields for a day and offers the one-tap version next time, by which
   * point the note has been read and dismissed.
   */
  noticePending: boolean;
}) {
  const pathname = usePathname();
  // Starts closed so SSR and the first client render match (no hydration
  // mismatch); the effect opens it only after mount, where localStorage exists.
  const [open, setOpen] = useState(false);
  const { state, busy, turnOn } = usePushSubscription({ vapidPublicKey });

  // The card is right there on the profile page — a modal over it would be
  // asking twice, and it is also what keeps the two hook instances that DO
  // coexist there from both wanting the screen.
  const onProfile = pathname === '/admin/profile';

  useEffect(() => {
    if (onProfile) return;
    if (state !== 'off') return;

    if (noticePending) {
      // Written rather than merely skipped, so the prompt cannot reappear the
      // moment the note is dismissed later in the same session.
      window.localStorage.setItem(
        snoozeKeyFor(userId),
        String(Date.now() + YIELD_MS),
      );
      return;
    }

    const raw = window.localStorage.getItem(snoozeKeyFor(userId));
    const until = raw ? Number(raw) : 0;
    if (Number.isFinite(until) && Date.now() <= until) return;

    return scheduleDialogOpen(() => setOpen(true));
  }, [onProfile, state, noticePending, userId]);

  function snooze() {
    window.localStorage.setItem(
      snoozeKeyFor(userId),
      String(Date.now() + SNOOZE_MS),
    );
    setOpen(false);
  }

  async function enable() {
    // Called straight from the click with no await before it: turnOn()'s first
    // await IS the permission prompt, which is what keeps the user gesture
    // attached for Firefox's sake.
    await turnOn();
    // Programmatic close, so onOpenChange does not fire and no snooze is
    // written — on success the `on` state suppresses it, and on a refusal the
    // `denied` state does.
    setOpen(false);
  }

  if (onProfile || state !== 'off') return null;

  return (
    <GlassDialog
      open={open}
      onOpenChange={(next) => {
        // Esc / overlay / the close button all route here — treat as "later".
        if (!next) snooze();
      }}
      maxWidth="26rem"
      aria-describedby="notify-prompt-desc"
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
            glassChip,
          )}
        >
          <LuBell className="h-5 w-5" aria-hidden="true" />
        </span>
        <Dialog.Close asChild>
          <Button
            type="button"
            variant="secondary"
            size="small"
            icon={LuX}
            iconPosition="left"
            aria-label="Dismiss"
            disabled={busy}
            className="!px-2.5"
          >
            {''}
          </Button>
        </Dialog.Close>
      </div>

      <Dialog.Title className="mt-4 text-base font-semibold tracking-tight text-foreground">
        Turn on notifications
      </Dialog.Title>
      <Dialog.Description
        id="notify-prompt-desc"
        className="mt-1 text-sm text-muted-foreground"
      >
        Get a nudge when work is due, when something is assigned to you, or when
        a message comes in. This turns them on for the device you are using —
        your other devices stay as they are.
      </Dialog.Description>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          type="button"
          size="small"
          shimmer={false}
          icon={LuBell}
          iconPosition="left"
          onClick={enable}
          disabled={busy}
          className="w-full sm:w-auto"
        >
          {busy ? 'Waiting…' : 'Turn them on'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="small"
          showIcon={false}
          onClick={snooze}
          disabled={busy}
          className="w-full sm:w-auto"
        >
          Maybe later
        </Button>
      </div>
    </GlassDialog>
  );
}
