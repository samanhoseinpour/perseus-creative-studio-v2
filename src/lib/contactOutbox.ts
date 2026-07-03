/**
 * Offline outbox for the contact form — the site's only client-side mutation.
 *
 * When a visitor submits while offline (or the send fails for a network reason),
 * the inquiry is stored in IndexedDB and replayed with `emailjs.send` once we're
 * back online. Each record carries a client-generated `id`:
 *  - it's the IndexedDB key, so re-queuing the same item is a no-op, and
 *  - it's passed to EmailJS as `client_id`, giving you a stable handle to
 *    de-duplicate on the receiving side if a retry double-delivers.
 *
 * Delivery is at-least-once: a record is only removed after EmailJS confirms the
 * send, so a crash mid-flush re-tries rather than drops. Inquiries are
 * append-only (no shared server state), so there are no write/write conflicts to
 * reconcile — see OFFLINE.md.
 */
import {
  addToOutbox,
  deleteFromOutbox,
  getAllOutbox,
  type OutboxRecord,
} from './offlineDb';

// Centralized EmailJS identifiers (previously inline in ContactForm). Public by
// design — these are browser-side EmailJS keys, not secrets.
export const EMAILJS_SERVICE_ID = 'service_qjag8bk';
export const EMAILJS_TEMPLATE_ID = 'template_7mblhs8';
export const EMAILJS_PUBLIC_KEY = 'dadBrt1bY5rxklS5j';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Persist an inquiry for later delivery. Returns the record's id. */
export async function queueInquiry(
  params: Record<string, string>,
): Promise<string> {
  const id = newId();
  await addToOutbox({ id, createdAt: Date.now(), params });
  return id;
}

async function sendRecord(record: OutboxRecord): Promise<void> {
  // Loaded on demand: the outbox flusher is mounted globally (OfflineBanner),
  // so a static import would put the EmailJS SDK in every page's JS bundle.
  // This way the SDK only downloads when there is actually something to send.
  const { default: emailjs } = await import('@emailjs/browser');
  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    { ...record.params, client_id: record.id },
    { publicKey: EMAILJS_PUBLIC_KEY },
  );
}

/**
 * Try to deliver every queued inquiry. Returns the count successfully sent.
 * Failures are left in the queue for the next flush; we stop early on the first
 * failure to avoid hammering the network while it's still down.
 */
export async function flushOutbox(): Promise<number> {
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
    } catch {
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
