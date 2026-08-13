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
 * (marketing) layout — it rides the shared client chunk into every marketing
 * route. Keep it dependency-free: no zod / contactSchema import (the action
 * re-validates), and the action itself is dynamic-imported so even its stub
 * stays out of the shared chunk.
 *
 * localStorage fast-path: opening IndexedDB just to learn the queue is empty
 * costs an open + getAll transaction on EVERY page load — and *creates* the
 * database on first visit, which Lighthouse then flags as stored data
 * affecting the run. `pcs.outbox.pending` mirrors "≥1 record may be queued";
 * OfflineBanner checks it before touching IndexedDB, so ~100% of loads never
 * open the DB at all. The flag errs toward staying set (cleared only when a
 * flush fully drains), and worst-case drift (localStorage cleared while IDB
 * survives) just delays a flush until the next queue event — acceptable for
 * an at-least-once outbox.
 */
import {
  addToOutbox,
  deleteFromOutbox,
  getAllOutbox,
  type ContactOutboxRecordV2,
  type LegacyOutboxRecord,
  type OutboxRecord,
} from './offlineDb';

const PENDING_FLAG = 'pcs.outbox.pending';
// One-time legacy reconciliation done (see reconcileOutboxFlag).
const CHECKED_FLAG = 'pcs.outbox.checked';

const readFlag = (key: string): boolean => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};
const writeFlag = (key: string, on: boolean): void => {
  try {
    if (on) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {
    // Private-mode quota — the IDB paths still work, just without the shortcut.
  }
};

/** Cheap "might anything be queued?" check — never touches IndexedDB. */
export function hasQueuedSubmissions(): boolean {
  if (typeof window === 'undefined') return false;
  return readFlag(PENDING_FLAG);
}

/**
 * One-time migration for visitors whose `pcs-offline` DB predates the
 * pending flag: if the DB exists with records, re-set the flag so their queue
 * still flushes; if it exists empty, delete it (removing the stored data
 * Lighthouse warns about). Uses `indexedDB.databases()` so a fresh profile is
 * checked WITHOUT creating the database; browsers without `databases()`
 * (old Safari) skip the check — a record queued from then on re-sets the flag
 * itself, so nothing is ever deleted or lost, at worst delayed.
 */
export async function reconcileOutboxFlag(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (hasQueuedSubmissions() || readFlag(CHECKED_FLAG)) return;
  try {
    if (typeof indexedDB.databases !== 'function') {
      writeFlag(CHECKED_FLAG, true);
      return;
    }
    const dbs = await indexedDB.databases();
    if (!dbs.some((d) => d.name === 'pcs-offline')) {
      writeFlag(CHECKED_FLAG, true);
      return;
    }
    if ((await getAllOutbox()).length > 0) {
      writeFlag(PENDING_FLAG, true);
    } else {
      // offlineDb closes its connection after every transaction, so this
      // delete isn't blocked by the getAll above.
      indexedDB.deleteDatabase('pcs-offline');
    }
    writeFlag(CHECKED_FLAG, true);
  } catch {
    // Transient — retry on the next visit.
  }
}

/**
 * Persist a submission for later delivery. `record.id` must be the fill
 * session's client_id (ContactHub supplies it). Returns the id.
 */
export async function queueSubmission(
  record: Omit<ContactOutboxRecordV2, 'createdAt' | 'v'>,
): Promise<string> {
  await addToOutbox({ ...record, createdAt: Date.now(), v: 2 });
  writeFlag(PENDING_FLAG, true);
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
  const { submitContact } = await import('@/app/(marketing)/contact/actions');
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
  let dropped = 0;
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
          dropped += 1;
        } catch {
          // Deletion failed — the next flush will try dropping it again.
        }
        continue;
      }
      break;
    }
  }
  // Fully drained (every record either sent or dropped) → clear the fast-path
  // flag. A transient early break leaves it set for the next flush.
  if (sent + dropped === records.length) writeFlag(PENDING_FLAG, false);
  return sent;
}
