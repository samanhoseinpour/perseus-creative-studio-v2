/**
 * Minimal zero-dependency IndexedDB wrapper for the offline outbox.
 *
 * We keep this tiny on purpose — the only persisted data is queued contact
 * inquiries — so pulling in `idb` (or similar) isn't warranted. All calls are
 * guarded for SSR (`indexedDB` only exists in the browser).
 */

const DB_NAME = 'pcs-offline';
const DB_VERSION = 1;
const STORE = 'outbox';

export interface OutboxRecord {
  id: string;
  createdAt: number;
  params: Record<string, string>;
}

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
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

export function addToOutbox(record: OutboxRecord): Promise<IDBValidKey> {
  return tx('readwrite', (store) => store.add(record));
}

export function getAllOutbox(): Promise<OutboxRecord[]> {
  return tx<OutboxRecord[]>('readonly', (store) => store.getAll());
}

export function deleteFromOutbox(id: string): Promise<undefined> {
  return tx('readwrite', (store) => store.delete(id));
}
