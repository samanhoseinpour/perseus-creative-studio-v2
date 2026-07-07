/**
 * Minimal zero-dependency IndexedDB wrapper for the offline outbox.
 *
 * We keep this tiny on purpose — the only persisted data is queued contact
 * submissions — so pulling in `idb` (or similar) isn't warranted. All calls
 * are guarded for SSR (`indexedDB` only exists in the browser).
 *
 * No DB_VERSION bump for the v2 record shape: object stores are schemaless,
 * so only the TypeScript types change. Records written before the server-
 * action migration (the EmailJS era) keep the legacy `params` shape and are
 * mapped at replay time in contactOutbox.ts.
 */

const DB_NAME = 'pcs-offline';
const DB_VERSION = 1;
const STORE = 'outbox';

/**
 * A resume snapshot. Deliberately NOT a `File`: structured-cloning a File
 * into IndexedDB can store a live reference to the on-disk file (Chromium),
 * so if the visitor moves/edits it before the flush, the replay read throws
 * and the application is stuck. Snapshotting the bytes at queue time makes
 * the record self-contained.
 */
export interface StoredResume {
  name: string;
  type: string;
  lastModified: number;
  bytes: ArrayBuffer;
}

/** Current shape: a queued submission for the submitContact server action. */
export interface ContactOutboxRecordV2 {
  /** The submission's client_id — doubles as the IDB key, so re-queuing the
   *  same fill session overwrites instead of duplicating, and the server's
   *  unique constraint dedups an at-least-once replay. */
  id: string;
  createdAt: number;
  v: 2;
  /** Everything except the file — includes kind, elapsed_ms, and (for
   *  project inquiries) the services slug array. */
  fields: Record<string, string | string[]>;
  /** Career applications: the resume PDF snapshot. */
  resume?: StoredResume;
}

/** Pre-migration shape: raw EmailJS template params. Replay maps these. */
export interface LegacyOutboxRecord {
  id: string;
  createdAt: number;
  params: Record<string, string>;
}

export type OutboxRecord = ContactOutboxRecordV2 | LegacyOutboxRecord;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = run(transaction.objectStore(STORE));
    // Settle on TRANSACTION events, not request.onsuccess: IndexedDB only
    // guarantees durability at commit, and a readwrite transaction can still
    // abort after the request succeeded (e.g. QuotaExceededError enforced at
    // commit — likelier now that records can carry multi-MB resume bytes).
    // Resolving early would show "Saved offline" for a write that was lost.
    let result: T;
    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    };
  });
}

export function addToOutbox(record: OutboxRecord): Promise<IDBValidKey> {
  // put(), not add(): the key is the fill session's client_id, so re-queuing
  // after a failed flush overwrites the same record instead of throwing.
  return tx('readwrite', (store) => store.put(record));
}

export function getAllOutbox(): Promise<OutboxRecord[]> {
  return tx<OutboxRecord[]>('readonly', (store) => store.getAll());
}

export function deleteFromOutbox(id: string): Promise<undefined> {
  return tx('readwrite', (store) => store.delete(id));
}
