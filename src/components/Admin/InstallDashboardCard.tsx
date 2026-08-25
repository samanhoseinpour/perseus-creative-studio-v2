'use client';

import { useCallback, useEffect, useState } from 'react';
import { LuShare, LuSquarePlus } from 'react-icons/lu';

import Button from '@/components/Button';
import { cn } from '@/lib/utils';

/**
 * "Install the dashboard" — the only place the team is offered the /admin PWA.
 *
 * The dashboard is a SEPARATE installable app from the marketing site: whichever
 * manifest is linked from the page you're standing on is the one that gets
 * installed, and public/dashboard.webmanifest carries its own `id` (/admin),
 * `start_url` (/admin) and icon. So this card only ever appears on admin pages —
 * nothing on the public site advertises the dashboard, which is the point.
 *
 * VISIBILITY IS DRIVEN BY THE EVENT, NOT BY display-mode. That is deliberate and
 * easy to get wrong. The service worker's scope is '/' and the marketing
 * manifest's scope is '/' too, so on Android a member who installed the
 * MARKETING app has /admin captured by that WebAPK — `display-mode: standalone`
 * is already true there even though the dashboard app is not installed. Hiding
 * on standalone would blank this card in exactly the case it is needed. Chrome
 * fires `beforeinstallprompt` per manifest `id`, so the event still fires for
 * the dashboard manifest inside the marketing app, and trusting the event gets
 * the right answer in every case.
 *
 * iOS Safari never fires the event at all, so it gets a written instruction
 * instead — suppressed only by `navigator.standalone`, the one signal iOS gives.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function InstallDashboardCard({
  className,
}: {
  className?: string;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      // Suppress Chrome's own mini-infobar so the offer appears here, in
      // context, rather than as browser chrome over the sign-in form.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    const ua = navigator.userAgent;
    // iPadOS reports as Macintosh; maxTouchPoints is what separates it.
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    // Add to Home Screen lives in Safari's share sheet only — Chrome/Firefox/Edge
    // on iOS cannot install, so pointing them at it would be a dead end.
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    const standalone =
      'standalone' in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIosHint(isIOS && isSafari && !standalone);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      // The event is single-use whatever the answer; a dismissal means Chrome
      // will hand us a fresh one on a later visit if it still wants to offer.
      if (outcome === 'accepted') setInstalled(true);
      setDeferred(null);
    } catch {
      setDeferred(null);
    } finally {
      setBusy(false);
    }
  }, [deferred]);

  if (installed) return null;
  if (!deferred && !iosHint) return null;

  return (
    <div
      className={cn(
        // No dark: variants on purpose. `black`/`white` are the FLIP tokens
        // (--ink/--surface in globals.css), so black/10 is already a dark
        // hairline on light and a light one on dark. A `dark:border-white/10`
        // here would flip it to SURFACE-on-surface and the card would vanish in
        // dark mode — the trap the print sheets document.
        'flex items-center gap-3 rounded-2xl border border-black/10 bg-black/[0.03] p-3',
        className,
      )}
    >
      {/* The real icon, not a glyph — this is exactly the tile that lands on
          their home screen, so showing it is both the clearest label and the
          honest preview. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/dashboard-icon-192.png"
        alt=""
        width={40}
        height={40}
        aria-hidden="true"
        className="size-10 shrink-0 rounded-[0.6rem] shadow-sm shadow-neutral-950/20"
      />

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold leading-tight text-black">
          Install the dashboard
        </p>
        {deferred ? (
          <p className="mt-0.5 text-[0.7rem] leading-snug text-black/60">
            Keep it on your home screen and skip the sign-in page.
          </p>
        ) : (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[0.7rem] leading-snug text-black/60">
            <span>Tap</span>
            <LuShare className="size-3 shrink-0" aria-hidden="true" />
            <span>Share, then</span>
            <LuSquarePlus className="size-3 shrink-0" aria-hidden="true" />
            <span className="font-medium text-black/75">Add to Home Screen</span>
          </p>
        )}
      </div>

      {deferred ? (
        <Button
          type="button"
          size="small"
          variant="secondary"
          showIcon={false}
          onClick={install}
          disabled={busy}
          className="shrink-0"
        >
          {busy ? 'Installing…' : 'Install'}
        </Button>
      ) : null}
    </div>
  );
}
