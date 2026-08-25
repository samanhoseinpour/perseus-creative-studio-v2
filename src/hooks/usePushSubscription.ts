'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  needsInstallForPush,
  pushSupported,
  urlBase64ToUint8Array,
} from '@/lib/pushFields';
import {
  subscribeDevice,
  unsubscribeAllDevices,
  unsubscribeDevice,
} from '@/app/(admin)/admin/(protected)/_actions/push';

/**
 * The Web Push switch for THIS device — one implementation, two surfaces.
 *
 * Lifted out of NotificationsCard when NotificationsPrompt was added, because
 * the alternative was a second copy of the four platform rules below. Each of
 * them fails SILENTLY in a browser — the switch simply never works, with no
 * error anywhere — so a drifting copy would be undiscoverable except by
 * someone eventually saying "I never get anything".
 *
 * ── THE FOUR RULES ──────────────────────────────────────────────────────────
 *
 *  - **Permission comes from the CLICK, never the effect.** Outside a user
 *    gesture `requestPermission()` is ignored or auto-denied, and Safari
 *    throws. The effect only READS the current state. Firefox 72+ (and Firefox
 *    Android 79+) additionally enforce that `subscribe()` runs in the gesture
 *    handler, and every `await` between the tap and the call risks detaching
 *    it — which is why `registration` is resolved in the effect and already in
 *    hand by the time anyone can click.
 *  - **`applicationServerKey` must be a `Uint8Array`.** Chrome tolerates the
 *    base64url string; Safari and Firefox reject it. Testing on Chrome alone
 *    hides this completely.
 *  - **`userVisibleOnly: true` is mandatory** in Chrome, and enforced by the
 *    always-show-a-notification rule in the service worker.
 *  - **An existing subscription made with a DIFFERENT key must be
 *    unsubscribed first**, or `subscribe()` throws `InvalidStateError`. That is
 *    the VAPID-rotation recovery path and it is very easy to omit.
 *
 * ⚠️ `navigator.serviceWorker.ready` NEVER SETTLES when nothing is registered
 * for the scope — exactly the situation in `npm run dev`, where
 * ServiceWorkerRegister deliberately does nothing. An unguarded await on it
 * hangs the caller for ever with no error. Always go through
 * `getRegistration()` first.
 */
export type PushState =
  | 'checking'
  | 'unsupported'
  | 'needs-install'
  | 'denied'
  | 'off'
  | 'on';

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

export function usePushSubscription({
  vapidPublicKey,
  reconcile = false,
  knownDeviceCount = 0,
}: {
  /**
   * Server-derived, never `NEXT_PUBLIC_*` — an inlined value is frozen at
   * build time, so a key rotation would keep serving the stale one until a
   * redeploy. Null when push is not configured for this environment, which
   * makes every consumer self-suppress.
   */
  vapidPublicKey: string | null;
  /**
   * Re-register a rotated subscription and refresh when the server's device
   * list is visibly stale. TRUE ON THE PROFILE CARD ONLY: the card and the
   * prompt can both be mounted on /admin/profile, and two reconcilers would
   * mean two writes and two refreshes for one device.
   */
  reconcile?: boolean;
  /** The card's server-rendered row count, used only to decide the refresh. */
  knownDeviceCount?: number;
}) {
  const router = useRouter();
  const [state, setState] = useState<PushState>('checking');
  const [busy, setBusy] = useState(false);
  const [thisEndpoint, setThisEndpoint] = useState<string | null>(null);
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
        return setState('off');
      }

      setThisEndpoint(sub.endpoint);
      setState('on');

      if (!reconcile) return;

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
      if (!cancelled && knownDeviceCount === 0) router.refresh();
    })().catch(() => {
      if (!cancelled) setState('unsupported');
    });

    return () => {
      cancelled = true;
    };
  }, [
    vapidPublicKey,
    reconcile,
    knownDeviceCount,
    getRegistration,
    router,
  ]);

  const turnOn = useCallback(async () => {
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
        toast.error(
          'This browser has not finished setting up. Reload and try again.',
        );
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
  }, [vapidPublicKey, registration, router]);

  const turnOffThisDevice = useCallback(async () => {
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
  }, [getRegistration, thisEndpoint, router]);

  const turnOffEverywhere = useCallback(async () => {
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
  }, [getRegistration, router]);

  return { state, busy, turnOn, turnOffThisDevice, turnOffEverywhere };
}
