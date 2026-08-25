'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LuBell, LuBellOff, LuSmartphone } from 'react-icons/lu';

import Button from '@/components/Button';
import { GlassPanel, glassChip } from '@/components/Admin/Glass';
import DeviceIcon from '@/components/Admin/DeviceIcon';
import {
  isStandalone,
  needsInstallForPush,
  pushSupported,
  urlBase64ToUint8Array,
} from '@/lib/pushFields';
import {
  subscribeDevice,
  unsubscribeAllDevices,
  unsubscribeDevice,
} from '@/app/(admin)/admin/(protected)/_actions/push';
import { cn } from '@/lib/utils';

/**
 * "Notifications" — the per-device push switch, third in the run of device
 * lists on /admin/profile (passkeys → notifications → sessions).
 *
 * It borrows InstallDashboardCard's SELF-SUPPRESSION discipline, not its
 * markup: a device list is a GlassPanel section like its neighbours, while the
 * glass-free tile shape belongs to the install offer.
 *
 * ── WHAT MAKES THIS WORK ON EVERY PLATFORM ──────────────────────────────────
 *
 *  - **Permission comes from the CLICK, never the effect.** Outside a user
 *    gesture `requestPermission()` is ignored or auto-denied depending on the
 *    browser, and Safari throws. The effect only READS the current state.
 *  - **`applicationServerKey` must be a Uint8Array.** Chrome tolerates the
 *    base64url string; Safari and Firefox reject it. Testing on Chrome alone
 *    hides this completely.
 *  - **`userVisibleOnly: true` is mandatory** in Chrome and enforced by the
 *    always-show-a-notification rule in the service worker.
 *  - **An existing subscription with a DIFFERENT key must be unsubscribed
 *    first**, or `subscribe()` throws `InvalidStateError`. That is the
 *    VAPID-rotation recovery path and it is very easy to omit.
 *  - **iOS/iPadOS delivers push only inside a Home-Screen-installed app**
 *    (16.4+). In a Safari TAB `PushManager` is simply undefined, so feature
 *    detection already yields the non-nagging default of rendering nothing —
 *    but then an iPhone owner never learns why, so `needsInstallForPush()`
 *    earns them one sentence instead.
 *  - **macOS and Windows need no install.** Safari 16+, Chrome, Edge and
 *    Firefox all subscribe from an ordinary tab, which is why nothing here
 *    gates on `isStandalone()` except the iOS hint.
 *
 * ⚠️ `navigator.serviceWorker.ready` NEVER SETTLES when nothing is registered
 * for the scope — exactly the situation in `npm run dev`, where
 * ServiceWorkerRegister deliberately does nothing. An unguarded await on it
 * hangs this card for ever with no error. Always go through
 * `getRegistration()` first.
 */

/** Whether an existing subscription was made with the key we are using now. */
function usesKey(sub: PushSubscription, publicKey: string): boolean {
  const current = sub.options?.applicationServerKey;
  if (!current) return false;
  const wanted = urlBase64ToUint8Array(publicKey);
  const have = new Uint8Array(current as ArrayBuffer);
  return (
    have.length === wanted.length && have.every((b, i) => b === wanted[i])
  );
}

type DeviceRow = {
  id: string;
  label: string;
  iconKey: string;
  addedLabel: string;
  lastNotifiedLabel: string | null;
};

type State =
  | 'checking'
  | 'unsupported'
  | 'needs-install'
  | 'denied'
  | 'off'
  | 'on';

export default function NotificationsCard({
  vapidPublicKey,
  devices,
}: {
  /**
   * Read server-side and threaded down as a slim prop rather than inlined as
   * NEXT_PUBLIC_*: an inlined value is frozen at build time, so a key rotation
   * would keep serving the stale one until a redeploy. Null when push is not
   * configured for this environment — which makes the whole card vanish.
   */
  vapidPublicKey: string | null;
  devices: DeviceRow[];
}) {
  const router = useRouter();
  const [state, setState] = useState<State>('checking');
  const [busy, setBusy] = useState(false);
  const [thisEndpoint, setThisEndpoint] = useState<string | null>(null);
  // Resolved during the effect, NOT inside the click. Firefox 72+ (and Firefox
  // Android 79+) enforce that subscribe() runs in a user-gesture handler, and
  // every `await` between the tap and the call risks detaching that gesture —
  // so the registration is already in hand by the time anyone can click.
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  /** The active registration, or null when there is none (dev, or a browser
   *  that never registered). Never touches `ready`. */
  const getRegistration = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return null;
    const reg = await navigator.serviceWorker.getRegistration('/');
    return reg?.active ? reg : (reg ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!vapidPublicKey) return setState('unsupported');
      if (!pushSupported()) {
        return setState(needsInstallForPush() ? 'needs-install' : 'unsupported');
      }
      if (Notification.permission === 'denied') return setState('denied');

      const reg = await getRegistration();
      if (cancelled) return;
      // No worker at all (dev, or a first load before registration finishes):
      // offering a button that cannot work is worse than offering nothing.
      if (!reg) return setState('unsupported');
      setRegistration(reg);

      let sub = await reg.pushManager.getSubscription();
      if (cancelled) return;

      // A subscription made with a DIFFERENT applicationServerKey makes
      // subscribe() throw InvalidStateError — the VAPID-rotation recovery
      // path. Clearing it HERE rather than in the click handler keeps the
      // gesture chain short (see `registration` above).
      if (sub && !usesKey(sub, vapidPublicKey)) {
        await sub.unsubscribe().catch(() => {});
        sub = null;
      }
      if (cancelled) return;

      if (!sub) {
        setThisEndpoint(null);
        return setState(Notification.permission === 'granted' ? 'off' : 'off');
      }

      setThisEndpoint(sub.endpoint);
      setState('on');

      // RECONCILE, UNCONDITIONALLY. pushsubscriptionchange is deliberately
      // unhandled in the service worker (see its comment), so this is the only
      // place a rotated subscription gets re-registered.
      //
      // It must NOT be gated on "the server has no devices". THE iOS
      // RE-INSTALL TRAP: deleting and re-adding the Home Screen icon mints a
      // BRAND-NEW subscription while the old row is still on file, so the
      // server has a device — just the wrong one — and a `devices.length === 0`
      // guard would skip the repair. The person then shows as subscribed for
      // ever and receives nothing, with the old endpoint quietly 410-ing.
      // The server cannot compare endpoints for us either, because it
      // deliberately never sends them to the browser.
      //
      // Always upserting is cheap and self-healing: UNIQUE(endpoint) makes it
      // idempotent, and this is one write on a page nobody loads often — not a
      // heartbeat.
      const json = sub.toJSON();
      await subscribeDevice({
        endpoint: sub.endpoint,
        keys: json.keys,
        userAgent: navigator.userAgent,
      }).catch(() => {});
      // Only re-render when the server's list is visibly out of date; a
      // refresh on every visit would be a wasted round trip.
      if (!cancelled && devices.length === 0) router.refresh();
    })().catch(() => {
      if (!cancelled) setState('unsupported');
    });

    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey, devices.length, getRegistration, router]);

  async function turnOn() {
    if (!vapidPublicKey) return;
    setBusy(true);
    try {
      // FROM THE GESTURE. Safari returns a promise here; older Safari used a
      // callback, which is why the promise form is awaited rather than passed
      // a handler.
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off');
        return;
      }

      // Already resolved in the effect, so the only await between the tap and
      // subscribe() is the permission prompt itself.
      const reg = registration;
      if (!reg) {
        toast.error('This browser has not finished setting up. Reload and try again.');
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Uint8Array, NOT the base64url string — Safari and Firefox reject the
        // string form that Chrome accepts.
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const json = sub.toJSON();
      const result = await subscribeDevice({
        endpoint: sub.endpoint,
        keys: json.keys,
        userAgent: navigator.userAgent,
      });
      if (!result.ok) {
        await sub.unsubscribe().catch(() => {});
        toast.error('Could not turn notifications on. Try again.');
        return;
      }
      setThisEndpoint(sub.endpoint);
      setState('on');
      toast.success('Notifications are on for this device.');
      router.refresh();
    } catch {
      toast.error('This browser refused to enable notifications.');
    } finally {
      setBusy(false);
    }
  }

  async function turnOffThisDevice() {
    setBusy(true);
    try {
      const reg = await getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      const endpoint = sub?.endpoint ?? thisEndpoint;
      // Browser side first, then the row. If the row write fails the endpoint
      // is already dead, so the next send prunes it on a 410 — do not reorder.
      if (sub) await sub.unsubscribe().catch(() => {});
      if (endpoint) await unsubscribeDevice({ endpoint });
      setThisEndpoint(null);
      setState('off');
      toast.success('Notifications are off for this device.');
      router.refresh();
    } catch {
      toast.error('Could not turn notifications off.');
    } finally {
      setBusy(false);
    }
  }

  async function turnOffEverywhere() {
    setBusy(true);
    try {
      const reg = await getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) await sub.unsubscribe().catch(() => {});
      await unsubscribeAllDevices();
      setThisEndpoint(null);
      setState('off');
      toast.success('Notifications are off on every device.');
      router.refresh();
    } catch {
      toast.error('Could not turn notifications off.');
    } finally {
      setBusy(false);
    }
  }

  // Self-suppress rather than render a control that cannot work. `checking` is
  // included so the card never flashes an "off" state it is about to correct.
  if (state === 'checking' || state === 'unsupported') return null;

  return (
    <GlassPanel as="section" className="p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
        <p className="text-xs text-muted-foreground">
          Get a nudge on this device when work is due, when something is
          assigned to you, or when a message comes in.
        </p>
      </div>

      {state === 'needs-install' && (
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-full',
              glassChip,
            )}
            aria-hidden="true"
          >
            <LuSmartphone className="size-4" />
          </span>
          <p className="text-xs leading-relaxed text-muted-foreground">
            On iPhone and iPad, notifications work once the dashboard is on your
            Home Screen. Add it from the Share menu, open it from there, and
            this will offer to turn them on.
          </p>
        </div>
      )}

      {state === 'denied' && (
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-full',
              glassChip,
            )}
            aria-hidden="true"
          >
            <LuBellOff className="size-4" />
          </span>
          {/* No button: once denied, requestPermission() resolves 'denied'
              immediately with no prompt, so a button here would do nothing at
              all — worse than none. Deliberately generic rather than
              per-browser instructions: a UA sniff would be wrong often enough
              to send someone into a settings screen that does not exist, and
              "a wrong claim is worse than none". */}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Notifications are blocked for this site in your browser. Turn them
            back on in your browser’s settings for this site, then reload this
            page.
          </p>
        </div>
      )}

      {state === 'off' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Off on this device.
            {isStandalone() ? ' You are in the installed app.' : ''}
          </p>
          <Button
            type="button"
            size="small"
            shimmer={false}
            icon={LuBell}
            iconPosition="left"
            disabled={busy}
            onClick={turnOn}
          >
            {busy ? 'Waiting…' : 'Turn on'}
          </Button>
        </div>
      )}

      {state === 'on' && (
        <>
          <ul className="flex flex-col gap-3">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center gap-3">
                <span
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-full',
                    glassChip,
                  )}
                  aria-hidden="true"
                >
                  <DeviceIcon iconKey={d.iconKey} className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {d.label}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    On since {d.addedLabel}
                    {d.lastNotifiedLabel
                      ? ` · last notified ${d.lastNotifiedLabel}`
                      : ''}
                  </p>
                </div>
              </li>
            ))}
            {devices.length === 0 && (
              <li className="text-xs text-muted-foreground">
                On for this device.
              </li>
            )}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="small"
              icon={LuBellOff}
              iconPosition="left"
              disabled={busy}
              onClick={turnOffThisDevice}
            >
              Turn off here
            </Button>
            {devices.length > 1 && (
              <Button
                type="button"
                variant="secondary"
                size="small"
                showIcon={false}
                disabled={busy}
                onClick={turnOffEverywhere}
              >
                Turn off everywhere
              </Button>
            )}
          </div>
        </>
      )}
    </GlassPanel>
  );
}
