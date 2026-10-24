import { EventSchema, NormalizedDocumentSchema, ProfileSchema } from '../../shared/contracts';
import type { Event, NormalizedDocument, Profile } from '../../shared/contracts';

/**
 * Wrapper IndexedDB tối giản (~150 dòng), không dùng Dexie.
 * Mọi bản ghi đọc lên đều được validate bằng Zod; bản ghi hỏng bị bỏ qua thay vì làm sập UI.
 */

const DB_NAME = 'lich-trinh-demo';
const DB_VERSION = 1;

type StoreName = 'documents' | 'profiles' | 'events' | 'settings';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('documents')) {
        const store = db.createObjectStore('documents', { keyPath: 'documentId' });
        store.createIndex('capturedAt', 'capturedAt');
      }
      if (!db.objectStoreNames.contains('profiles')) {
        const store = db.createObjectStore('profiles', { keyPath: 'id' });
        store.createIndex('name', 'name');
      }
      if (!db.objectStoreNames.contains('events')) {
        const store = db.createObjectStore('events', { keyPath: 'id' });
        store.createIndex('status', 'status');
        store.createIndex('start', 'start.value');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error('Không mở được IndexedDB'));
    };
  });
  return dbPromise;
}

async function readAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error ?? new Error('Đọc IndexedDB thất bại'));
  });
}

async function mutate(storeName: StoreName, fn: (store: IDBObjectStore) => void): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Ghi IndexedDB thất bại'));
    tx.onabort = () => reject(tx.error ?? new Error('Giao dịch IndexedDB bị huỷ'));
    try {
      fn(tx.objectStore(storeName));
    } catch (error) {
      tx.abort();
      reject(error);
    }
  });
}

function invalid(store: string, id: unknown): void {
  console.warn(`[db] Bỏ qua bản ghi ${store} không hợp lệ:`, id);
}

/* ------------------------------- documents ------------------------------- */

export async function saveDocument(document: NormalizedDocument): Promise<void> {
  const valid = NormalizedDocumentSchema.parse(document);
  await mutate('documents', (store) => store.put(valid));
}

export async function getDocument(documentId: string): Promise<NormalizedDocument | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readonly');
    const request = tx.objectStore('documents').get(documentId);
    request.onsuccess = () => {
      const parsed = NormalizedDocumentSchema.safeParse(request.result);
      if (parsed.success) resolve(parsed.data);
      else resolve(null);
    };
    request.onerror = () => reject(request.error ?? new Error('Đọc IndexedDB thất bại'));
  });
}

export async function listDocuments(): Promise<NormalizedDocument[]> {
  const rows = await readAll<unknown>('documents');
  return rows
    .map((row) => NormalizedDocumentSchema.safeParse(row))
    .filter((result) => result.success)
    .map((result) => result.data)
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
}

export async function deleteDocument(documentId: string): Promise<void> {
  await mutate('documents', (store) => store.delete(documentId));
}

/* -------------------------------- profiles ------------------------------- */

export async function saveProfile(profile: Profile): Promise<void> {
  const valid = ProfileSchema.parse(profile);
  await mutate('profiles', (store) => store.put(valid));
}

export async function listProfiles(): Promise<Profile[]> {
  const rows = await readAll<unknown>('profiles');
  const profiles: Profile[] = [];
  for (const row of rows) {
    const parsed = ProfileSchema.safeParse(row);
    if (parsed.success) profiles.push(parsed.data);
    else invalid('profiles', row);
  }
  return profiles;
}

export async function deleteProfile(id: string): Promise<void> {
  await mutate('profiles', (store) => store.delete(id));
}

/* --------------------------------- events -------------------------------- */

export async function saveEvent(event: Event): Promise<void> {
  const valid = EventSchema.parse(event);
  await mutate('events', (store) => store.put(valid));
}

export async function listEvents(): Promise<Event[]> {
  const rows = await readAll<unknown>('events');
  const events: Event[] = [];
  for (const row of rows) {
    const parsed = EventSchema.safeParse(row);
    if (parsed.success) events.push(parsed.data);
    else invalid('events', row);
  }
  return events;
}

export async function deleteEvent(id: string): Promise<void> {
  await mutate('events', (store) => store.delete(id));
}

/* -------------------------------- settings ------------------------------- */

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const rows = await readAll<{ key: string; value: unknown }>('settings');
  const row = rows.find((item) => item.key === key);
  return row?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await mutate('settings', (store) => store.put({ key, value }));
}

/* ------------------------------ batch / admin ---------------------------- */

export interface ExportPayload {
  app: 'lich-trinh-ca-nhan-demo';
  version: 1;
  exportedAt: string;
  documents: NormalizedDocument[];
  profiles: Profile[];
  events: Event[];
}

export async function exportAll(): Promise<ExportPayload> {
  const [documents, profiles, events] = await Promise.all([
    listDocuments(),
    listProfiles(),
    listEvents(),
  ]);
  return {
    app: 'lich-trinh-ca-nhan-demo',
    version: 1,
    exportedAt: new Date().toISOString(),
    documents,
    profiles,
    events,
  };
}

export interface ImportSummary {
  documents: number;
  profiles: number;
  events: number;
  skipped: number;
}

export async function importAll(raw: unknown): Promise<ImportSummary> {
  if (typeof raw !== 'object' || raw === null) throw new Error('Tệp JSON không hợp lệ');
  const payload = raw as Partial<ExportPayload>;
  if (payload.app !== 'lich-trinh-ca-nhan-demo') throw new Error('Tệp không phải bản xuất của ứng dụng này');

  const summary: ImportSummary = { documents: 0, profiles: 0, events: 0, skipped: 0 };

  for (const item of payload.documents ?? []) {
    const parsed = NormalizedDocumentSchema.safeParse(item);
    if (parsed.success) {
      await saveDocument(parsed.data);
      summary.documents += 1;
    } else summary.skipped += 1;
  }
  for (const item of payload.profiles ?? []) {
    const parsed = ProfileSchema.safeParse(item);
    if (parsed.success) {
      await saveProfile(parsed.data);
      summary.profiles += 1;
    } else summary.skipped += 1;
  }
  for (const item of payload.events ?? []) {
    const parsed = EventSchema.safeParse(item);
    if (parsed.success) {
      await saveEvent(parsed.data);
      summary.events += 1;
    } else summary.skipped += 1;
  }
  return summary;
}

export async function clearAll(): Promise<void> {
  await Promise.all(
    (['documents', 'profiles', 'events', 'settings'] as StoreName[]).map((name) =>
      mutate(name, (store) => store.clear()),
    ),
  );
}
