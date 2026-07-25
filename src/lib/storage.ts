// Persistent Vault Storage Manager (IndexedDB + Safe LocalStorage Fallback)

const DB_NAME = 'AeternaVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'vault_store';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Persists an item asynchronously into IndexedDB (high capacity, GBs storage)
 * and attempts a safe fallback write to localStorage without raising QuotaExceededErrors.
 */
export async function setVaultItem<T>(key: string, value: T): Promise<void> {
  // 1. IndexedDB primary write (no 5MB quota limit)
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[VaultStorage] IndexedDB write notice for ${key}:`, err);
  }

  // 2. Safe LocalStorage sync (catches quota errors gracefully)
  try {
    const serialized = JSON.stringify(value);
    // Only attempt localStorage if under 1MB to preserve quota for small configs
    if (serialized.length < 1000000) {
      localStorage.setItem(key, serialized);
    } else {
      // If payload is large, clear localStorage key to prevent stale/broken state
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn(`[VaultStorage] LocalStorage quota exceeded for ${key}. Preserved in IndexedDB and state memory.`, err);
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore secondary error
    }
  }
}

/**
 * Retrieves an item from IndexedDB first, falling back to localStorage if necessary.
 */
export async function getVaultItem<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    const result = await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
    if (result !== null) return result;
  } catch (err) {
    console.warn(`[VaultStorage] IndexedDB read notice for ${key}:`, err);
  }

  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved) as T;
  } catch {
    // Ignore fallback parse error
  }

  return null;
}

/**
 * Deletes an item from both IndexedDB and localStorage.
 */
export async function removeVaultItem(key: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[VaultStorage] IndexedDB delete notice for ${key}:`, err);
  }

  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

/**
 * Safely writes to localStorage catching any potential QuotaExceededError
 */
export function safeSetLocalStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`[LocalStorage] Could not write ${key}:`, err);
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
    return false;
  }
}
