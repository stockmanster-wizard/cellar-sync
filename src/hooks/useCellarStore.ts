/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Bottle, SlotId, StorageUnit, DEFAULT_STORAGE_UNITS, isSlotInUnit } from '../types/cellar';
import { CellarStore } from '../services/cellarStore';
import { AUTH_CHANGE_EVENT } from '../services/authService';

const LISTEN_EVENT = 'cellarsync_storage_change';
const LISTEN_EVENT_UNITS = 'cellarsync_storage_units_change';
const LISTEN_EVENT_HYDRATION = 'cellarsync_hydration_change';

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
