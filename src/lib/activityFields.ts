/**
 * Pure helpers for the activity log: the redaction denylist, payload
 * scrubbing, and field diffing. No imports beyond types — deliberately a leaf
 * module with no `server-only` guard, the same split adminAreas.ts has from
 * adminAccess.ts and taskFields.ts has from _actions/tasks.ts.
 *
 * Why the split matters here specifically: redaction is a PRIVACY CONTROL, and
 * a privacy control nobody can test is a privacy control nobody can trust.
 * Living outside the server-only boundary means scripts/check-activity-log.mts
 * can assert against it directly (server-only throws under plain node).
 *
 * This module must never import the db client or anything under @/db besides
 * types — it is the half of the logger that is safe to reason about in
 * isolation.
 */
import type { ActivityPayload, ActivityValue } from '@/db/schema';

/* -------------------------------------------------------------------------- */
/* Redaction                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Keys whose VALUES never reach the database, matched case-insensitively as
 * substrings so `wireRef`, `wire_ref` and `paymentWireRef` are all caught.
 *
 * Three groups, each with a reason:
 *
 * 1. Credentials and capabilities — OWASP's never-log list. A résumé blob
 *    pathname is on it because the pathname IS the capability: anyone holding
 *    it can request the file.
 * 2. Payroll figures. Payroll's whole privacy design is the own-vs-admin
 *    projection split in src/db/payrollQueries.ts — a column that was never
 *    SELECTed cannot leak. An audit payload is the back door that would undo
 *    that, so amounts are refused here as well as omitted at the call site.
 * 3. Third-party PII — a contact message body, an applicant's details. PIPEDA
 *    Principle 5 says keep it only as long as the purpose needs it; the audit
 *    trail's purpose is proving WHO acted, not preserving WHAT they read.
 *
 * `\bauth\b` rather than a bare `auth` so it cannot swallow `author`/
 * `authorSlug`, which are ordinary blog fields. Conversely `note` is
 * UNANCHORED: `\bnotes?\b` could not match `adminNote`/`memberNote` (camelCase
 * has no word boundary), which is why `admin_note` used to need spelling out.
 * It does NOT match `notification*` (noti- vs note-). Staff `email` is deliberately
 * NOT on the list — "created an account for x@perseustudio.com" is the point
 * of the row; third-party emails never reach a payload because inbox actions
 * log a submission id instead.
 *
 * Redacted rather than dropped: a visible '[redacted]' proves the control ran,
 * where a missing key looks like a call site that simply forgot.
 */
export const REDACTED_KEY_RE =
  /pass|hash|salt|token|secret|cookie|session|\bauth\b|authoriz|credential|apikey|api_key|dsn|\bkeys?\b|resume|cents|rate_micro|ratemicro|wire|salary|amount|payout|invoice|note|message|body|phone|address|pathname|blobpath|screenshotpath|avatarpath|endpoint|p256dh|subscription/i;

export const REDACTED = '[redacted]';

export const scrubValue = (key: string, value: ActivityValue): ActivityValue =>
  REDACTED_KEY_RE.test(key) ? REDACTED : value;

/** Apply the denylist across every key a payload can carry. */
export function scrub(
  payload: ActivityPayload | undefined,
): ActivityPayload | null {
  if (!payload) return null;
  const out: ActivityPayload = {};

  if (payload.changes) {
    const changes: NonNullable<ActivityPayload['changes']> = {};
    for (const [field, change] of Object.entries(payload.changes)) {
      changes[field] = {
        ...(change.from !== undefined
          ? { from: scrubValue(field, change.from) }
          : {}),
        to: scrubValue(field, change.to),
      };
    }
    out.changes = changes;
  }

  if (typeof payload.count === 'number') out.count = payload.count;

  if (payload.meta) {
    const meta: Record<string, ActivityValue> = {};
    for (const [key, value] of Object.entries(payload.meta)) {
      meta[key] = scrubValue(key, value);
    }
    out.meta = meta;
  }

  return Object.keys(out).length > 0 ? out : null;
}

/* -------------------------------------------------------------------------- */
/* Diffing                                                                    */
/* -------------------------------------------------------------------------- */

/** Long strings are clipped so a notes edit doesn't bloat the row — the same
 *  120-char ceiling clipValue uses in _actions/tasks.ts. */
export const clip = (value: ActivityValue): ActivityValue =>
  typeof value === 'string' && value.length > 120
    ? `${value.slice(0, 120)}…`
    : value;

/**
 * Field-level diff of two flat records, keeping only what actually changed.
 * Call sites pass the fields they care about, not whole rows — the
 * ActivityValue scalar constraint makes a `{...row}` spread a type error, so
 * the narrow call is the only one that compiles.
 */
export function diff<T extends Record<string, ActivityValue>>(
  before: T,
  next: Partial<T>,
): ActivityPayload['changes'] | undefined {
  const changes: NonNullable<ActivityPayload['changes']> = {};
  for (const [field, to] of Object.entries(next) as [string, ActivityValue][]) {
    if (to === undefined) continue;
    const from = before[field];
    if (Object.is(from, to)) continue;
    changes[field] = { from: clip(from), to: clip(to) };
  }
  return Object.keys(changes).length > 0 ? changes : undefined;
}
