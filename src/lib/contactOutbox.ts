/**
 * Offline outbox for the contact form — the site's only client-side mutation.
 *
 * When a visitor submits while offline (or the send fails for a network
 * reason), the submission is stored in IndexedDB and replayed through the
 * `submitContact` server action once we're back online. Each record's `id` IS
 * the submission's `client_id`:
 *  - it's the IndexedDB key, so re-queuing the same fill session overwrites
 *    rather than duplicates, and
 *  - the database uniques on it, so an at-least-once replay resolves to
 *    `duplicate: true` server-side instead of a second row + second email.
 *
 * Delivery is at-least-once: a record is only removed after the action
 * confirms it (or deterministically rejects it — see the poisoning guard in
 * doFlush), so a crash mid-flush re-tries rather than drops. See OFFLINE.md.
 *
 * IMPORTANT: this module is imported by OfflineBanner, which mounts in the
 * root layout — it rides the shared client chunk into every route. Keep it
 * dependency-free: no zod / contactSchema import (the action re-validates),
 * and the action itself is dynamic-imported so even its stub stays out of
 * the shared chunk.
 */
import {
  addToOutbox,
  deleteFromOutbox,
  getAllOutbox,
  type ContactOutboxRecordV2,
  type LegacyOutboxRecord,
  type OutboxRecord,
} from './offlineDb';

/**
 * Persist a submission for later delivery. `record.id` must be the fill
 * session's client_id (ContactHub supplies it). Returns the id.
 */
export async function queueSubmission(
  record: Omit<ContactOutboxRecordV2, 'createdAt' | 'v'>,
): Promise<string> {
  await addToOutbox({ ...record, createdAt: Date.now(), v: 2 });
  return record.id;
}

/**
 * Thrown when the action deterministically rejected a stored payload
 * (validation failure) — replaying it can never succeed.
 */
class PermanentRejectionError extends Error {
  constructor() {
    super('Submission permanently rejected');
    this.name = 'PermanentRejectionError';
  }
}

function recordToFormData(record: ContactOutboxRecordV2): FormData {
  const fd = new FormData();
  fd.set('client_id', record.id);
  for (const [key, value] of Object.entries(record.fields)) {
    if (Array.isArray(value)) {
      for (const v of value) fd.append(key, v);
    } else {
      fd.set(key, value);
    }
  }
  if (record.resume) {
    // Reconstruct the upload from the snapshot bytes (see StoredResume).
    const r = record.resume;
    fd.set(
      'resume',
      new File([r.bytes], r.name, {
        type: r.type,
        lastModified: r.lastModified,
      }),
    );
  }
  return fd;
}

/**
 * Best-effort mapping for records queued before the server-action migration
 * (EmailJS template params). The old service picker stored human labels, not
 * slugs, so those inquiries land as 'other' with the labels preserved in the
 * message. The real queue is almost certainly empty, but a mapping can't
 * lose a lead the way dropping would.
 */
function legacyToFormData(record: LegacyOutboxRecord): FormData {
  const p = record.params;
  const fd = new FormData();
  fd.set('kind', 'project');
  fd.set('client_id', record.id);
  // Legacy records predate the fill-timer; a fixed plausible value keeps them
  // clear of the bot speed check.
  fd.set('elapsed_ms', '60000');
  fd.set('name', p.user_name ?? '');
  fd.set('email', p.user_email ?? '');
  fd.set('phone', p.user_phoneNumber ?? '');
  fd.set('country', p.user_country ?? '');
  fd.set('company', p.business_name ?? '');
  fd.set('instagram', p.instagram_id ?? '');
  fd.set('website', p.website_name ?? '');
  fd.append('services', 'other');
  const requested = p.user_service ? `[Requested: ${p.user_service}]` : '';
  fd.set('message', [p.user_message ?? '', requested].join('\n').trim());
  return fd;
}

async function sendRecord(record: OutboxRecord): Promise<void> {
  // Loaded on demand: the flusher is mounted globally (OfflineBanner), so a
  // static import would put the action's client stub in every page's JS.
  const { submitContact } = await import('@/app/contact/actions');
  const fd =
    'params' in record ? legacyToFormData(record) : recordToFormData(record);
  const result = await submitContact(fd);
  if (!result.ok) {
    if (result.error === 'validation') {
      // Deterministic for a stored payload — it will never succeed, and
      // keeping it would block everything queued behind it.
      throw new PermanentRejectionError();
    }
    // 'server' failures (DB/Blob hiccup) are worth retrying next flush.
    throw new Error('Submission failed on the server');
  }
}

// Single-flight guard: flushes are triggered from several places (mount +
// every `online` event — see OfflineBanner), and a flapping connection can
// fire them while a previous flush is still running. Two overlapping flushes
// would both read the same records and both send them before either deletes —
// the server dedups on client_id, but there's no reason to double-send.
// Overlapping callers piggyback on the running flush.
let inflightFlush: Promise<number> | null = null;

/**
 * Try to deliver every queued submission. Returns the count successfully
 * sent. Transient failures are left in the queue for the next flush; we stop
 * early on the first one to avoid hammering the network while it's still
 * down. Permanently-rejected records are dropped so they can't poison the
 * queue.
 */
export function flushOutbox(): Promise<number> {
  if (inflightFlush) return inflightFlush;
  inflightFlush = doFlush().finally(() => {
    inflightFlush = null;
  });
  return inflightFlush;
}

async function doFlush(): Promise<number> {
  let sent = 0;
  let records: OutboxRecord[];
  try {
    records = await getAllOutbox();
  } catch {
    return 0;
  }
  for (const record of records) {
    try {
      await sendRecord(record);
      await deleteFromOutbox(record.id);
      sent += 1;
    } catch (error) {
      if (error instanceof PermanentRejectionError) {
        try {
          await deleteFromOutbox(record.id);
        } catch {
          // Deletion failed — the next flush will try dropping it again.
        }
        continue;
      }
      break;
    }
  }
  return sent;
}

export async function outboxCount(): Promise<number> {
  try {
    return (await getAllOutbox()).length;
  } catch {
    return 0;
  }
}
