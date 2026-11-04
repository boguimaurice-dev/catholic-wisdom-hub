import { DEFAULT_SETTINGS, type AppSettings, type VaultEnvelope } from "./types";

const DB_NAME = "coffre-db";
const DB_VERSION = 1;
const STORE = "vault";
const RECORD_KEY = "primary";
const LS_ENVELOPE = "coffre.envelope";
const LS_SETTINGS = "coffre.settings";

export type StorageMode = "indexeddb" | "localstorage";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB indisponible"));
    request.onblocked = () => reject(new Error("IndexedDB bloquée"));
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = fn(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Erreur IndexedDB"));
        tx.oncomplete = () => db.close();
        tx.onerror = () => reject(tx.error ?? new Error("Erreur IndexedDB"));
      }),
  );
}

export async function detectStorageMode(): Promise<StorageMode> {
  try {
    await openDb().then((db) => db.close());
    return "indexeddb";
  } catch {
    return "localstorage";
  }
}

export async function readEnvelope(): Promise<VaultEnvelope | null> {
  try {
    const record = await withStore<VaultEnvelope | undefined>("readonly", (store) =>
      store.get(RECORD_KEY) as IDBRequest<VaultEnvelope | undefined>,
    );
    if (record) return record;
  } catch {
    /* repli ci-dessous */
  }
  const raw = localStorage.getItem(LS_ENVELOPE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as VaultEnvelope;
  } catch {
    return null;
  }
}

export async function writeEnvelope(envelope: VaultEnvelope): Promise<void> {
  try {
    await withStore<IDBValidKey>("readwrite", (store) => store.put(envelope, RECORD_KEY));
    localStorage.removeItem(LS_ENVELOPE);
    return;
  } catch {
    localStorage.setItem(LS_ENVELOPE, JSON.stringify(envelope));
  }
}

export async function clearEnvelope(): Promise<void> {
  localStorage.removeItem(LS_ENVELOPE);
  try {
    await withStore<undefined>("readwrite", (store) => store.delete(RECORD_KEY) as IDBRequest<undefined>);
  } catch {
    /* ignoré */
  }
}

export function readSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      autoLockMinutes:
        typeof parsed.autoLockMinutes === "number" ? parsed.autoLockMinutes : DEFAULT_SETTINGS.autoLockMinutes,
      copyClearSeconds:
        typeof parsed.copyClearSeconds === "number" ? parsed.copyClearSeconds : DEFAULT_SETTINGS.copyClearSeconds,
      theme: parsed.theme === "light" ? "light" : "dark",
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(settings: AppSettings): void {
  localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
}

/** Vérifie la structure d'un fichier de sauvegarde importé. */
export function isVaultEnvelope(value: unknown): value is VaultEnvelope {
  if (!value || typeof value !== "object") return false;
  const env = value as Partial<VaultEnvelope>;
  const kdf = env.kdf as VaultEnvelope["kdf"] | undefined;
  const payload = env.payload as VaultEnvelope["payload"] | undefined;
  return (
    env.format === "coffre.vault" &&
    env.version === 1 &&
    !!kdf &&
    typeof kdf.salt === "string" &&
    typeof kdf.iterations === "number" &&
    kdf.iterations >= 100_000 &&
    !!payload &&
    typeof payload.iv === "string" &&
    typeof payload.data === "string"
  );
}
