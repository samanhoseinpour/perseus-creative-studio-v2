import 'server-only';

import webpush, { WebPushError } from 'web-push';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/db';
import { pushSubscriptions, type PushDevice } from '@/db/schema';
import { logError, log } from '@/lib/log';
import {
  PUSH_DELIVERY,
  isDeadSubscription,
  isPlausiblePushEndpoint,
  renderNotice,
  type PushNotice,
} from '@/lib/pushFields';

/**
 * THE push door — the only module in this codebase that imports `web-push`,
 * and the only one that may decide what a delivery failure means. Modelled on
 * mail.ts, which owns Resend the same way.
 *
 * Callers hand it a PushNotice and get back a count. They never see a
 * WebPushError, never see an endpoint, and cannot compose a title or a body:
 * `sendToUser` has no such parameter, so "no free text on a lock screen" is a
 * type error rather than a rule someone has to remember (see pushFields.ts).
 *
 * ⚠️ NEVER call `webpush.setVapidDetails()`. It writes to a MODULE SINGLETON,
 * and Fluid Compute reuses function instances across concurrent requests, so
 * that state leaks between them — the exact hazard mail.ts documents when it
 * builds a fresh Resend client per call, and log.ts when it refuses
 * module-level state. The details are passed per `sendNotification` call
 * instead, which costs nothing.
 */

/**
 * Required by RFC 8292 so a push service can contact the sender about a
 * misbehaving application. A CONSTANT, not an env var — it never varies per
 * environment, and a third variable is a third chance at a mismatch across
 * three Vercel environments. Same reasoning as NOTIFY_FROM in mail.ts.
 */
const VAPID_SUBJECT = 'mailto:info@perseustudio.com';

/**
 * How many devices one person may register. A scripted loop could otherwise
 * grow this table without bound; the same discipline as sw.js's cache limits.
 * Oldest is evicted first.
 */
export const PUSH_DEVICE_LIMIT = 10;

/**
 * Whether push is configured at all. Everything below degrades to a no-op when
 * it is not, and NotificationsCard renders nothing — so an environment without
 * keys (Preview, local dev) is structurally inert rather than broken.
 */
export function pushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}

/** The browser needs this to subscribe. Public by protocol — it is handed to
 *  the push service — but still read server-side and passed as a prop, never
 *  inlined as NEXT_PUBLIC_*: inlining freezes it at build time, so a rotation
 *  would keep serving the stale key until a redeploy. */
export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

function vapidDetails() {
  return {
    subject: VAPID_SUBJECT,
    publicKey: process.env.VAPID_PUBLIC_KEY as string,
    privateKey: process.env.VAPID_PRIVATE_KEY as string,
  };
}

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/**
 * Register (or move) a device. The upsert is on ENDPOINT, so re-subscribing
 * the same browser under a different account transfers ownership rather than
 * leaving the previous member's row pointed at that handset — see the table's
 * comment in schema.ts.
 */
export async function saveDevice(
  userId: string,
  input: PushSubscriptionInput,
  userAgent: string | null,
): Promise<void> {
  await db
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: userAgent?.slice(0, 512) ?? null,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: userAgent?.slice(0, 512) ?? null,
      },
    });

  // Cap AFTER the upsert, so a re-subscribe can never evict itself.
  const rows = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .orderBy(desc(pushSubscriptions.createdAt));
  if (rows.length > PUSH_DEVICE_LIMIT) {
    const excess = rows.slice(PUSH_DEVICE_LIMIT).map((r) => r.id);
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.id, excess));
  }
}

/** Turn this device off. Scoped by user id as well as endpoint so one member
 *  can never unsubscribe another's device by guessing a string. */
export async function removeDevice(
  userId: string,
  endpoint: string,
): Promise<void> {
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint),
      ),
    );
}

/** Turn every device off for this person. */
export async function removeAllDevices(userId: string): Promise<number> {
  const gone = await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .returning({ id: pushSubscriptions.id });
  return gone.length;
}

/**
 * Devices for the profile page. Projects NO endpoint and NO keys — the
 * listActiveSharesForMonth rule ("deliberately does not select the token"): an
 * endpoint is a device address and a capability-shaped string, so it has no
 * business in an RSC payload beside a person's name.
 */
export async function listDevicesForUser(userId: string): Promise<
  Pick<PushDevice, 'id' | 'userAgent' | 'createdAt' | 'lastNotifiedAt'>[]
> {
  return db
    .select({
      id: pushSubscriptions.id,
      userAgent: pushSubscriptions.userAgent,
      createdAt: pushSubscriptions.createdAt,
      lastNotifiedAt: pushSubscriptions.lastNotifiedAt,
    })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .orderBy(desc(pushSubscriptions.createdAt));
}

/**
 * The dead-subscription contract, in exactly one place.
 *
 * 404/410 → the push service has told us authoritatively that this endpoint is
 * gone. Delete the row; do not retry, do not count.
 * 403 → the VAPID signature did not match. That is an OPERATOR error affecting
 * every row simultaneously (rotated or misconfigured keys), so the row stays
 * and it is logged distinctly, because it is otherwise completely silent.
 * Anything else → transient. Leave it alone.
 */
async function handleSendFailure(
  error: unknown,
  endpoint: string,
): Promise<void> {
  const status =
    error instanceof WebPushError ? error.statusCode : undefined;

  if (status !== undefined && isDeadSubscription(status)) {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .catch(() => {});
    return;
  }
  if (status === 403) {
    // Loud on purpose: every device is failing right now and nothing else
    // would ever say so.
    logError('[push] VAPID rejected — keys rotated or misconfigured', error);
    return;
  }
  logError('[push] send failed', error, { status: status ?? 'none' });
}

/**
 * Send one notice to every device a person has registered.
 *
 * Sequential with a per-device try/catch, matching the cron convention that
 * one failure never aborts the loop. At seven members with a couple of devices
 * each this is a handful of requests; a concurrency pool would be complexity
 * for nothing.
 */
export async function sendToUser(
  userId: string,
  notice: PushNotice,
): Promise<number> {
  return sendToUsers([userId], notice);
}

export async function sendToUsers(
  userIds: string[],
  notice: PushNotice,
): Promise<number> {
  if (!pushConfigured() || userIds.length === 0) return 0;

  const devices = await db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, userIds));
  if (devices.length === 0) return 0;

  const payload = JSON.stringify(renderNotice(notice));
  // RFC 8291 §4 leaves at most 3993 octets of PLAINTEXT after the aes128gcm
  // header, the padding delimiter and the 16-octet auth tag — the ceiling is
  // NOT the 4096 of the encrypted body. Everything renderNotice produces is a
  // fixed sentence plus a count, so this cannot fire today; it is here so that
  // if a future notice kind grows, it fails loudly on our side instead of
  // returning 413 from every push service at once.
  const bytes = Buffer.byteLength(payload, 'utf8');
  if (bytes > 3000) {
    logError('[push] payload too large — refusing to send', new Error('payload'), {
      kind: notice.kind,
      bytes,
    });
    return 0;
  }
  const { ttlSeconds, topic } = PUSH_DELIVERY[notice.kind];
  const details = vapidDetails();
  let sent = 0;
  const reached: string[] = [];

  for (const device of devices) {
    // Re-checked here and not only at write time: a row can predate a
    // tightening of the predicate.
    if (!isPlausiblePushEndpoint(device.endpoint)) continue;
    try {
      await webpush.sendNotification(
        {
          endpoint: device.endpoint,
          keys: { p256dh: device.p256dh, auth: device.auth },
        },
        payload,
        { vapidDetails: details, TTL: ttlSeconds, topic, urgency: 'normal' },
      );
      sent += 1;
      reached.push(device.id);
    } catch (error) {
      await handleSendFailure(error, device.endpoint);
    }
  }

  if (reached.length) {
    await db
      .update(pushSubscriptions)
      .set({ lastNotifiedAt: sql`now()` })
      .where(inArray(pushSubscriptions.id, reached))
      .catch(() => {});
  }
  if (sent) log('push.sent', { kind: notice.kind, devices: sent });
  return sent;
}
