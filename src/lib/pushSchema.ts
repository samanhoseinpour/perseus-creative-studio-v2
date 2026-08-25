import 'server-only';
import { z } from 'zod';

import { isPlausiblePushEndpoint } from '@/lib/pushFields';

/**
 * The subscribe payload, validated at the door.
 *
 * The endpoint refinement is a SECURITY control, not a formatting nicety: the
 * value is caller-supplied and our SERVER later fetches it, so an unchecked
 * one is SSRF-shaped. It lives in the client-safe leaf (pushFields.ts) so
 * scripts/check-push.mts can pin it without a DB, and is re-applied in push.ts
 * before every send, because a stored row can predate a tightening.
 *
 * `server-only`, like ticketSchema.ts — nothing client-side needs zod for this.
 */

/** Base64url, and long enough to be a real key. Bounded so a caller cannot
 *  push a megabyte of text into a text column. */
const b64url = z
  .string()
  .trim()
  .min(16)
  .max(512)
  .regex(/^[A-Za-z0-9_-]+=*$/, 'not base64url');

export const pushSubscribeSchema = z.object({
  endpoint: z
    .string()
    .trim()
    .min(20)
    .max(1024)
    .refine(isPlausiblePushEndpoint, {
      message: 'not a usable push endpoint',
    }),
  keys: z.object({
    p256dh: b64url,
    auth: b64url,
  }),
  // A label for the device row, never an identity. Bounded because it is
  // caller-controlled.
  userAgent: z.string().trim().max(512).optional(),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().trim().min(20).max(1024),
});

export type PushSubscribeInput = z.infer<typeof pushSubscribeSchema>;
