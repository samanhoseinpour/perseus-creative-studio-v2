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
import { logError } from '@/lib/log';
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
    logError('[push] subscribeDevice failed', error);
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
    logError('[push] unsubscribeDevice failed', error);
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
    logError('[push] unsubscribeAllDevices failed', error);
    return { ok: false, error: 'server' };
  }
}
