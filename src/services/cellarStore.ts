/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Bottle, BottleConsumption, SlotId, StorageUnit, DEFAULT_STORAGE_UNITS, getZoneFromSlotId, normalizeVarietal, isSlotInUnit, parseSlotCoordinates, generateAllStagingSlots } from '../types/cellar';
import { getCuratedSeedBottles } from '../data/sampleBottles';
import { authService, AUTH_CHANGE_EVENT } from './authService';
import { AuthUser } from '../types/auth';
import { db, auth } from './firebase';
import { doc, setDoc, deleteDoc, getDocs, getDocsFromServer, collection, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { setImageBlob, saveImageBlob, getImageBlob, deleteImageBlob, batchGetImages, getSyncCachedImage } from './imageCacheStore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Diagnostic:', JSON.stringify(errInfo));
  return errInfo;
}

const STORAGE_KEY = 'cellarsync_inventory_v1';
const LISTEN_EVENT = 'cellarsync_storage_change';
const STORAGE_KEY_UNITS = 'cellarsync_storage_units_v1';
const LISTEN_EVENT_UNITS = 'cellarsync_storage_units_change';
const STORAGE_KEY_TOMBSTONES = 'cellarsync_tombstones_v1';
const STORAGE_KEY_HWM = 'cellarsync_hwm_v1';
const LISTEN_EVENT_HYDRATION = 'cellarsync_hydration_change';

// In-memory cache for all stored records across tenants
let cachedAllBottles: Bottle[] | null = null;
let cachedAllUnits: StorageUnit[] | null = null;
let cachedTombstones: Set<string> | null = null;
let cachedHighWaterMarks: Record<string, number> | null = null;
let activeHydrationPromise: Promise<void> | null = null;

// Auth-guarded queues for Firestore syncs requested before Firebase Auth finishes hydrating
const pendingBottleSyncs = new Map<string, Bottle>();
const pendingUnitSyncs = new Map<string, StorageUnit>();

// Track active tenant & cold-boot hydration gate state
let activeUser: AuthUser | null = authService.getCurrentUser();
let isHydratingState = true;

function setHydratingState(next: boolean) {
  if (isHydratingState === next) return;
  isHydratingState = next;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LISTEN_EVENT_HYDRATION, { detail: isHydratingState }));
  }
}

function loadHighWaterMarks(): Record<string, number> {
  if (cachedHighWaterMarks !== null) return cachedHighWaterMarks;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HWM);
    if (!raw) {
      const empty: Record<string, number> = {};
      cachedHighWaterMarks = empty;
      return empty;
    }
    const parsed = JSON.parse(raw);
    const resolved: Record<string, number> = parsed && typeof parsed === 'object' ? parsed : {};
    cachedHighWaterMarks = resolved;
    return resolved;
  } catch {
    const empty: Record<string, number> = {};
    cachedHighWaterMarks = empty;
    return empty;
  }
}

function saveHighWaterMarks(marks: Record<string, number>) {
  cachedHighWaterMarks = marks;
  try {
    localStorage.setItem(STORAGE_KEY_HWM, JSON.stringify(marks));
  } catch (err) {
    console.warn('Failed to save high-water marks:', err);
  }
}

export function getHighWaterMark(userId?: string): number {
  if (!userId) return 0;
  const marks = loadHighWaterMarks();
  return typeof marks[userId] === 'number' && marks[userId] > 0 ? marks[userId] : 0;
}

function updateHighWaterMark(userId: string | undefined, count: number, forceOverwrite = false) {
  if (!userId) return;
  const marks = loadHighWaterMarks();
  const current = marks[userId] || 0;
  if (forceOverwrite || count > current) {
    marks[userId] = Math.max(0, count);
    saveHighWaterMarks(marks);
  }
}

function loadTombstones(): Set<string> {
  if (cachedTombstones !== null) return cachedTombstones;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TOMBSTONES);
    if (!raw) {
      cachedTombstones = new Set<string>();
      return cachedTombstones;
    }
    const parsed = JSON.parse(raw);
    cachedTombstones = new Set<string>(Array.isArray(parsed) ? parsed : []);
    return cachedTombstones;
  } catch {
    cachedTombstones = new Set<string>();
    return cachedTombstones;
  }
}

function saveTombstones(tombstones: Set<string>) {
  cachedTombstones = tombstones;
  try {
    localStorage.setItem(STORAGE_KEY_TOMBSTONES, JSON.stringify(Array.from(tombstones)));
  } catch (err) {
    console.warn('Failed to save tombstones:', err);
  }
}

function addTombstone(bottleId: string) {
  const set = loadTombstones();
  set.add(bottleId);
  saveTombstones(set);
}

function removeTombstone(bottleId: string) {
  const set = loadTombstones();
  if (set.has(bottleId)) {
    set.delete(bottleId);
    saveTombstones(set);
  }
}

function loadRawUnits(): StorageUnit[] {
  if (cachedAllUnits !== null) return cachedAllUnits;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UNITS);
    if (!raw) {
      cachedAllUnits = DEFAULT_STORAGE_UNITS.map((u) => ({ ...u }));
      localStorage.setItem(STORAGE_KEY_UNITS, JSON.stringify(cachedAllUnits));
      return cachedAllUnits;
    }
    const parsed: StorageUnit[] = JSON.parse(raw);
    const units = Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_STORAGE_UNITS.map((u) => ({ ...u }));
    cachedAllUnits = units;
    return cachedAllUnits;
  } catch (err) {
    console.error('Failed to parse storage units:', err);
    cachedAllUnits = DEFAULT_STORAGE_UNITS.map((u) => ({ ...u }));
    return cachedAllUnits;
  }
}

function saveRawUnits(units: StorageUnit[]) {
  cachedAllUnits = units;
  try {
    localStorage.setItem(STORAGE_KEY_UNITS, JSON.stringify(units));
  } catch (err) {
    console.warn('Failed to save storage units:', err);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LISTEN_EVENT_UNITS, { detail: units }));
  }
}

function attachUpdatedAt<T extends Bottle>(bottle: T, iso?: string): T {
  const val = iso || bottle.updatedAt;
  if (val) {
    bottle.updatedAt = val;
  }
  return bottle;
}

/**
 * Normalizes a bottle record to partition referenceProfile, cellarNotes, and consumption
 * while strictly preserving existing imageUrl across visual modes.
 */
function normalizeBottleRecord(b: Bottle): { bottle: Bottle; changed: boolean } {
  let changed = false;
  const normalizedVarietal = normalizeVarietal(b.varietal, {
    region: b.region,
    country: b.country,
    wineName: b.wineName,
    producer: b.producer,
    style: b.style,
  });

  if (normalizedVarietal !== b.varietal) {
    changed = true;
  }

  const effectiveImageUrl = b.imageUrl || getSyncCachedImage(b.id);
  const resolvedVisualMode = b.visualMode || (effectiveImageUrl ? 'photo' : undefined);

  const result: Bottle = {
    ...b,
    country: typeof b.country === 'string' ? b.country : '',
    region: typeof b.region === 'string' ? b.region : '',
    varietal: normalizedVarietal,
    ...(effectiveImageUrl !== undefined ? { imageUrl: effectiveImageUrl } : {}),
    ...(resolvedVisualMode !== undefined ? { visualMode: resolvedVisualMode } : {}),
  };
  if (effectiveImageUrl === undefined) {
    delete result.imageUrl;
  }
  if (resolvedVisualMode === undefined) {
    delete result.visualMode;
  }
  attachUpdatedAt(result, b.updatedAt);

  if (result.status !== 'consumed') {
    if (!result.referenceProfile && result.tastingNotes && result.tastingNotes.trim() !== '') {
      result.referenceProfile = {
        source: 'Producer / AI Reference',
        notes: result.tastingNotes.trim(),
      };
      changed = true;
    }
    if (result.rating !== undefined) {
      delete result.rating;
      changed = true;
    }
  } else {
    if (!result.consumption) {
      result.consumption = {
        date: result.consumedAt || result.addedAt,
        rating: typeof result.rating === 'number' && result.rating > 0 ? result.rating : null,
        tastingNotes: result.tastingNotes || '',
      };
      changed = true;
    }
    if (result.id === 'bottle-seed-consumed-1' && !result.drinkingWindow) {
      result.drinkingWindow = '2022 - 2032';
      changed = true;
    }
    if (result.id === 'bottle-seed-consumed-2' && !result.drinkingWindow) {
      result.drinkingWindow = '2023 - 2035';
      changed = true;
    }
  }

  return { bottle: result, changed };
}

/**
 * Serializes bottle metadata to localStorage while stripping any `data:image/` Base64/WebP payloads
 * (allowing standard HTTP/HTTPS URLs to remain) so localStorage never throws QuotaExceededError.
 */
function serializeBottlesMetadataToLocalStorage(bottles: Bottle[]) {
  try {
    const metadataOnly = bottles.map((b) => {
      const copy: Record<string, any> = { ...b };
      if (typeof b.imageUrl === 'string' && b.imageUrl.startsWith('data:image/')) {
        setImageBlob(b.id, b.imageUrl).catch(() => {});
        copy.imageUrl = '';
      } else if (!b.imageUrl) {
        delete copy.imageUrl;
      }
      if (b.updatedAt) {
        copy.updatedAt = b.updatedAt;
      }
      return copy;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metadataOnly));
  } catch (err) {
    console.error('Failed to write lightweight bottle metadata to localStorage:', err);
  }
}

/**
 * Hydrates cachedAllBottles in place with Data URLs stored in IndexedDB (`imageCacheStore`).
 * Mutates cachedAllBottles in place so synchronous calls to CellarStore.getBottles() immediately
 * return hydrated imageUrl strings.
 */
async function hydrateImagesFromCache(): Promise<void> {
  if (activeHydrationPromise) {
    await activeHydrationPromise;
  }

  const current = cachedAllBottles;
  if (!current || current.length === 0) return;

  const runHydration = async () => {
    try {
      const targetBottles = cachedAllBottles;
      if (!targetBottles || targetBottles.length === 0) return;

      const idsToFetch = targetBottles.map((b) => b.id);
      const imageMap = await batchGetImages(idsToFetch);
      if (imageMap.size > 0 && cachedAllBottles) {
        let updatedAny = false;
        for (let i = 0; i < cachedAllBottles.length; i++) {
          const b = cachedAllBottles[i];
          const cachedImg = imageMap.get(b.id);
          if (cachedImg && !b.imageUrl) {
            b.imageUrl = cachedImg;
            if (!b.visualMode) {
              b.visualMode = 'photo';
            }
            updatedAny = true;
          }
        }

        if (updatedAny && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(LISTEN_EVENT, { detail: cachedAllBottles }));
        }
      }
    } catch (err) {
      console.warn('Failed to hydrate bottle images from IndexedDB:', err);
    }
  };

  activeHydrationPromise = runHydration();
  try {
    await activeHydrationPromise;
  } finally {
    activeHydrationPromise = null;
  }
}

function loadRawBottles(): Bottle[] {
  if (cachedAllBottles !== null) {
    // Synchronously ensure any in-memory cached images are attached in place
    for (let i = 0; i < cachedAllBottles.length; i++) {
      const b = cachedAllBottles[i];
      if (!b.imageUrl) {
        const syncImg = getSyncCachedImage(b.id);
        if (syncImg) {
          b.imageUrl = syncImg;
          if (!b.visualMode) {
            b.visualMode = 'photo';
          }
        }
      }
    }
    return cachedAllBottles;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedAllBottles = [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return cachedAllBottles;
    }
    const parsed: Bottle[] = JSON.parse(raw);
    let hadInlineDataImages = false;
    cachedAllBottles = (parsed || []).map((b) => {
      const { bottle } = normalizeBottleRecord(b);
      if (bottle.imageUrl) {
        if (bottle.imageUrl.startsWith('data:image/')) {
          hadInlineDataImages = true;
        }
        setImageBlob(bottle.id, bottle.imageUrl).catch(() => {});
      }
      return bottle;
    });

    // If user is on the curated sample set and missing the new cross-vintage archive seed bottles, append them
    const hasSeedConsumed1 = cachedAllBottles.some((b) => b.id === 'bottle-seed-consumed-1');
    const hasSeedConsumed4 = cachedAllBottles.some((b) => b.id === 'bottle-seed-consumed-4');
    if (hasSeedConsumed1 && !hasSeedConsumed4) {
      const seedUserId = cachedAllBottles.find((b) => b.id === 'bottle-seed-consumed-1')?.user_id;
      const freshSeeds = getCuratedSeedBottles().filter(
        (b) => b.id === 'bottle-seed-consumed-3' || b.id === 'bottle-seed-consumed-4'
      );
      freshSeeds.forEach((sb) => {
        cachedAllBottles!.push({ ...sb, user_id: seedUserId });
      });
    }

    // Ensure localStorage is immediately slimmed down if legacy inline data:image/ strings were present
    if (hadInlineDataImages) {
      serializeBottlesMetadataToLocalStorage(cachedAllBottles);
    }

    // Asynchronously hydrate images from IndexedDB into in-memory state in place
    hydrateImagesFromCache();

    return cachedAllBottles;
  } catch (err) {
    console.error('Failed to parse cellar storage:', err);
    cachedAllBottles = [];
    return cachedAllBottles;
  }
}

function saveRawBottles(bottles: Bottle[], options?: { allowShrinkForUser?: string }) {
  const tombstones = loadTombstones();

  // High-Water Mark Invariant Guard: never silently drop non-tombstoned bottles already in memory
  if (cachedAllBottles && cachedAllBottles !== bottles) {
    const incomingIds = new Set(bottles.map((b) => b.id));
    for (let i = 0; i < cachedAllBottles.length; i++) {
      const existing = cachedAllBottles[i];
      if (
        !incomingIds.has(existing.id) &&
        !tombstones.has(existing.id) &&
        (!options?.allowShrinkForUser || existing.user_id !== options.allowShrinkForUser)
      ) {
        bottles.push(existing);
        incomingIds.add(existing.id);
      }
    }
  }

  // Preserve or persist imageUrl blobs across all bottles in place
  for (let i = 0; i < bottles.length; i++) {
    const b = bottles[i];
    if (b.imageUrl) {
      setImageBlob(b.id, b.imageUrl).catch(() => {});
    } else {
      const syncImg = getSyncCachedImage(b.id);
      if (syncImg) {
        b.imageUrl = syncImg;
      }
    }
  }

  if (cachedAllBottles && cachedAllBottles !== bottles) {
    cachedAllBottles.length = 0;
    cachedAllBottles.push(...bottles);
  } else {
    cachedAllBottles = bottles;
  }

  if (activeUser?.uid) {
    const userCount = cachedAllBottles.filter(
      (b) => b.user_id === activeUser!.uid && !tombstones.has(b.id)
    ).length;
    updateHighWaterMark(activeUser.uid, userCount);
  }

  // Strip data:image/ URLs when serializing to localStorage so it never exceeds 5MB quota
  serializeBottlesMetadataToLocalStorage(cachedAllBottles);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LISTEN_EVENT, { detail: cachedAllBottles }));
  }
}

const ALLOWED_FIRESTORE_BOTTLE_KEYS = new Set([
  'id',
  'user_id',
  'producer',
  'wineName',
  'vintage',
  'varietal',
  'style',
  'region',
  'country',
  'subRegion',
  'appellation',
  'drinkFrom',
  'drinkUntil',
  'drinkingWindow',
  'alcoholPercent',
  'slotId',
  'previousSlotId',
  'status',
  'addedAt',
  'updatedAt',
  'consumedAt',
  'rating',
  'tastingNotes',
  'price',
  'abv',
  'volume',
  'visualMode',
  'imageUrl',
  'imageStoragePath',
  'foodPairing',
  'sommelierNote',
  'vivinoRating',
  'referenceProfile',
  'cellarNotes',
  'consumption',
]);

function sanitizeBottleForFirestore(bottle: Bottle): Record<string, any> {
  const raw = JSON.parse(JSON.stringify(bottle));
  const sanitized: Record<string, any> = {};
  for (const key of Object.keys(raw)) {
    if (ALLOWED_FIRESTORE_BOTTLE_KEYS.has(key) && raw[key] !== undefined) {
      sanitized[key] = raw[key];
    }
  }
  if (bottle.updatedAt) {
    sanitized.updatedAt = bottle.updatedAt;
  }
  if (!sanitized.imageUrl) {
    const cachedImg = getSyncCachedImage(bottle.id);
    if (cachedImg) {
      sanitized.imageUrl = cachedImg;
      if (!sanitized.visualMode) {
        sanitized.visualMode = 'photo';
      }
    }
  }
  sanitized.country = (typeof bottle.country === 'string' && bottle.country.trim() ? bottle.country : 'Unknown').slice(0, 128);
  sanitized.region = (typeof bottle.region === 'string' && bottle.region.trim() ? bottle.region : 'Unknown').slice(0, 256);
  sanitized.producer = (typeof bottle.producer === 'string' && bottle.producer.trim() ? bottle.producer : 'Unknown').slice(0, 256);
  if (bottle.wineName) {
    sanitized.wineName = String(bottle.wineName).slice(0, 256);
  } else {
    delete sanitized.wineName;
  }
  return sanitized;
}

async function syncBottleToFirestore(bottle: Bottle) {
  if (!bottle.user_id) return;
  if (loadTombstones().has(bottle.id)) {
    pendingBottleSyncs.delete(bottle.id);
    return;
  }

  await hydrateImagesFromCache();

  if (!bottle.imageUrl) {
    const cachedImg = await getImageBlob(bottle.id);
    if (cachedImg) {
      bottle.imageUrl = cachedImg;
      if (!bottle.visualMode) {
        bottle.visualMode = 'photo';
      }
    }
  }

  if (loadTombstones().has(bottle.id)) {
    pendingBottleSyncs.delete(bottle.id);
    return;
  }

  if (!auth.currentUser || auth.currentUser.uid !== bottle.user_id) {
    pendingBottleSyncs.set(bottle.id, bottle);
    return;
  }
  pendingBottleSyncs.delete(bottle.id);
  const path = `users/${bottle.user_id}/bottles/${bottle.id}`;
  try {
    const cleanBottle = sanitizeBottleForFirestore(bottle);
    await setDoc(doc(db, 'users', bottle.user_id, 'bottles', bottle.id), cleanBottle);
  } catch (e) {
    pendingBottleSyncs.set(bottle.id, bottle);
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

async function removeBottleFromFirestore(userId: string, bottleId: string) {
  pendingBottleSyncs.delete(bottleId);
  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  const path = `users/${userId}/bottles/${bottleId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'bottles', bottleId));
    removeTombstone(bottleId);
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, path);
  }
}

async function syncUnitToFirestore(unit: StorageUnit) {
  if (!unit.user_id) return;
  if (!auth.currentUser || auth.currentUser.uid !== unit.user_id) {
    pendingUnitSyncs.set(unit.id, unit);
    return;
  }
  pendingUnitSyncs.delete(unit.id);
  const path = `users/${unit.user_id}/storageUnits/${unit.id}`;
  try {
    const cleanUnit = JSON.parse(JSON.stringify(unit));
    await setDoc(doc(db, 'users', unit.user_id, 'storageUnits', unit.id), cleanUnit);
  } catch (e) {
    pendingUnitSyncs.set(unit.id, unit);
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

async function removeUnitFromFirestore(userId: string, unitId: string) {
  pendingUnitSyncs.delete(unitId);
  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  const path = `users/${userId}/storageUnits/${unitId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'storageUnits', unitId));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, path);
  }
}

async function flushPendingFirestoreSyncs(userId: string) {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return;

  await hydrateImagesFromCache();
  const tombstones = loadTombstones();

  const bottlesToSync = Array.from(pendingBottleSyncs.values()).filter((b) => {
    if (tombstones.has(b.id)) {
      pendingBottleSyncs.delete(b.id);
      return false;
    }
    return b.user_id === userId;
  });
  await Promise.allSettled(bottlesToSync.map((bottle) => syncBottleToFirestore(bottle)));

  const unitsToSync = Array.from(pendingUnitSyncs.values()).filter((u) => u.user_id === userId);
  await Promise.allSettled(unitsToSync.map((unit) => syncUnitToFirestore(unit)));
}

async function loadTenantFromFirestore(userId: string) {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return;
  }

  await hydrateImagesFromCache();
  await flushPendingFirestoreSyncs(userId);

  const bottlesPath = `users/${userId}/bottles`;
  const unitsPath = `users/${userId}/storageUnits`;
  const tombstones = loadTombstones();
  const hwm = getHighWaterMark(userId);

  try {
    const bottlesQuery = query(collection(db, 'users', userId, 'bottles'), where('user_id', '==', userId));
    let bottlesSnap = await getDocs(bottlesQuery);

    const allRawBefore = loadRawBottles();
    const localBottlesBefore = allRawBefore.filter((b) => b.user_id === userId && !tombstones.has(b.id));
    const expectedMinCount = Math.max(hwm, localBottlesBefore.length);

    // High-Water Mark Server Fetch Guard: if persistent local cache only has a partial subset (e.g., 1 bottle),
    // fetch directly from the server so a partial cache snapshot never masquerades as the full collection.
    if (
      (bottlesSnap.metadata?.fromCache && bottlesSnap.size < expectedMinCount) ||
      (bottlesSnap.size <= 1 && expectedMinCount > 1)
    ) {
      try {
        const serverSnap = await getDocsFromServer(bottlesQuery);
        if (serverSnap.size >= bottlesSnap.size) {
          bottlesSnap = serverSnap;
        }
      } catch {
        // Offline or unreachable; union merge below will still preserve all localBottles
      }
    }

    const cloudBottles: Bottle[] = [];
    const cloudBottlesById = new Map<string, Bottle>();
    bottlesSnap.forEach((d) => {
      const { bottle } = normalizeBottleRecord(d.data() as Bottle);
      cloudBottles.push(bottle);
      cloudBottlesById.set(bottle.id, bottle);
    });

    const allRaw = loadRawBottles();
    const otherTenantBottles = allRaw.filter((b) => b.user_id !== userId);
    const localBottles = allRaw.filter((b) => b.user_id === userId);

    // Ensure any IndexedDB cached images are attached before merging
    const allCandidateIds = Array.from(
      new Set([...localBottles.map((b) => b.id), ...cloudBottles.map((b) => b.id)])
    );
    const cachedImageMap = await batchGetImages(allCandidateIds);

    const mergedMap = new Map<string, Bottle>();

    // 1. Seed with active local bottles (unless tombstoned)
    for (const localB of localBottles) {
      if (!tombstones.has(localB.id)) {
        const cachedImg = cachedImageMap.get(localB.id);
        if (!localB.imageUrl && cachedImg) {
          localB.imageUrl = cachedImg;
          if (!localB.visualMode) {
            localB.visualMode = 'photo';
          }
        }
        mergedMap.set(localB.id, localB);
      }
    }

    // 2. Reconcile cloud bottles non-destructively
    for (const cloudB of cloudBottles) {
      if (tombstones.has(cloudB.id)) {
        // Retry pending cloud deletion and remove from tombstones on confirmation
        deleteDoc(doc(db, 'users', userId, 'bottles', cloudB.id))
          .then(() => removeTombstone(cloudB.id))
          .catch(() => {});
        continue;
      }

      const localB = mergedMap.get(cloudB.id);
      if (!localB) {
        const effectiveCloudImage = cloudB.imageUrl || cachedImageMap.get(cloudB.id);
        mergedMap.set(
          cloudB.id,
          attachUpdatedAt(
            {
              ...cloudB,
              ...(effectiveCloudImage !== undefined ? { imageUrl: effectiveCloudImage } : {}),
              ...(cloudB.visualMode || effectiveCloudImage
                ? { visualMode: cloudB.visualMode || 'photo' }
                : {}),
            },
            cloudB.updatedAt
          )
        );
      } else {
        const localTs = Date.parse(localB.updatedAt || localB.addedAt || '1970-01-01');
        const cloudTs = Date.parse(cloudB.updatedAt || cloudB.addedAt || '1970-01-01');
        const winner = cloudTs >= localTs ? cloudB : localB;
        const effectiveImage =
          cloudB.imageUrl || localB.imageUrl || winner.imageUrl || cachedImageMap.get(cloudB.id);
        mergedMap.set(
          cloudB.id,
          attachUpdatedAt(
            {
              ...winner,
              ...(effectiveImage !== undefined ? { imageUrl: effectiveImage } : {}),
              ...(winner.visualMode || effectiveImage
                ? { visualMode: winner.visualMode || 'photo' }
                : {}),
            },
            winner.updatedAt || localB.updatedAt || cloudB.updatedAt
          )
        );
      }
    }

    const mergedUserBottles = Array.from(mergedMap.values()).filter((b) => !tombstones.has(b.id));

    // High-Water Mark Sync Guard: never overwrite local inventory if merged result drops below non-tombstoned local count
    const nonTombstonedLocalCount = localBottles.filter((b) => !tombstones.has(b.id)).length;
    if (mergedUserBottles.length >= nonTombstonedLocalCount) {
      updateHighWaterMark(userId, mergedUserBottles.length);
      saveRawBottles([...mergedUserBottles, ...otherTenantBottles]);
    }

    // Release cold-boot hydration gate immediately once merged inventory is in memory
    setHydratingState(false);

    // 3. Backfill local-only or newer local bottles to Firestore asynchronously
    const backfillPromises: Promise<void>[] = [];
    for (const mergedB of mergedUserBottles) {
      if (tombstones.has(mergedB.id)) continue;
      const cloudB = cloudBottlesById.get(mergedB.id);
      if (!cloudB) {
        backfillPromises.push(syncBottleToFirestore(mergedB));
      } else {
        const cloudTs = Date.parse(cloudB.updatedAt || cloudB.addedAt || '1970-01-01');
        const mergedTs = Date.parse(mergedB.updatedAt || mergedB.addedAt || '1970-01-01');
        const cloudMissingImage = Boolean(mergedB.imageUrl && !cloudB.imageUrl);
        if (mergedTs > cloudTs || cloudMissingImage) {
          backfillPromises.push(syncBottleToFirestore(mergedB));
        }
      }
    }
    if (backfillPromises.length > 0) {
      Promise.allSettled(backfillPromises).catch(() => {});
    }
  } catch (err) {
    setHydratingState(false);
    handleFirestoreError(err, OperationType.LIST, bottlesPath);
  }

  try {
    const unitsQuery = query(collection(db, 'users', userId, 'storageUnits'), where('user_id', '==', userId));
    const unitsSnap = await getDocs(unitsQuery);
    if (!unitsSnap.empty) {
      const cloudUnits: StorageUnit[] = [];
      const cloudUnitIds = new Set<string>();
      unitsSnap.forEach((d) => {
        const u = d.data() as StorageUnit;
        cloudUnits.push(u);
        cloudUnitIds.add(u.id);
      });

      const allUnits = loadRawUnits();
      const otherTenantUnits = allUnits.filter((u) => u.user_id !== userId);
      const localUserUnits = allUnits.filter((u) => u.user_id === userId);

      const unitMap = new Map<string, StorageUnit>();
      localUserUnits.forEach((u) => unitMap.set(u.id, u));
      cloudUnits.forEach((cu) => unitMap.set(cu.id, cu));

      const mergedUserUnits = Array.from(unitMap.values());
      saveRawUnits([...mergedUserUnits, ...otherTenantUnits]);

      mergedUserUnits.forEach((u) => {
        if (!cloudUnitIds.has(u.id)) {
          syncUnitToFirestore(u);
        }
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, unitsPath);
  }
}

/**
 * Executes multi-tenant isolation and legacy data claim logic
 */
export function syncTenantData(user: AuthUser | null) {
  activeUser = user;
  if (!user) {
    loadRawBottles();
    loadRawUnits();
    setHydratingState(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(LISTEN_EVENT, { detail: [] }));
      window.dispatchEvent(new CustomEvent(LISTEN_EVENT_UNITS, { detail: [] }));
    }
    return;
  }

  setHydratingState(true);
  const allUnits = loadRawUnits();
  const allBottles = loadRawBottles();
  const tombstones = loadTombstones();
  const isStockmanster = user.email.trim().toLowerCase() === 'stockmanster@gmail.com';
  const claimedBottlesForCloudSync: Bottle[] = [];

  if (isStockmanster) {
    const isLegacyOrStockmansterRecord = (recordUid?: string) =>
      !recordUid ||
      recordUid === 'usr_stockmanster_legacy' ||
      recordUid === 'usr_google_stockmanster_gmail_com' ||
      recordUid === 'google_stockmanster_gmail_com';

    // 1. Silent automatic claim of unassigned or legacy stockmanster production bottles
    let bottlesClaimed = false;
    allBottles.forEach((b) => {
      if (!tombstones.has(b.id) && isLegacyOrStockmansterRecord(b.user_id) && b.user_id !== user.uid) {
        b.user_id = user.uid;
        bottlesClaimed = true;
        claimedBottlesForCloudSync.push(b);
      }
    });
    if (bottlesClaimed) {
      saveRawBottles(allBottles);
    }

    // 2. Silent automatic claim of unassigned or legacy stockmanster storage units
    let unitsClaimed = false;
    allUnits.forEach((u) => {
      if (isLegacyOrStockmansterRecord(u.user_id) && u.user_id !== user.uid) {
        u.user_id = user.uid;
        unitsClaimed = true;
        syncUnitToFirestore(u);
      }
    });

    // Check if stockmanster now has racks; do not generate duplicate default racks if legacy racks exist
    const userUnits = allUnits.filter((u) => u.user_id === user.uid);
    if (userUnits.length === 0) {
      const defaultUnits: StorageUnit[] = [
        {
          id: `rack-a-${user.uid}`,
          user_id: user.uid,
          name: 'Rack A',
          columns: 4,
          rows: 12,
          is_staging: false,
          sort_order: 1,
        },
        {
          id: `rack-b-${user.uid}`,
          user_id: user.uid,
          name: 'Rack B',
          columns: 4,
          rows: 12,
          is_staging: false,
          sort_order: 2,
        },
        {
          id: `staging-${user.uid}`,
          user_id: user.uid,
          name: 'Staging Shelf',
          columns: 4,
          rows: 3,
          is_staging: true,
          sort_order: 3,
        },
      ];
      allUnits.push(...defaultUnits);
      defaultUnits.forEach((u) => syncUnitToFirestore(u));
      unitsClaimed = true;
    }

    if (unitsClaimed) {
      saveRawUnits(allUnits);
    }
  } else {
    // Other accounts: Leave unassigned rows untouched and provision fresh, empty default racks
    let unitsProvisioned = false;
    const userUnits = allUnits.filter((u) => u.user_id === user.uid);
    if (userUnits.length === 0) {
      const defaultUnits: StorageUnit[] = [
        {
          id: `rack-a-${user.uid}`,
          user_id: user.uid,
          name: 'Rack A',
          columns: 4,
          rows: 12,
          is_staging: false,
          sort_order: 1,
        },
        {
          id: `rack-b-${user.uid}`,
          user_id: user.uid,
          name: 'Rack B',
          columns: 4,
          rows: 12,
          is_staging: false,
          sort_order: 2,
        },
        {
          id: `staging-${user.uid}`,
          user_id: user.uid,
          name: 'Staging Shelf',
          columns: 4,
          rows: 3,
          is_staging: true,
          sort_order: 3,
        },
      ];
      allUnits.push(...defaultUnits);
      defaultUnits.forEach((u) => syncUnitToFirestore(u));
      unitsProvisioned = true;
    }

    if (unitsProvisioned) {
      saveRawUnits(allUnits);
    }
  }

  // Notify components of updated tenant state immediately
  const currentBottles = loadRawBottles().filter((b) => b.user_id === user.uid && !tombstones.has(b.id));
  updateHighWaterMark(user.uid, currentBottles.length);

  const currentUnits = loadRawUnits()
    .filter((u) => u.user_id === user.uid)
    .sort((a, b) => a.sort_order - b.sort_order);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LISTEN_EVENT, { detail: currentBottles }));
    window.dispatchEvent(new CustomEvent(LISTEN_EVENT_UNITS, { detail: currentUnits }));
  }

  // 3.5s safety threshold to guarantee cold-boot hydration gate always releases
  const safetyTimer = setTimeout(() => setHydratingState(false), 3500);

  // Await image hydration from IndexedDB and initial loadTenantFromFirestore before releasing isHydrating
  (async () => {
    try {
      await hydrateImagesFromCache();
      if (!auth.currentUser && typeof (auth as any).authStateReady === 'function') {
        await Promise.race([
          (auth as any).authStateReady(),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
      }
      if (claimedBottlesForCloudSync.length > 0) {
        await Promise.allSettled(claimedBottlesForCloudSync.map((claimedB) => syncBottleToFirestore(claimedB)));
      }
      await loadTenantFromFirestore(user.uid);
    } finally {
      clearTimeout(safetyTimer);
      setHydratingState(false);
    }
  })();
}

export const CellarStore = {
  /** Reset in-memory caches (used by automated self-test suite) */
  resetMemoryCache() {
    cachedAllBottles = null;
    cachedAllUnits = null;
    cachedTombstones = null;
    cachedHighWaterMarks = null;
    isHydratingState = false;
  },

  isHydrating(): boolean {
    return isHydratingState;
  },

  setCurrentUser(user: AuthUser | null) {
    syncTenantData(user);
  },

  getCurrentUserId(): string | undefined {
    return activeUser?.uid;
  },

  getBottles(): Bottle[] {
    const currentUid = activeUser?.uid;
    if (!currentUid) return [];
    const tombstones = loadTombstones();
    return loadRawBottles().filter((b) => b.user_id === currentUid && !tombstones.has(b.id));
  },

  getActiveBottles(): Bottle[] {
    return this.getBottles().filter((b) => b.status === 'in-cellar' || b.status === 'staging');
  },

  getConsumedBottles(): Bottle[] {
    return this.getBottles().filter((b) => b.status === 'consumed');
  },

  getBottleBySlot(slotId: SlotId): Bottle | undefined {
    return this.getBottles().find(
      (b) => b.slotId === slotId && (b.status === 'in-cellar' || b.status === 'staging')
    );
  },

  getBottleById(id: string): Bottle | undefined {
    return this.getBottles().find((b) => b.id === id);
  },

  addBottle(data: Omit<Bottle, 'id' | 'addedAt' | 'status'> & { slotId?: SlotId }): Bottle {
    const currentUid = activeUser?.uid;
    const allBottles = [...loadRawBottles()];
    const zone = getZoneFromSlotId(data.slotId);
    const status = zone === 'Staging Shelf' ? 'staging' : data.slotId ? 'in-cellar' : 'staging';
    const nowIso = new Date().toISOString();

    // If target slot is already occupied by this user, displace existing to staging
    if (data.slotId) {
      const existingIdx = allBottles.findIndex(
        (b) => b.user_id === currentUid && b.slotId === data.slotId && (b.status === 'in-cellar' || b.status === 'staging')
      );
      if (existingIdx !== -1) {
        allBottles[existingIdx] = attachUpdatedAt(
          {
            ...allBottles[existingIdx],
            slotId: undefined,
            status: 'staging',
          },
          nowIso
        );
        syncBottleToFirestore(allBottles[existingIdx]);
      }
    }

    const referenceProfile =
      data.referenceProfile ||
      (data.tastingNotes && data.tastingNotes.trim() !== ''
        ? {
            source: 'Producer / AI Reference',
            notes: data.tastingNotes.trim(),
          }
        : undefined);

    const hasNonEmptyImage = typeof data.imageUrl === 'string' && data.imageUrl.trim().length > 0;
    const resolvedVisualMode = data.visualMode !== undefined ? data.visualMode : hasNonEmptyImage ? 'photo' : undefined;

    const newBottle: Bottle = attachUpdatedAt(
      {
        ...data,
        user_id: currentUid,
        ...(resolvedVisualMode !== undefined ? { visualMode: resolvedVisualMode } : {}),
        varietal: normalizeVarietal(data.varietal, {
          region: data.region,
          country: data.country,
          wineName: data.wineName,
          producer: data.producer,
          style: data.style,
        }),
        referenceProfile,
        cellarNotes: data.cellarNotes && data.cellarNotes.trim() !== '' ? data.cellarNotes.trim() : undefined,
        id: `bottle-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        addedAt: nowIso,
        status,
      },
      nowIso
    );

    removeTombstone(newBottle.id);
    if (newBottle.imageUrl) {
      saveImageBlob(newBottle.id, newBottle.imageUrl).catch(() => {});
    }

    saveRawBottles([newBottle, ...allBottles]);
    syncBottleToFirestore(newBottle);
    return newBottle;
  },

  addBottlesBatch(items: Array<Omit<Bottle, 'id' | 'addedAt' | 'status'> & { slotId?: SlotId }>): Bottle[] {
    const currentUid = activeUser?.uid;
    const allBottles = [...loadRawBottles()];
    const createdBottles: Bottle[] = [];

    const nowIso = new Date().toISOString();
    const timestamp = Date.now();

    items.forEach((data, index) => {
      const zone = getZoneFromSlotId(data.slotId);
      const status = zone === 'Staging Shelf' ? 'staging' : data.slotId ? 'in-cellar' : 'staging';

      // Displace if slot occupied
      if (data.slotId) {
        const existingIdx = allBottles.findIndex(
          (b) => b.user_id === currentUid && b.slotId === data.slotId && (b.status === 'in-cellar' || b.status === 'staging')
        );
        if (existingIdx !== -1) {
          allBottles[existingIdx] = attachUpdatedAt(
            {
              ...allBottles[existingIdx],
              slotId: undefined,
              status: 'staging',
            },
            nowIso
          );
          syncBottleToFirestore(allBottles[existingIdx]);
        }
      }

      const referenceProfile =
        data.referenceProfile ||
        (data.tastingNotes && data.tastingNotes.trim() !== ''
          ? {
              source: 'Producer / AI Reference',
              notes: data.tastingNotes.trim(),
            }
          : undefined);

      const hasNonEmptyImage = typeof data.imageUrl === 'string' && data.imageUrl.trim().length > 0;
      const resolvedVisualMode = data.visualMode !== undefined ? data.visualMode : hasNonEmptyImage ? 'photo' : undefined;

      const newBottle: Bottle = attachUpdatedAt(
        {
          ...data,
          user_id: currentUid,
          ...(resolvedVisualMode !== undefined ? { visualMode: resolvedVisualMode } : {}),
          varietal: normalizeVarietal(data.varietal, {
            region: data.region,
            country: data.country,
            wineName: data.wineName,
            producer: data.producer,
            style: data.style,
          }),
          referenceProfile,
          cellarNotes: data.cellarNotes && data.cellarNotes.trim() !== '' ? data.cellarNotes.trim() : undefined,
          id: `bottle-${timestamp}-${index}-${Math.random().toString(36).substring(2, 7)}`,
          addedAt: nowIso,
          status,
        },
        nowIso
      );

      removeTombstone(newBottle.id);
      if (newBottle.imageUrl) {
        saveImageBlob(newBottle.id, newBottle.imageUrl).catch(() => {});
      }
      createdBottles.push(newBottle);
    });

    saveRawBottles([...createdBottles, ...allBottles]);
    createdBottles.forEach((b) => syncBottleToFirestore(b));
    return createdBottles;
  },

  consumeBottle(
    bottleId: string,
    consumptionOrNotes?: { date?: string; rating?: number | null; tastingNotes?: string } | string,
    legacyRating?: number | null
  ): Bottle | null {
    const currentUid = activeUser?.uid;
    const allBottles = loadRawBottles();
    const idx = allBottles.findIndex((b) => b.id === bottleId && b.user_id === currentUid);
    if (idx === -1) return null;

    const target = allBottles[idx];
    const nowIso = new Date().toISOString();

    let resolvedDate = nowIso;
    let resolvedRating: number | null = null;
    let resolvedNotes = '';

    if (typeof consumptionOrNotes === 'object' && consumptionOrNotes !== null) {
      if (consumptionOrNotes.date) {
        const parsedDate = consumptionOrNotes.date.includes('T')
          ? new Date(consumptionOrNotes.date)
          : new Date(`${consumptionOrNotes.date}T12:00:00`);
        resolvedDate = !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : nowIso;
      }
      resolvedRating =
        typeof consumptionOrNotes.rating === 'number' && consumptionOrNotes.rating >= 0.5
          ? Math.min(5, Math.max(0.5, Math.round(consumptionOrNotes.rating * 2) / 2))
          : null;
      resolvedNotes = (consumptionOrNotes.tastingNotes || '').trim();
    } else {
      resolvedNotes = typeof consumptionOrNotes === 'string' ? consumptionOrNotes.trim() : '';
      resolvedRating =
        typeof legacyRating === 'number' && legacyRating >= 0.5
          ? Math.min(5, Math.max(0.5, Math.round(legacyRating * 2) / 2))
          : null;
    }

    const preservedReference =
      target.referenceProfile ||
      (target.tastingNotes && target.tastingNotes.trim() !== ''
        ? {
            source: 'Producer / AI Reference',
            notes: target.tastingNotes.trim(),
          }
        : undefined);

    const consumption: BottleConsumption = {
      date: resolvedDate,
      rating: resolvedRating,
      tastingNotes: resolvedNotes,
    };

    const updated: Bottle = attachUpdatedAt(
      {
        ...target,
        previousSlotId: target.slotId || target.previousSlotId,
        slotId: undefined,
        status: 'consumed',
        consumedAt: resolvedDate,
        referenceProfile: preservedReference,
        consumption,
        tastingNotes: resolvedNotes || undefined,
        rating: resolvedRating !== null ? resolvedRating : undefined,
      },
      nowIso
    );

    allBottles[idx] = updated;
    saveRawBottles([...allBottles]);
    syncBottleToFirestore(updated);
    return updated;
  },

  unconsumeBottle(bottleId: string, preferredSlotId?: SlotId): Bottle | null {
    const currentUid = activeUser?.uid;
    const allBottles = loadRawBottles();
    const idx = allBottles.findIndex((b) => b.id === bottleId && b.user_id === currentUid);
    if (idx === -1) return null;

    const target = allBottles[idx];
    const desiredSlot = preferredSlotId || target.previousSlotId;
    const nowIso = new Date().toISOString();

    const isSlotOccupied = (slot: SlotId) =>
      allBottles.some(
        (b) =>
          b.user_id === currentUid &&
          b.id !== bottleId &&
          b.slotId === slot &&
          (b.status === 'in-cellar' || b.status === 'staging')
      );

    let finalSlotId: SlotId;
    if (desiredSlot && !isSlotOccupied(desiredSlot)) {
      finalSlotId = desiredSlot;
    } else {
      const stagingSlots = generateAllStagingSlots();
      const freeStaging = stagingSlots.find((s) => !isSlotOccupied(s));
      finalSlotId = freeStaging || 'S-01';
    }

    const zone = getZoneFromSlotId(finalSlotId);
    const status = zone === 'Staging Shelf' ? 'staging' : 'in-cellar';

    const updated: Bottle = attachUpdatedAt(
      {
        ...target,
        slotId: finalSlotId,
        previousSlotId: undefined,
        status,
        consumedAt: undefined,
        consumption: undefined,
        rating: undefined,
        tastingNotes: target.referenceProfile?.notes || undefined,
      },
      nowIso
    );

    allBottles[idx] = updated;
    saveRawBottles([...allBottles]);
    syncBottleToFirestore(updated);
    return updated;
  },

  moveBottle(bottleId: string, newSlotId: SlotId): { success: boolean; displacedBottle?: Bottle } {
    const currentUid = activeUser?.uid;
    const allBottles = [...loadRawBottles()];
    const sourceIdx = allBottles.findIndex((b) => b.id === bottleId && b.user_id === currentUid);
    if (sourceIdx === -1) return { success: false };

    const source = allBottles[sourceIdx];
    const oldSlot = source.slotId;
    const nowIso = new Date().toISOString();

    const occupiedIdx = allBottles.findIndex(
      (b) => b.user_id === currentUid && b.slotId === newSlotId && b.id !== bottleId && (b.status === 'in-cellar' || b.status === 'staging')
    );

    let displaced: Bottle | undefined = undefined;

    if (occupiedIdx !== -1) {
      displaced = allBottles[occupiedIdx];
      if (oldSlot) {
        allBottles[occupiedIdx] = attachUpdatedAt(
          {
            ...displaced,
            slotId: oldSlot,
            status: getZoneFromSlotId(oldSlot) === 'Staging Shelf' ? 'staging' : 'in-cellar',
          },
          nowIso
        );
      } else {
        allBottles[occupiedIdx] = attachUpdatedAt(
          {
            ...displaced,
            slotId: undefined,
            status: 'staging',
          },
          nowIso
        );
      }
      syncBottleToFirestore(allBottles[occupiedIdx]);
    }

    const zone = getZoneFromSlotId(newSlotId);
    allBottles[sourceIdx] = attachUpdatedAt(
      {
        ...source,
        slotId: newSlotId,
        status: zone === 'Staging Shelf' ? 'staging' : 'in-cellar',
      },
      nowIso
    );

    saveRawBottles(allBottles);
    syncBottleToFirestore(allBottles[sourceIdx]);
    return { success: true, displacedBottle: displaced };
  },

  updateBottle(bottleId: string, patch: Partial<Omit<Bottle, 'id' | 'addedAt'>>): Bottle | null {
    const currentUid = activeUser?.uid;
    const allBottles = loadRawBottles();
    const idx = allBottles.findIndex((b) => b.id === bottleId && b.user_id === currentUid);
    if (idx === -1) return null;

    const target = allBottles[idx];
    const nowIso = new Date().toISOString();

    const hasPatchImage = typeof patch.imageUrl === 'string' && patch.imageUrl.trim().length > 0;
    const resolvedVisualMode =
      patch.visualMode !== undefined
        ? patch.visualMode
        : hasPatchImage
        ? 'photo'
        : target.visualMode;

    const preservedImageUrl =
      'imageUrl' in patch
        ? hasPatchImage
          ? patch.imageUrl
          : undefined
        : target.imageUrl || getSyncCachedImage(bottleId);

    const updated: Bottle = attachUpdatedAt(
      {
        ...target,
        ...patch,
        ...(preservedImageUrl !== undefined ? { imageUrl: preservedImageUrl } : {}),
        ...(resolvedVisualMode !== undefined ? { visualMode: resolvedVisualMode } : {}),
        varietal:
          patch.varietal !== undefined
            ? normalizeVarietal(patch.varietal, {
                region: patch.region || target.region,
                country: patch.country || target.country,
                wineName: patch.wineName || target.wineName,
                producer: patch.producer || target.producer,
                style: patch.style || target.style,
              })
            : target.varietal,
        status: patch.status || (patch.slotId ? (getZoneFromSlotId(patch.slotId) === 'Staging Shelf' ? 'staging' : 'in-cellar') : target.status),
      },
      nowIso
    );
    if (preservedImageUrl === undefined) {
      delete updated.imageUrl;
    }
    if (resolvedVisualMode === undefined) {
      delete updated.visualMode;
    }

    if ('imageUrl' in patch) {
      if (hasPatchImage && patch.imageUrl) {
        setImageBlob(bottleId, patch.imageUrl).catch(() => {});
      } else {
        deleteImageBlob(bottleId).catch(() => {});
      }
    }

    allBottles[idx] = updated;
    saveRawBottles([...allBottles]);
    syncBottleToFirestore(updated);
    return updated;
  },

  removePhoto(bottleId: string): Bottle | null {
    deleteImageBlob(bottleId).catch(() => {});
    return this.updateBottle(bottleId, {
      imageUrl: undefined,
      imageStoragePath: undefined,
      visualMode: 'generated',
    });
  },

  deleteBottle(bottleId: string) {
    const currentUid = activeUser?.uid;
    addTombstone(bottleId);
    deleteImageBlob(bottleId).catch(() => {});
    const allBottles = loadRawBottles().filter((b) => b.id !== bottleId);
    if (currentUid) {
      const newCount = allBottles.filter((b) => b.user_id === currentUid).length;
      updateHighWaterMark(currentUid, newCount, true);
    }
    saveRawBottles(allBottles, { allowShrinkForUser: currentUid });
    if (currentUid) {
      removeBottleFromFirestore(currentUid, bottleId);
    }
  },

  seedSampleInventory(): Bottle[] {
    const currentUid = activeUser?.uid;
    if (!currentUid) return [];
    const nowIso = new Date().toISOString();
    const seeds = getCuratedSeedBottles().map((b) => {
      removeTombstone(b.id);
      return attachUpdatedAt(
        {
          ...b,
          user_id: currentUid,
        },
        nowIso
      );
    });
    const otherBottles = loadRawBottles().filter((b) => b.user_id !== currentUid);
    saveRawBottles([...seeds, ...otherBottles]);
    seeds.forEach((b) => syncBottleToFirestore(b));
    return seeds;
  },

  clearCellar() {
    const currentUid = activeUser?.uid;
    if (!currentUid) {
      saveRawBottles([]);
      return;
    }
    const userBottles = loadRawBottles().filter((b) => b.user_id === currentUid);
    const remaining = loadRawBottles().filter((b) => b.user_id !== currentUid);
    userBottles.forEach((b) => {
      addTombstone(b.id);
      deleteImageBlob(b.id).catch(() => {});
      removeBottleFromFirestore(currentUid, b.id);
    });
    updateHighWaterMark(currentUid, 0, true);
    saveRawBottles(remaining, { allowShrinkForUser: currentUid });
  },

  exportJSON(): string {
    return JSON.stringify(this.getBottles(), null, 2);
  },

  importJSON(jsonString: string): boolean {
    const currentUid = activeUser?.uid;
    if (!currentUid) return false;
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        const nowIso = new Date().toISOString();
        const tagged = parsed.map((b) => {
          removeTombstone(b.id);
          if (b.imageUrl) {
            saveImageBlob(b.id, b.imageUrl).catch(() => {});
          }
          return attachUpdatedAt(
            {
              ...b,
              user_id: currentUid,
            },
            b.updatedAt || nowIso
          );
        });
        const otherBottles = loadRawBottles().filter((b) => b.user_id !== currentUid);
        saveRawBottles([...tagged, ...otherBottles]);
        tagged.forEach((b) => syncBottleToFirestore(b));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  getStorageUnits(): StorageUnit[] {
    const currentUid = activeUser?.uid;
    if (!currentUid) return [];
    const allUnits = loadRawUnits();
    let userUnits = allUnits.filter((u) => u.user_id === currentUid);

    if (userUnits.length === 0) {
      const defaultUnits: StorageUnit[] = [
        {
          id: `rack-a-${currentUid}`,
          user_id: currentUid,
          name: 'Rack A',
          columns: 4,
          rows: 12,
          is_staging: false,
          sort_order: 1,
        },
        {
          id: `rack-b-${currentUid}`,
          user_id: currentUid,
          name: 'Rack B',
          columns: 4,
          rows: 12,
          is_staging: false,
          sort_order: 2,
        },
        {
          id: `staging-${currentUid}`,
          user_id: currentUid,
          name: 'Staging Shelf',
          columns: 4,
          rows: 3,
          is_staging: true,
          sort_order: 3,
        },
      ];
      allUnits.push(...defaultUnits);
      saveRawUnits(allUnits);
      userUnits = defaultUnits;
    }

    return userUnits.sort((a, b) => a.sort_order - b.sort_order);
  },

  getUnitById(id: string): StorageUnit | undefined {
    return this.getStorageUnits().find((u) => u.id === id);
  },

  addStorageUnit(data: { name: string; columns: number; rows: number }): StorageUnit {
    const currentUid = activeUser?.uid;
    const allUnits = [...loadRawUnits()];
    const userUnits = allUnits.filter((u) => u.user_id === currentUid);
    const cols = Math.max(1, Math.min(12, Math.round(Number(data.columns) || 4)));
    const rows = Math.max(1, Math.min(25, Math.round(Number(data.rows) || 12)));
    const count = userUnits.filter((u) => !u.is_staging).length + 1;
    const name = data.name.trim() || `Rack ${count}`;

    const newUnit: StorageUnit = {
      id: `unit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: currentUid,
      name,
      columns: cols,
      rows,
      is_staging: false,
      sort_order: userUnits.length + 1,
    };

    saveRawUnits([...allUnits, newUnit]);
    syncUnitToFirestore(newUnit);
    return newUnit;
  },

  canResizeUnit(
    unitId: string,
    newCols: number,
    newRows: number
  ): { canResize: boolean; outOfBoundsCount: number; message?: string } {
    const unit = this.getStorageUnits().find((u) => u.id === unitId);
    if (!unit) return { canResize: false, outOfBoundsCount: 0, message: 'Unit not found' };
    if (unit.is_staging) return { canResize: false, outOfBoundsCount: 0, message: 'Staging shelf cannot be resized' };

    const bottles = this.getBottles().filter(
      (b) => (b.status === 'in-cellar' || b.status === 'staging') && isSlotInUnit(b.slotId, unit)
    );

    const outOfBounds = bottles.filter((b) => {
      const coords = parseSlotCoordinates(b.slotId);
      if (!coords || coords.isStaging) return false;
      return coords.row > newRows || coords.col > newCols;
    });

    if (outOfBounds.length > 0) {
      return {
        canResize: false,
        outOfBoundsCount: outOfBounds.length,
        message: `Cannot resize: ${outOfBounds.length} bottle(s) currently occupy slots beyond Row ${newRows} or Col ${newCols}. Please move them to the Staging Shelf first.`,
      };
    }

    return { canResize: true, outOfBoundsCount: 0 };
  },

  updateStorageUnit(
    id: string,
    patch: { name?: string; columns?: number; rows?: number }
  ): { success: boolean; unit?: StorageUnit; error?: string } {
    const currentUid = activeUser?.uid;
    const allUnits = [...loadRawUnits()];
    const idx = allUnits.findIndex((u) => u.id === id && u.user_id === currentUid);
    if (idx === -1) return { success: false, error: 'Storage unit not found.' };

    const unit = allUnits[idx];
    if (unit.is_staging) {
      if (patch.name) {
        allUnits[idx] = { ...unit, name: patch.name.trim() };
        saveRawUnits(allUnits);
        syncUnitToFirestore(allUnits[idx]);
        return { success: true, unit: allUnits[idx] };
      }
      return { success: false, error: 'Staging shelf dimensions are fixed.' };
    }

    const targetCols = patch.columns !== undefined ? Math.max(1, Math.min(12, Math.round(patch.columns))) : unit.columns;
    const targetRows = patch.rows !== undefined ? Math.max(1, Math.min(25, Math.round(patch.rows))) : unit.rows;

    const resizeCheck = CellarStore.canResizeUnit(id, targetCols, targetRows);
    if (!resizeCheck.canResize) {
      return { success: false, error: resizeCheck.message };
    }

    allUnits[idx] = {
      ...unit,
      name: patch.name !== undefined ? patch.name.trim() || unit.name : unit.name,
      columns: targetCols,
      rows: targetRows,
    };

    saveRawUnits(allUnits);
    syncUnitToFirestore(allUnits[idx]);
    return { success: true, unit: allUnits[idx] };
  },

  canDeleteUnit(unitId: string): { canDelete: boolean; bottleCount: number; message?: string } {
    const unit = this.getStorageUnits().find((u) => u.id === unitId);
    if (!unit) return { canDelete: false, bottleCount: 0, message: 'Unit not found' };
    if (unit.is_staging) {
      return { canDelete: false, bottleCount: 0, message: 'The Staging Shelf is permanent and cannot be deleted.' };
    }

    const bottlesInUnit = this.getBottles().filter(
      (b) => (b.status === 'in-cellar' || b.status === 'staging') && isSlotInUnit(b.slotId, unit)
    );

    if (bottlesInUnit.length > 0) {
      return {
        canDelete: false,
        bottleCount: bottlesInUnit.length,
        message: `Cannot delete "${unit.name}" because it currently holds ${bottlesInUnit.length} active bottle(s). Please move them to the Staging Shelf first.`,
      };
    }

    return { canDelete: true, bottleCount: 0 };
  },

  deleteStorageUnit(id: string): { success: boolean; error?: string } {
    const currentUid = activeUser?.uid;
    const check = CellarStore.canDeleteUnit(id);
    if (!check.canDelete) {
      return { success: false, error: check.message };
    }

    const allUnits = loadRawUnits().filter((u) => !(u.id === id && u.user_id === currentUid));
    saveRawUnits(allUnits);
    if (currentUid) {
      removeUnitFromFirestore(currentUid, id);
    }
    return { success: true };
  },
};

// Initial sync on module load (after CellarStore is initialized)
if (activeUser) {
  syncTenantData(activeUser);
} else {
  loadRawBottles();
  loadRawUnits();
  setHydratingState(false);
}

// Listen to auth changes & Firebase Auth hydration
if (typeof window !== 'undefined') {
  window.addEventListener(AUTH_CHANGE_EVENT, (e: any) => {
    syncTenantData(e.detail || null);
  });

  onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser && activeUser && firebaseUser.uid === activeUser.uid) {
      loadTenantFromFirestore(firebaseUser.uid);
    }
  });
}

export function useCellarStore() {
  const [bottles, setBottles] = useState<Bottle[]>(() => CellarStore.getBottles());
  const [storageUnits, setStorageUnits] = useState<StorageUnit[]>(() => CellarStore.getStorageUnits());
  const [isHydrating, setIsHydrating] = useState<boolean>(() => CellarStore.isHydrating());

  useEffect(() => {
    const handleUpdate = () => {
      setBottles(CellarStore.getBottles());
    };

    const handleUnitsUpdate = () => {
      setStorageUnits(CellarStore.getStorageUnits());
    };

    const handleAuthChange = () => {
      setBottles(CellarStore.getBottles());
      setStorageUnits(CellarStore.getStorageUnits());
      setIsHydrating(CellarStore.isHydrating());
    };

    const handleHydrationChange = () => {
      setIsHydrating(CellarStore.isHydrating());
      setBottles(CellarStore.getBottles());
    };

    window.addEventListener(LISTEN_EVENT, handleUpdate);
    window.addEventListener(LISTEN_EVENT_UNITS, handleUnitsUpdate);
    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    window.addEventListener(LISTEN_EVENT_HYDRATION, handleHydrationChange);

    return () => {
      window.removeEventListener(LISTEN_EVENT, handleUpdate);
      window.removeEventListener(LISTEN_EVENT_UNITS, handleUnitsUpdate);
      window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
      window.removeEventListener(LISTEN_EVENT_HYDRATION, handleHydrationChange);
    };
  }, []);

  const activeBottles = useMemo(
    () => bottles.filter((b) => b.status === 'in-cellar' || b.status === 'staging'),
    [bottles]
  );
  const consumedBottles = useMemo(
    () => bottles.filter((b) => b.status === 'consumed'),
    [bottles]
  );
  const rackABottles = useMemo(
    () => bottles.filter((b) => b.slotId?.startsWith('A-') && b.status === 'in-cellar'),
    [bottles]
  );
  const rackBBottles = useMemo(
    () => bottles.filter((b) => b.slotId?.startsWith('B-') && b.status === 'in-cellar'),
    [bottles]
  );
  const stagingBottles = useMemo(
    () => bottles.filter((b) => b.status === 'staging'),
    [bottles]
  );

  const activeRacks = useMemo(() => storageUnits.filter((u) => !u.is_staging), [storageUnits]);
  const stagingUnit = useMemo(
    () => storageUnits.find((u) => u.is_staging) || DEFAULT_STORAGE_UNITS[2],
    [storageUnits]
  );

  const getBottleBySlot = useCallback(
    (slotId: SlotId) => bottles.find((b) => b.slotId === slotId && b.status !== 'consumed'),
    [bottles]
  );

  const getBottlesForUnit = useCallback(
    (unit: StorageUnit) => {
      if (unit.is_staging) {
        return bottles.filter((b) => b.status === 'staging');
      }
      return bottles.filter((b) => isSlotInUnit(b.slotId, unit) && b.status === 'in-cellar');
    },
    [bottles]
  );

  return {
    bottles,
    activeBottles,
    consumedBottles,
    rackABottles,
    rackBBottles,
    stagingBottles,
    storageUnits,
    activeRacks,
    stagingUnit,
    isHydrating,
    getBottleBySlot,
    getBottlesForUnit,
    addBottle: CellarStore.addBottle.bind(CellarStore),
    addBottlesBatch: CellarStore.addBottlesBatch.bind(CellarStore),
    consumeBottle: CellarStore.consumeBottle.bind(CellarStore),
    unconsumeBottle: CellarStore.unconsumeBottle.bind(CellarStore),
    moveBottle: CellarStore.moveBottle.bind(CellarStore),
    updateBottle: CellarStore.updateBottle.bind(CellarStore),
    removePhoto: CellarStore.removePhoto.bind(CellarStore),
    deleteBottle: CellarStore.deleteBottle.bind(CellarStore),
    seedSampleInventory: CellarStore.seedSampleInventory.bind(CellarStore),
    clearCellar: CellarStore.clearCellar.bind(CellarStore),
    exportJSON: CellarStore.exportJSON.bind(CellarStore),
    importJSON: CellarStore.importJSON.bind(CellarStore),
    addStorageUnit: CellarStore.addStorageUnit.bind(CellarStore),
    updateStorageUnit: CellarStore.updateStorageUnit.bind(CellarStore),
    deleteStorageUnit: CellarStore.deleteStorageUnit.bind(CellarStore),
    canResizeUnit: CellarStore.canResizeUnit.bind(CellarStore),
    canDeleteUnit: CellarStore.canDeleteUnit.bind(CellarStore),
  };
}
