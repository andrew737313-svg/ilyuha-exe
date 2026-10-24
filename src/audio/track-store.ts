/**
 * Final-track storage. The admin panel can drop a custom song without a
 * rebuild; the file lives in IndexedDB of the browser it was added in, so the
 * recipient of the link only hears it after the file is added to the build
 * (public/audio/old-save.mp3) — the panel explains that in place.
 */

const DB_NAME = "ilyuha-audio";
const DB_VERSION = 1;
const STORE_NAME = "tracks";
const TRACK_KEY = "final";

export const TRACK_CHANGED_EVENT = "ilyuha:track-changed";

export type StoredTrack = {
  name: string;
  type: string;
  blob: Blob;
  size: number;
  savedAt: number;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB недоступен"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Не удалось открыть базу"));
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | null,
): Promise<T | null> {
  return openDatabase().then(
    (db) =>
      new Promise<T | null>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = action(store);
        transaction.oncomplete = () => {
          db.close();
          resolve(request ? request.result : null);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error("Ошибка базы"));
        };
      }),
  );
}

export async function saveTrack(file: Blob & { name?: string }): Promise<StoredTrack> {
  const record: StoredTrack = {
    name: file.name ?? "final-track",
    type: file.type || "audio/mpeg",
    blob: file,
    size: file.size,
    savedAt: Date.now(),
  };
  await runTransaction("readwrite", (store) => store.put(record, TRACK_KEY));
  return record;
}

export async function loadTrack(): Promise<StoredTrack | null> {
  try {
    const record = await runTransaction<StoredTrack>("readonly", (store) => store.get(TRACK_KEY));
    return record && record.blob instanceof Blob ? record : null;
  } catch {
    return null;
  }
}

export async function clearTrack(): Promise<void> {
  await runTransaction("readwrite", (store) => store.delete(TRACK_KEY));
}

export function notifyTrackChanged(): void {
  window.dispatchEvent(new Event(TRACK_CHANGED_EVENT));
}

export function formatTrackSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 КБ";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}