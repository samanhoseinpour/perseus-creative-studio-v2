'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  LuEllipsisVertical,
  LuMenu,
  LuShare,
  LuSquarePlus,
} from 'react-icons/lu';

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
 * on standalone would blank this card in exactly the case it is needed.
 *
 * ── EVERY PLATFORM GETS A ROUTE, BECAUSE ONLY ONE OF THEM HAS A BUTTON ──────
 *
 * `beforeinstallprompt` is Chromium-only, and it is also the thing that goes
 * missing precisely when someone is stuck. So the card carries a written route
 * for each way a member here actually installs: the iOS share sheet, Chrome and
 * Samsung Internet on Android, Safari's Add to Dock, and — the interesting one —
 * desktop Chrome when the site app is in the way. Rendering NOTHING in those
 * cases (which is what it used to do) reads as "the dashboard just isn't
 * installable".
 *
 * ── THE SCOPE CONFLICT, AND WHY ITS COPY IS NOT A MENU PATH ─────────────────
 *
 * Two manifests on one origin whose scopes NEST are treated by Chrome as
 * conflicting. The marketing app's scope is '/', which contains '/admin', so
 * once "Perseus Creative Studio" is installed Chrome answers every /admin URL
 * with an "Open in app" chip, never fires `beforeinstallprompt`, and — verified
 * on macOS Chrome, 2026-08-26 — REPLACES "Install page as app…" in ⋮ → Cast,
 * Save, and Share with "Create Shortcut…", listing "Open in Perseus Creative
 * Studio" directly above it. So there is no menu path to send anyone down, and
 * BOTH remaining items are traps that look like the answer: "Open in …" hands
 * /admin to the WEBSITE app — a standalone window that genuinely shows the
 * dashboard, which is why it reads as having worked, while wearing the white
 * marketing icon and titling itself "Perseus Creative Studio" — and "Create
 * Shortcut" makes a bookmark. Neither installs anything. No manifest field can
 * exclude a subpath from a scope, and `start_url: "/"` forces the marketing
 * scope to be '/', so this is not something the site can declare its way out
 * of either.
 *
 * THE CARD SAYS ONLY THE ACTION; the two look-alikes are spelled out in the
 * `profile` ⓘ guide. This is a card on a page about your own account, and three
 * lines of browser troubleshooting there is a wall of text most members will
 * never need — the guide is the artifact for "why", exactly as it is
 * everywhere else in the dashboard.
 *
 * The asymmetry IS the way out, and it is what the copy says: '/admin' is inside
 * '/', but '/' is not inside '/admin'. Remove the site app, install the
 * dashboard, put the site app back — in that order both coexist for good.
 *
 * `getInstalledRelatedApps()` is what keeps this honest. The dashboard manifest
 * lists BOTH apps under `related_applications` — itself (the documented
 * self-detection trick) and the marketing manifest — so the card can tell three
 * states apart: already installed (render nothing), the site app is installed
 * and in the way (name it), and neither (hedge). No reciprocal declaration is
 * needed because both are in scope of the requesting page, but each entry does
 * need its resolved `id` as well as its `url`: on desktop the `url` alone
 * matches nothing. Chrome 140+ on desktop, Chrome 80+ on Android, absent
 * everywhere else — hence the hedged copy, which has to stand on its own.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** How a member on this browser installs, when there is no button to press. */
type Guide =
  | 'ios-safari'
  | 'ios-other'
  | 'samsung'
  | 'android'
  | 'desktop-chromium'
  | 'desktop-safari'
  | null;

/** How long to wait for `beforeinstallprompt` before assuming it isn't coming.
 *  Chrome fires it right after the manifest and worker are resolved; a second
 *  and a half is well past that and short enough not to read as a flash. iOS
 *  and Safari never fire it at all, so their guides don't wait. */
const PROMPT_GRACE_MS = 1500;

/** True where the written guide should only appear once the prompt has had its
 *  chance — the browsers that can fire one. */
const WAITS: Guide[] = ['samsung', 'android', 'desktop-chromium'];

export default function InstallDashboardCard({
  className,
}: {
  className?: string;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [guide, setGuide] = useState<Guide>(null);
  /** The marketing app is installed and therefore owns this URL. Only ever set
   *  from the browser's own answer — never guessed, because the fix it asks for
   *  is removing an app. */
  const [siteApp, setSiteApp] = useState(false);
  const [waited, setWaited] = useState(false);
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
    // Every iOS browser is WebKit underneath, but only Safari's share sheet
    // carries Add to Home Screen — so Chrome/Firefox/Edge there are sent to
    // Safari rather than down a menu that has no such item.
    const isSafariUA = /Safari/.test(ua) && !/Chrome|Chromium|Android/.test(ua);
    const iosSafari = isSafariUA && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    const standalone =
      'standalone' in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    let next: Guide = null;
    if (isIOS) {
      // navigator.standalone is the ONE signal iOS gives that it is already a
      // Home Screen app; there is nothing to offer once it is true.
      next = standalone ? null : iosSafari ? 'ios-safari' : 'ios-other';
    } else if (/SamsungBrowser\//.test(ua)) {
      next = 'samsung';
    } else if (/Android/.test(ua) && /Chrome\/|Chromium\//.test(ua)) {
      next = 'android';
    } else if (/Chrome\/|Chromium\/|Edg\//.test(ua)) {
      next = 'desktop-chromium';
    } else if (isSafariUA) {
      next = 'desktop-safari';
    }
    setGuide(next);

    const timer = window.setTimeout(() => setWaited(true), PROMPT_GRACE_MS);

    // Asks the browser whether THIS app is already installed — the manifest
    // names itself under related_applications for exactly this. Absent on
    // Safari and Firefox, hence the optional call and the display-mode
    // fallback below.
    const related = (
      navigator as Navigator & {
        getInstalledRelatedApps?: () => Promise<unknown[]>;
      }
    ).getInstalledRelatedApps;
    let live = true;
    if (related) {
      void related
        .call(navigator)
        .then((apps) => {
          if (!live) return;
          const ids = apps.map((app) =>
            String((app as { id?: string }).id ?? ''),
          );
          if (ids.some((id) => id.endsWith('/admin'))) setInstalled(true);
          // The marketing app's id is the bare origin, so it is the entry that
          // does NOT end in /admin. Matching that way rather than on the full
          // URL keeps this working on a preview deployment.
          else if (ids.some((id) => id && !id.endsWith('/admin')))
            setSiteApp(true);
        })
        .catch(() => {});
    } else if (
      !isIOS &&
      window.matchMedia('(display-mode: standalone)').matches
    ) {
      // No way to ask, so trust the window: on a desktop browser with no
      // related-apps API (Safari's Add to Dock), a standalone window on /admin
      // IS the dashboard app — the Android WebAPK ambiguity above cannot apply.
      setInstalled(true);
    }

    return () => {
      live = false;
      window.clearTimeout(timer);
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

  const showGuide =
    !deferred && guide !== null && (waited || !WAITS.includes(guide));

  if (installed) return null;
  if (!deferred && !showGuide) return null;

  return (
    <div
      className={cn(
        // No dark: variants on purpose. `black`/`white` are the FLIP tokens
        // (--ink/--surface in globals.css), so black/10 is already a dark
        // hairline on light and a light one on dark. A `dark:border-white/10`
        // here would flip it to SURFACE-on-surface and the card would vanish in
        // dark mode — the trap the print sheets document.
        'flex items-start gap-3 rounded-2xl border border-black/10 bg-black/[0.03] p-3',
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
        ) : guide === 'ios-safari' ? (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[0.7rem] leading-snug text-black/60">
            <span>Tap</span>
            <LuShare className="size-3 shrink-0" aria-hidden="true" />
            <span>Share, then</span>
            <LuSquarePlus className="size-3 shrink-0" aria-hidden="true" />
            <span className="font-medium text-black/75">Add to Home Screen</span>
          </p>
        ) : guide === 'ios-other' ? (
          // Add to Home Screen exists only in Safari's share sheet on iOS —
          // Chrome and Firefox there are WebKit in a different wrapper and have
          // no such item, so the useful instruction is which app to open.
          <p className="mt-0.5 text-[0.7rem] leading-snug text-black/60">
            Open this page in{' '}
            <span className="font-medium text-black/75">Safari</span>, then
            Share → Add to Home Screen. Only Safari can add it on iPhone and
            iPad.
          </p>
        ) : guide === 'samsung' ? (
          <p className="mt-0.5 flex items-start gap-1 text-[0.7rem] leading-snug text-black/60">
            <LuMenu className="mt-px size-3 shrink-0" aria-hidden="true" />
            <span>
              Open the menu, then{' '}
              <span className="font-medium text-black/75">Add page to</span> →{' '}
              <span className="font-medium text-black/75">Home screen</span>.
            </span>
          </p>
        ) : guide === 'android' ? (
          <p className="mt-0.5 flex items-start gap-1 text-[0.7rem] leading-snug text-black/60">
            <LuEllipsisVertical
              className="mt-px size-3 shrink-0"
              aria-hidden="true"
            />
            <span>
              Open the menu, then{' '}
              <span className="font-medium text-black/75">Add to Home screen</span>
              .
            </span>
          </p>
        ) : guide === 'desktop-safari' ? (
          <p className="mt-0.5 text-[0.7rem] leading-snug text-black/60">
            In the menu bar, choose{' '}
            <span className="font-medium text-black/75">File</span> →{' '}
            <span className="font-medium text-black/75">Add to Dock</span>.
          </p>
        ) : siteApp ? (
          // The conflict, CONFIRMED by the browser. Deliberately not a menu
          // path: in this state Chrome has already swapped "Install page as
          // app…" for "Create Shortcut…", which makes a bookmark and lands you
          // back where you started.
          <p className="mt-0.5 text-[0.7rem] leading-snug text-black/60">
            The{' '}
            <span className="font-medium text-black/75">
              Perseus Creative Studio
            </span>{' '}
            app already covers this address. Remove it at{' '}
            <span className="font-medium text-black/75">chrome://apps</span>,
            reload, and install here.
          </p>
        ) : (
          // Same conflict, UNCONFIRMED — the browser is too old to answer, or
          // has not answered yet. It reads as a condition rather than a fact,
          // because the remedy is removing an app and nobody should be told to
          // do that on a guess.
          <p className="mt-0.5 text-[0.7rem] leading-snug text-black/60">
            Chrome has not offered it here. If you have the{' '}
            <span className="font-medium text-black/75">
              Perseus Creative Studio
            </span>{' '}
            app, remove it at{' '}
            <span className="font-medium text-black/75">chrome://apps</span> and
            reload.
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
