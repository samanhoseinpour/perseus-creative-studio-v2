'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';
import { LuFingerprint, LuKeyRound, LuX } from 'react-icons/lu';

import Button from '@/components/Button';
import { glassSurface, glassChip, GlassRim } from '@/components/Admin/Glass';
import { cn } from '@/lib/utils';
import { authClient } from '@/lib/auth-client';

// Post-login nudge to enrol a passkey, shown once when the signed-in admin has
// none (which — since a passkey user always has ≥1 — means they just signed in
// with a password). Dismissing snoozes it for 30 days; enrolling suppresses it
// permanently (the server recomputes `hasPasskey` on refresh).
//
// The snooze key is namespaced by user id. A single shared key would let the
// first admin to dismiss the prompt suppress it for every *other* admin who
// later signs in on that browser — which is exactly what happened to
// info@perseustudio.com after the key was set on this machine.
const snoozeKeyFor = (userId: string) =>
  `perseus.admin.passkeyPrompt.snoozedUntil:${userId}`;
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

export default function PasskeyPrompt({
  hasPasskey,
  userId,
}: {
  hasPasskey: boolean;
  userId: string;
}) {
  const router = useRouter();
  // Starts closed so SSR and the first client render match (no hydration
  // mismatch); the effect opens it only after mount, where localStorage exists.
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (hasPasskey) return;
    // No WebAuthn, no point: enrolling would fail and the modal is a dead end.
    // Deliberately not `isUserVerifyingPlatformAuthenticatorAvailable()` — that
    // would also hide the prompt from admins carrying a roaming security key.
    if (!('PublicKeyCredential' in window)) return;

    const raw = window.localStorage.getItem(snoozeKeyFor(userId));
    const until = raw ? Number(raw) : 0;
    if (Number.isFinite(until) && Date.now() <= until) return;

    // Let the dashboard and its shader paint first; a dialog that appears mid
    // hydration reads as a glitch.
    const timer = setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(timer);
  }, [hasPasskey, userId]);

  function snooze() {
    window.localStorage.setItem(
      snoozeKeyFor(userId),
      String(Date.now() + SNOOZE_MS),
    );
    setOpen(false);
  }

  async function enroll() {
    setAdding(true);
    try {
      const res = await authClient.passkey.addPasskey();
      if (res?.error) {
        toast.error(res.error.message ?? 'Could not add passkey.');
        return;
      }
      toast.success('Passkey added — use it to sign in next time.');
      setOpen(false); // programmatic close: no snooze needed, refresh suppresses it
      router.refresh();
    } catch {
      toast.error('Passkey setup was cancelled.');
    } finally {
      setAdding(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        // Esc / overlay / the close button all route here — treat as "later".
        if (!next) snooze();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        {/* Flex-centering scroll container: the outer div scrolls, the inner
            `min-h-full items-center` centers on tall viewports and lets a taller
            modal scroll. Centering via flexbox (not a `-translate` on Content)
            keeps `transform` free for the open animation, so the panel can't
            land off-centre or push the page. */}
        <div
          data-lenis-prevent
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain p-4"
        >
          <div className="flex min-h-full items-center justify-center">
            <Dialog.Content
              aria-describedby="passkey-prompt-desc"
              className={cn(
                'relative w-[min(92vw,26rem)] p-6',
                glassSurface,
                'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
              )}
            >
              <GlassRim />

              <div className="flex items-start justify-between gap-4">
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                    glassChip,
                  )}
                >
                  <LuFingerprint className="h-5 w-5" aria-hidden="true" />
                </span>
                <Dialog.Close asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    icon={LuX}
                    iconPosition="left"
                    aria-label="Dismiss"
                    disabled={adding}
                    className="!px-2.5"
                  >
                    {''}
                  </Button>
                </Dialog.Close>
              </div>

              <Dialog.Title className="mt-4 text-base font-semibold tracking-tight text-foreground">
                Set up a passkey
              </Dialog.Title>
              <Dialog.Description
                id="passkey-prompt-desc"
                className="mt-1 text-sm text-muted-foreground"
              >
                Sign in with Face ID, Touch ID, or a security key — faster than a
                password and resistant to phishing.
              </Dialog.Description>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
                <Button
                  type="button"
                  size="small"
                  shimmer={false}
                  icon={LuKeyRound}
                  iconPosition="left"
                  onClick={enroll}
                  disabled={adding}
                  className="w-full sm:w-auto"
                >
                  {adding ? 'Waiting…' : 'Add a passkey'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  showIcon={false}
                  onClick={snooze}
                  disabled={adding}
                  className="w-full sm:w-auto"
                >
                  Maybe later
                </Button>
              </div>
            </Dialog.Content>
          </div>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
