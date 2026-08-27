'use server';

/**
 * Turning notifications on and off, per device.
 *
 * SECURITY: every write is scoped to the CALLER's own row. `subscribeDevice`
 * takes the browser's subscription but never a user id — it can only ever
 * register the caller — and `unsubscribeDevice` matches on `(userId, endpoint)`
 * so one member cannot turn off another's device by guessing a string. The
 * protected layout's guard does not wrap server actions, so each resolves
 * getAccessProfile() itself.
 *
 * The endpoint is caller-supplied input that the server LATER FETCHES, which
 * makes it SSRF-shaped; pushSchema.ts refuses anything that is not plausibly a
 * push service before it can be stored.
 *
 * ACTIVITY: a coarse, payload-free row per toggle — never the endpoint, never
 * the keys, never a count of the person's other devices. /admin/logs is a
 * wider audience than the person whose phone it is.
 */
import { revalidatePath } from 'next/cache';

import { getAccessProfile } from '@/lib/adminAccess';
import { logActivity } from '@/lib/activityLog';
import { reportError } from '@/lib/monitoringRecord';
import { deviceLabel } from '@/lib/deviceLabel';
import {
  pushSubscribeSchema,
  pushUnsubscribeSchema,
} from '@/lib/pushSchema';
import {
  pushConfigured,
  removeAllDevices,
  removeDevice,
  saveDevice,
  sendToUser,
} from '@/lib/push';

export type PushResult = { ok: true } | { ok: false; error: string };

export async function subscribeDevice(input: unknown): Promise<PushResult> {
  // Gate OUTSIDE the try: getAccessProfile() signals "signed out" by calling
  // redirect(), which works by THROWING NEXT_REDIRECT.
  const profile = await getAccessProfile();

  try {
    if (!pushConfigured()) return { ok: false, error: 'unavailable' };
    const parsed = pushSubscribeSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: 'validation' };

    const { endpoint, keys, userAgent } = parsed.data;
    await saveDevice(profile.session.user.id, { endpoint, keys }, userAgent ?? null);

    logActivity(profile, {
      area: 'profile',
      entity: 'push-device',
      entityId: null,
      entityName: deviceLabel(userAgent ?? null).label,
      action: 'create',
      summary: `Turned notifications on for ${deviceLabel(userAgent ?? null).label}`,
    });
    revalidatePath('/admin/profile');
    return { ok: true };
  } catch (error) {
    reportError('[push] subscribeDevice failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function unsubscribeDevice(input: unknown): Promise<PushResult> {
  const profile = await getAccessProfile();

  try {
    const parsed = pushUnsubscribeSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: 'validation' };

    await removeDevice(profile.session.user.id, parsed.data.endpoint);
    logActivity(profile, {
      area: 'profile',
      entity: 'push-device',
      entityId: null,
      entityName: 'device',
      action: 'delete',
      summary: 'Turned notifications off for a device',
    });
    revalidatePath('/admin/profile');
    return { ok: true };
  } catch (error) {
    reportError('[push] unsubscribeDevice failed', error);
    return { ok: false, error: 'server' };
  }
}

/**
 * "Send a test notification" — the diagnostic behind the button on
 * /admin/profile.
 *
 * It exists because everything below this line fails SILENTLY, and the layers
 * fail differently. A push can be delivered, decrypted, handed to the service
 * worker and accepted by the browser, and still never appear: macOS will draw
 * an installed web app's Dock badge — which our worker sets AFTER
 * showNotification resolves — while refusing to display the notification
 * itself, because the app shim has its own entry in System Settings separate
 * from the browser's. From the member's side that is indistinguishable from
 * "the dashboard never sent anything".
 *
 * A full round trip through the real door settles it in one tap: if the badge
 * moves and nothing appears, delivery works and the device is hiding it.
 *
 * SECURITY: takes no arguments and no recipient — like every other action in
 * this file it can only ever reach the CALLER's own devices, so it can't be
 * turned into a way to buzz somebody else's phone.
 */
export async function sendTestNotification(): Promise<PushResult> {
  const profile = await getAccessProfile();

  try {
    if (!pushConfigured()) return { ok: false, error: 'unavailable' };
    const sent = await sendToUser(profile.session.user.id, { kind: 'test' });
    // No devices is not a server failure — it is the answer. The card offers
    // this button only once a device is registered, so reaching zero here
    // means the row was pruned as dead (404/410) since the page rendered.
    if (sent === 0) return { ok: false, error: 'no-devices' };

    // No activity row: sending yourself a test is not an auditable act, and
    // /admin/logs is a wider audience than the person holding the phone (the
    // same reasoning that keeps device details out of the toggle rows above).
    return { ok: true };
  } catch (error) {
    reportError('[push] sendTestNotification failed', error);
    return { ok: false, error: 'server' };
  }
}

export async function unsubscribeAllDevices(): Promise<PushResult> {
  const profile = await getAccessProfile();

  try {
    const n = await removeAllDevices(profile.session.user.id);
    logActivity(profile, {
      area: 'profile',
      entity: 'push-device',
      entityId: null,
      entityName: 'every device',
      action: 'delete',
      // A count of the caller's OWN devices, told back to the caller's own
      // audit row — no other person's data is implied by it.
      summary: `Turned notifications off everywhere (${n} device${n === 1 ? '' : 's'})`,
    });
    revalidatePath('/admin/profile');
    return { ok: true };
  } catch (error) {
    reportError('[push] unsubscribeAllDevices failed', error);
    return { ok: false, error: 'server' };
  }
}
