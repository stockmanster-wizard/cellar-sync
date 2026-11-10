/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DB_NAME = 'cellarsync_images_idb';
const DB_VERSION = 1;
const STORE_NAME = 'images';

const LEGACY_DB_NAME = 'cellarsync_cache_v1';
const LEGACY_STORE_NAME = 'bottle_images';

let dbPromise: Promise<IDBDatabase | null> | null = null;
let legacyDbPromise: Promise<IDBDatabase | null> | null = null;
const memoryImageCache = new Map<string, string>();
const deletedImageIds = new Set<string>();

function openImageCacheDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.warn('IndexedDB open error in imageCacheStore:', request.error);
        dbPromise = null;
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB unavailable:', err);
      dbPromise = null;
      resolve(null);
    }
  });

  return dbPromise;
}

function openLegacyImageCacheDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  if (legacyDbPromise) return legacyDbPromise;

  legacyDbPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(LEGACY_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(LEGACY_STORE_NAME)) {
          db.createObjectStore(LEGACY_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        legacyDbPromise = null;
        resolve(null);
      };
    } catch {
      legacyDbPromise = null;
      resolve(null);
    }
  });

  return legacyDbPromise;
}

export function getSyncCachedImage(bottleId: string): string | undefined {
  if (!bottleId || deletedImageIds.has(bottleId)) return undefined;
  return memoryImageCache.get(bottleId);
}

export async function setImageBlob(bottleId: string, dataUrl: string): Promise<void> {
  if (!bottleId || !dataUrl) return;
  deletedImageIds.delete(bottleId);
  memoryImageCache.set(bottleId, dataUrl);

  const db = await openImageCacheDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(dataUrl, bottleId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export const saveImageBlob = setImageBlob;

export async function getImageBlob(bottleId: string): Promise<string | null> {
  if (!bottleId || deletedImageIds.has(bottleId)) return null;
  const mem = memoryImageCache.get(bottleId);
  if (mem) return mem;

  const db = await openImageCacheDB();
  if (!db) return null;

  const primaryResult = await new Promise<string | null>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(bottleId);
      req.onsuccess = () => {
        if (deletedImageIds.has(bottleId)) {
          resolve(null);
          return;
        }
        const val = typeof req.result === 'string' && req.result.length > 0 ? req.result : null;
        if (val) {
          memoryImageCache.set(bottleId, val);
        }
        resolve(val);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  if (primaryResult) return primaryResult;

  // Fallback check in legacy DB for seamless migration
  const legacyDb = await openLegacyImageCacheDB();
  if (!legacyDb || !legacyDb.objectStoreNames.contains(LEGACY_STORE_NAME)) return null;

  return new Promise((resolve) => {
    try {
      const tx = legacyDb.transaction(LEGACY_STORE_NAME, 'readonly');
      const store = tx.objectStore(LEGACY_STORE_NAME);
      const req = store.get(bottleId);
      req.onsuccess = () => {
        if (deletedImageIds.has(bottleId)) {
          resolve(null);
          return;
        }
        const val = typeof req.result === 'string' && req.result.length > 0 ? req.result : null;
        if (val) {
          memoryImageCache.set(bottleId, val);
          setImageBlob(bottleId, val).catch(() => {});
        }
        resolve(val);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function deleteImageBlob(bottleId: string): Promise<void> {
  if (!bottleId) return;
  deletedImageIds.add(bottleId);
  memoryImageCache.delete(bottleId);

  const db = await openImageCacheDB();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(bottleId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  const legacyDb = await openLegacyImageCacheDB();
  if (legacyDb && legacyDb.objectStoreNames.contains(LEGACY_STORE_NAME)) {
    await new Promise<void>((resolve) => {
      try {
        const tx = legacyDb.transaction(LEGACY_STORE_NAME, 'readwrite');
        const store = tx.objectStore(LEGACY_STORE_NAME);
        store.delete(bottleId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

export async function batchGetImages(bottleIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (!bottleIds || bottleIds.length === 0) return result;

  const idsToQueryFromIDB: string[] = [];
  for (const id of bottleIds) {
    if (!id || deletedImageIds.has(id)) continue;
    const mem = memoryImageCache.get(id);
    if (mem) {
      result.set(id, mem);
    } else {
      idsToQueryFromIDB.push(id);
    }
  }

  if (idsToQueryFromIDB.length === 0) {
    return result;
  }

  const db = await openImageCacheDB();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        let remaining = idsToQueryFromIDB.length;

        idsToQueryFromIDB.forEach((id) => {
          try {
            const req = store.get(id);
            req.onsuccess = () => {
              if (
                !deletedImageIds.has(id) &&
                typeof req.result === 'string' &&
                req.result.length > 0
              ) {
                memoryImageCache.set(id, req.result);
                result.set(id, req.result);
              }
              remaining -= 1;
              if (remaining === 0) resolve();
            };
            req.onerror = () => {
              remaining -= 1;
              if (remaining === 0) resolve();
            };
          } catch {
            remaining -= 1;
            if (remaining === 0) resolve();
          }
        });
      } catch {
        resolve();
      }
    });
  }

  const missingIds = idsToQueryFromIDB.filter((id) => !result.has(id) && !deletedImageIds.has(id));
  if (missingIds.length > 0) {
    const legacyDb = await openLegacyImageCacheDB();
    if (legacyDb && legacyDb.objectStoreNames.contains(LEGACY_STORE_NAME)) {
      await new Promise<void>((resolve) => {
        try {
          const tx = legacyDb.transaction(LEGACY_STORE_NAME, 'readonly');
          const store = tx.objectStore(LEGACY_STORE_NAME);
          let remaining = missingIds.length;

          missingIds.forEach((id) => {
            try {
              const req = store.get(id);
              req.onsuccess = () => {
                if (
                  !deletedImageIds.has(id) &&
                  typeof req.result === 'string' &&
                  req.result.length > 0
                ) {
                  memoryImageCache.set(id, req.result);
                  result.set(id, req.result);
                  setImageBlob(id, req.result).catch(() => {});
                }
                remaining -= 1;
                if (remaining === 0) resolve();
              };
              req.onerror = () => {
                remaining -= 1;
                if (remaining === 0) resolve();
              };
            } catch {
              remaining -= 1;
              if (remaining === 0) resolve();
            }
          });
        } catch {
          resolve();
        }
      });
    }
  }

  return result;
}
