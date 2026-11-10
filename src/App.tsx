/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useCellarStore } from './services/cellarStore';
import { Bottle, SlotId, WineStyle, WINE_STYLES, SOMMELIER_WINE_STYLE_ORDER, formatSlotLabel, normalizeWineStyle, isSlotInUnit, getUnitSlotPrefix, parseSlotCoordinates, getBottleMaturity, DrinkingWindowMaturityStatus } from './types/cellar';
import { Header } from './components/Header';
import { RackGrid } from './components/RackGrid';
import { StagingShelf } from './components/StagingShelf';
import { BottleActionSheet } from './components/BottleActionSheet';
import { LogConsumptionModal } from './components/LogConsumptionModal';
import { AddBottleModal } from './components/AddBottleModal';
import { MoveBottleModal } from './components/MoveBottleModal';
import { EditBottleModal } from './components/EditBottleModal';
import { InventoryView } from './components/InventoryView';
import { HistoryView } from './components/HistoryView';
import { AuditModal } from './components/AuditModal';
import { StorageManagerModal } from './components/StorageManagerModal';
import { SplashScreen } from './components/SplashScreen';
import { CellarHeaderShell } from './components/cellar/CellarHeaderShell';
import { StorageSegmentedTabs } from './components/cellar/StorageSegmentedTabs';
import { SlideDownLegendDrawer } from './components/cellar/SlideDownLegendDrawer';
import { FilterTrack, FilterDropdownPill } from './components/ui/WineCellarDesignSystem';
import { authService, AUTH_CHANGE_EVENT } from './services/authService';
import { AuthUser } from './types/auth';
import { 
  Wine, 
  Plus, 
  Sparkles, 
  CheckCircle, 
  Layers, 
  Search, 
  LayoutGrid, 
  ListFilter, 
  History, 
  CheckCheck,
  ChevronRight,
  Info,
  SlidersHorizontal,
  RotateCcw,
  X
} from 'lucide-react';

export interface PlacementQueue {
  wineData: Omit<Bottle, 'id' | 'addedAt' | 'status'>;
  total: number;
  placedCoordinates: Array<{ rackId: string; row: number; col: number; slotId: SlotId }>;
}

export default function App() {
  const {
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
    addBottle,
    addBottlesBatch,
    consumeBottle,
    unconsumeBottle,
    moveBottle,
    updateBottle,
    deleteBottle,
    seedSampleInventory,
    clearCellar,
    exportJSON,
    importJSON,
    addStorageUnit,
    updateStorageUnit,
    deleteStorageUnit,
  } = useCellarStore();

  // Authentication session state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());

  useEffect(() => {
    const handleAuth = (e: any) => {
      setCurrentUser(e.detail || null);
    };
    window.addEventListener(AUTH_CHANGE_EVENT, handleAuth);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, handleAuth);
  }, []);

  const handleLogOut = async () => {
    await authService.signOut();
    setCurrentUser(null);
    showToast('Logged out of cellar session');
  };

  // Navigation state
  const [currentTab, setCurrentTab] = useState<'map' | 'inventory' | 'history' | 'audit'>('map');
  const [selectedRackId, setSelectedRackId] = useState<string>('all');

  // Search & Filter state for map view
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWindow, setSelectedWindow] = useState<DrinkingWindowMaturityStatus | 'all'>('all');
  const [selectedStyle, setSelectedStyle] = useState<WineStyle | 'all'>('all');
  const [selectedVarietal, setSelectedVarietal] = useState<string>('all');
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [initialSlotForAdd, setInitialSlotForAdd] = useState<SlotId | null>(null);

  const [inspectingBottle, setInspectingBottle] = useState<Bottle | null>(null);
  const [consumingBottle, setConsumingBottle] = useState<Bottle | null>(null);
  const [movingBottle, setMovingBottle] = useState<Bottle | null>(null);
  const [editingBottle, setEditingBottle] = useState<Bottle | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [editingStorageUnitId, setEditingStorageUnitId] = useState<string | null>(null);

  // Toast notification state (with optional interactive Undo action)
  const [toastState, setToastState] = useState<{
    message: string;
    undoBottleId?: string;
  } | null>(null);

  const showToast = (msg: string, undoBottleId?: string) => {
    setToastState({ message: msg, undoBottleId });
    const duration = undoBottleId ? 5000 : 3200;
    setTimeout(() => {
      setToastState((prev) => (prev?.message === msg ? null : prev));
    }, duration);
  };

  // Sequential Multi-Bottle Placement Queue state
  const [placementQueue, setPlacementQueue] = useState<PlacementQueue | null>(null);

  // Map of slots currently reserved/queued in active placement mode
  const queuedSlotsMap = useMemo(() => {
    if (!placementQueue) return undefined;
    const map = new Map<SlotId, { bottle: Omit<Bottle, 'id' | 'addedAt' | 'status'>; queueIndex: number }>();
    placementQueue.placedCoordinates.forEach((coord, idx) => {
      map.set(coord.slotId, {
        bottle: placementQueue.wineData,
        queueIndex: idx + 1,
      });
    });
    return map;
  }, [placementQueue]);

  // Occupied slot IDs set for fast checking (including currently queued placement slots)
  const occupiedSlotIds = useMemo(() => {
    const set = new Set<SlotId>();
    activeBottles.forEach((b) => {
      if (b.slotId) set.add(b.slotId);
    });
    if (placementQueue) {
      placementQueue.placedCoordinates.forEach((c) => set.add(c.slotId));
    }
    return set;
  }, [activeBottles, placementQueue]);

  // Only styles currently present in the active cellar inventory, sorted in sommelier tasting order
  const inventoryStyles = useMemo(() => {
    const styleCountMap = new Map<WineStyle, number>();
    activeBottles.forEach((b) => {
      const normalized = normalizeWineStyle(b.style);
      styleCountMap.set(normalized, (styleCountMap.get(normalized) || 0) + 1);
    });

    return SOMMELIER_WINE_STYLE_ORDER
      .filter((style) => (styleCountMap.get(style) || 0) > 0)
      .map((style) => {
        const meta = WINE_STYLES[style] || WINE_STYLES['Medium-Bodied Red Wine'];
        return {
          style,
          count: styleCountMap.get(style) || 0,
          label: meta.label,
          shortLabel: meta.shortLabel,
          dotColor: meta.dotColor,
          sublabel: meta.sublabel,
        };
      });
  }, [activeBottles]);

  // Dynamically compute varietals in active cellar inventory
  const uniqueVarietalsInCellar = useMemo(() => {
    const varietalMap = new Map<string, number>();
    activeBottles.forEach((b) => {
      const v = b.varietal || 'Blend';
      varietalMap.set(v, (varietalMap.get(v) || 0) + 1);
    });

    return Array.from(varietalMap.entries())
      .map(([varietal, count]) => ({ varietal, count }))
      .sort((a, b) => b.count - a.count || a.varietal.localeCompare(b.varietal));
  }, [activeBottles]);

  // Compute maturity counts across active cellar bottles
  const maturityCounts = useMemo(() => {
    const counts = { peak: 0, young: 0, 'past-peak': 0 };
    activeBottles.forEach((b) => {
      const mat = getBottleMaturity(b);
      if (mat) {
        counts[mat.status] += 1;
      }
    });
    return counts;
  }, [activeBottles]);

  // Options for the 3 unified FilterDropdownPill components
  const windowOptions = useMemo(() => {
    const opts = [
      { value: 'all', label: 'All', count: activeBottles.length },
      { value: 'peak', label: 'Drink Me!', count: maturityCounts.peak },
      { value: 'young', label: 'Hold / Young', count: maturityCounts.young },
    ];
    if (maturityCounts['past-peak'] > 0) {
      opts.push({ value: 'past-peak', label: 'Past Peak', count: maturityCounts['past-peak'] });
    }
    return opts;
  }, [activeBottles.length, maturityCounts]);

  const wineFollyStyles = useMemo(() => {
    return [
      { value: 'all', label: 'All', count: activeBottles.length },
      ...inventoryStyles.map((s) => ({
        value: s.style,
        label: s.shortLabel || s.label,
        count: s.count,
        dotColor: s.dotColor,
      })),
    ];
  }, [activeBottles.length, inventoryStyles]);

  const varietalOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All', count: activeBottles.length },
      ...uniqueVarietalsInCellar.map((iv) => ({
        value: iv.varietal,
        label: iv.varietal,
        count: iv.count,
      })),
    ];
  }, [activeBottles.length, uniqueVarietalsInCellar]);

  const windowCount = selectedWindow === 'all' ? activeBottles.length : maturityCounts[selectedWindow] || 0;
  const styleCount =
    selectedStyle === 'all'
      ? activeBottles.length
      : inventoryStyles.find((s) => s.style === selectedStyle)?.count || 0;
  const varietalCount =
    selectedVarietal === 'all'
      ? activeBottles.length
      : uniqueVarietalsInCellar.find((v) => v.varietal === selectedVarietal)?.count || 0;

  // If selected style filter is no longer in inventory, reset to 'all'
  useEffect(() => {
    if (selectedStyle !== 'all' && !inventoryStyles.some((item) => item.style === selectedStyle)) {
      setSelectedStyle('all');
    }
  }, [inventoryStyles, selectedStyle]);

  // If selected varietal filter is no longer in inventory, reset to 'all'
  useEffect(() => {
    if (selectedVarietal !== 'all' && !uniqueVarietalsInCellar.some((v) => v.varietal === selectedVarietal)) {
      setSelectedVarietal('all');
    }
  }, [uniqueVarietalsInCellar, selectedVarietal]);

  // Multi-bottle batch commit
  const commitPlacementBatch = (
    wineData: Omit<Bottle, 'id' | 'addedAt' | 'status'>,
    placed: Array<{ rackId: string; row: number; col: number; slotId: SlotId }>,
    stagingCount = 0
  ) => {
    const itemsToSave: Array<Omit<Bottle, 'id' | 'addedAt' | 'status'> & { slotId?: SlotId }> = [];

    // Cellar placed bottles
    placed.forEach((p) => {
      itemsToSave.push({
        ...wineData,
        slotId: p.slotId,
      });
    });

    // Overflow bottles sent to Staging Shelf
    for (let i = 0; i < stagingCount; i++) {
      itemsToSave.push({
        ...wineData,
        slotId: undefined,
      });
    }

    addBottlesBatch(itemsToSave);
    setPlacementQueue(null);

    const wineTitle = `${wineData.vintage === 'NV' ? 'NV' : wineData.vintage} ${wineData.producer}${wineData.wineName ? ` · ${wineData.wineName}` : ''}`;
    if (stagingCount > 0 && placed.length > 0) {
      showToast(`Placed ${placed.length} bottle${placed.length > 1 ? 's' : ''} in cellar and sent ${stagingCount} to Staging Shelf (${wineTitle})`);
    } else if (stagingCount > 0) {
      showToast(`Sent ${stagingCount} bottle${stagingCount > 1 ? 's' : ''} to Staging Shelf (${wineTitle})`);
    } else {
      showToast(`Successfully placed all ${placed.length} bottles in cellar (${wineTitle})`);
    }
  };

  const handleAutoFillContiguous = () => {
    if (!placementQueue) return;
    const remaining = placementQueue.total - placementQueue.placedCoordinates.length;
    if (remaining <= 0) return;

    const alreadyPlacedSlotIds = new Set(placementQueue.placedCoordinates.map((c) => c.slotId));
    const newPlacements: Array<{ rackId: string; row: number; col: number; slotId: SlotId }> = [];

    // Search active racks: prioritize selected rack, then other active racks
    const targetRacks = selectedRackId !== 'all'
      ? [
          ...activeRacks.filter((r) => r.id === selectedRackId),
          ...activeRacks.filter((r) => r.id !== selectedRackId),
        ]
      : [...activeRacks];

    for (const rack of targetRacks) {
      if (newPlacements.length >= remaining) break;
      const rackPrefix = getUnitSlotPrefix(rack);

      for (let r = 1; r <= rack.rows; r++) {
        if (newPlacements.length >= remaining) break;
        const rowStr = r < 10 ? `0${r}` : `${r}`;

        for (let c = 1; c <= rack.columns; c++) {
          if (newPlacements.length >= remaining) break;
          const colStr = c < 10 ? `0${c}` : `${c}`;
          const slotId = `${rackPrefix}-R${rowStr}-C${colStr}`;

          const isOccupied = occupiedSlotIds.has(slotId) || alreadyPlacedSlotIds.has(slotId);
          if (!isOccupied) {
            newPlacements.push({
              rackId: rack.id,
              row: r,
              col: c,
              slotId,
            });
            alreadyPlacedSlotIds.add(slotId);
          }
        }
      }
    }

    const allPlaced = [...placementQueue.placedCoordinates, ...newPlacements];
    const stillNeeded = placementQueue.total - allPlaced.length;

    commitPlacementBatch(placementQueue.wineData, allPlaced, stillNeeded > 0 ? stillNeeded : 0);
  };

  const handleSendRestToStaging = () => {
    if (!placementQueue) return;
    const remaining = placementQueue.total - placementQueue.placedCoordinates.length;
    commitPlacementBatch(placementQueue.wineData, placementQueue.placedCoordinates, Math.max(0, remaining));
  };

  // Handlers
  const handleSlotClick = (slotId: SlotId, existingBottle?: Bottle) => {
    if (placementQueue) {
      // 1. Deselect if slot was selected in current queue (Undo)
      const queuedIdx = placementQueue.placedCoordinates.findIndex((c) => c.slotId === slotId);
      if (queuedIdx !== -1) {
        const updated = placementQueue.placedCoordinates.filter((_, idx) => idx !== queuedIdx);
        setPlacementQueue({
          ...placementQueue,
          placedCoordinates: updated,
        });
        showToast(`Deselected slot ${formatSlotLabel(slotId, storageUnits)} (Undo)`);
        return;
      }

      // 2. Alert if target slot has an existing bottle
      if (existingBottle) {
        showToast(`Slot ${formatSlotLabel(slotId, storageUnits)} is already occupied`);
        return;
      }

      // 3. Append to placementQueue
      const parsed = parseSlotCoordinates(slotId);
      const matchedUnit = activeRacks.find((r) => isSlotInUnit(slotId, r));
      if (!parsed || !matchedUnit) {
        showToast('Please select an open slot within a storage rack');
        return;
      }

      const newCoord = {
        rackId: matchedUnit.id,
        row: parsed.row,
        col: parsed.col,
        slotId,
      };
      const nextPlaced = [...placementQueue.placedCoordinates, newCoord];

      if (nextPlaced.length >= placementQueue.total) {
        commitPlacementBatch(placementQueue.wineData, nextPlaced, 0);
      } else {
        setPlacementQueue({
          ...placementQueue,
          placedCoordinates: nextPlaced,
        });
        const remaining = placementQueue.total - nextPlaced.length;
        showToast(`Placed bottle #${nextPlaced.length} in ${formatSlotLabel(slotId, storageUnits)} (${remaining} remaining)`);
      }
      return;
    }

    if (existingBottle) {
      setInspectingBottle(existingBottle);
    } else {
      setInitialSlotForAdd(slotId);
      setIsAddModalOpen(true);
    }
  };

  const handleEmptySlotAdd = (slotId: SlotId) => {
    if (placementQueue) {
      handleSlotClick(slotId);
      return;
    }
    setInitialSlotForAdd(slotId);
    setIsAddModalOpen(true);
  };

  const handleAddBottleSave = (data: any, quantity = 1) => {
    if (quantity <= 1) {
      const created = addBottle(data);
      showToast(`Added ${created.producer} to ${created.slotId ? formatSlotLabel(created.slotId, storageUnits) : 'Staging Shelf'}`);
      if (created.slotId) {
        const matchUnit = activeRacks.find((r) => isSlotInUnit(created.slotId, r));
        if (matchUnit && selectedRackId !== 'all' && selectedRackId !== matchUnit.id) {
          setSelectedRackId(matchUnit.id);
        }
      }
      return;
    }

    // Multi-bottle placement mode
    const placedCoords: Array<{ rackId: string; row: number; col: number; slotId: SlotId }> = [];
    if (data.slotId) {
      const parsed = parseSlotCoordinates(data.slotId);
      const matchedUnit = activeRacks.find((r) => isSlotInUnit(data.slotId, r));
      if (parsed && matchedUnit) {
        placedCoords.push({
          rackId: matchedUnit.id,
          row: parsed.row,
          col: parsed.col,
          slotId: data.slotId,
        });
        if (selectedRackId !== 'all' && selectedRackId !== matchedUnit.id) {
          setSelectedRackId(matchedUnit.id);
        }
      }
    }

    setCurrentTab('map');
    setPlacementQueue({
      wineData: data,
      total: quantity,
      placedCoordinates: placedCoords,
    });

    const wineTitle = `${data.vintage === 'NV' ? 'NV' : data.vintage} ${data.producer}${data.wineName ? ` · ${data.wineName}` : ''}`;
    const remaining = quantity - placedCoords.length;
    showToast(`Placing bottle ${placedCoords.length + 1} of ${quantity}: ${wineTitle} (${remaining} remaining)`);
  };

  const handleConfirmConsumption = (
    bottleId: string,
    evaluation: { date: string; rating: number | null; tastingNotes: string }
  ) => {
    const consumed = consumeBottle(bottleId, evaluation);
    setConsumingBottle(null);
    if (consumed) {
      showToast('Logged to Tasting Archive. Slot cleared.', consumed.id);
    }
  };

  const handleAuditMarkDrunk = (bottleId: string) => {
    const consumed = consumeBottle(bottleId, {
      date: new Date().toISOString().slice(0, 10),
      rating: null,
      tastingNotes: '',
    });
    if (consumed) {
      showToast('Logged to Tasting Archive. Slot cleared.', consumed.id);
    }
  };

  const handleRestore = (bottleId: string) => {
    // Smart restore: returns to original rack slot if free, else first open Staging Shelf slot
    const restored = unconsumeBottle(bottleId);
    if (restored) {
      setToastState(null);
      showToast(
        `Restored ${restored.producer} to ${
          restored.slotId ? formatSlotLabel(restored.slotId, storageUnits) : 'Staging Shelf'
        }`
      );
    }
  };

  const handleMoveConfirm = (bottleId: string, newSlotId: SlotId) => {
    const result = moveBottle(bottleId, newSlotId);
    if (result.success) {
      if (result.displacedBottle) {
        showToast(`Moved bottle and swapped with ${result.displacedBottle.producer}`);
      } else {
        showToast(`Bottle relocated to ${formatSlotLabel(newSlotId)}`);
      }
    }
  };

  const handleEditConfirm = (bottleId: string, updates: Partial<Bottle>) => {
    updateBottle(bottleId, updates);
    showToast('Bottle details updated successfully');
  };

  const handleUpdateCellarNotes = (bottleId: string, cellarNotes: string) => {
    const updated = updateBottle(bottleId, {
      cellarNotes: cellarNotes.trim() || undefined,
    });
    if (updated && inspectingBottle && inspectingBottle.id === bottleId) {
      setInspectingBottle(updated);
    }
    showToast('Cellar notes saved');
  };

  const handleUpdateConsumptionReview = (
    bottleId: string,
    review: { date: string; rating: number | null; tastingNotes: string }
  ) => {
    const updated = updateBottle(bottleId, {
      consumption: review,
      rating: review.rating ?? undefined,
      tastingNotes: review.tastingNotes || undefined,
    });
    if (updated && inspectingBottle && inspectingBottle.id === bottleId) {
      setInspectingBottle(updated);
    }
    showToast('Tasting review updated');
  };

  const handleUpdateBottlePhoto = (bottleId: string, newImageUrl: string) => {
    updateBottle(bottleId, { visualMode: 'photo', imageUrl: newImageUrl });
    if (inspectingBottle && inspectingBottle.id === bottleId) {
      setInspectingBottle({ ...inspectingBottle, visualMode: 'photo', imageUrl: newImageUrl });
    }
    showToast('Wine label photo updated');
  };

  const handleRemoveBottlePhoto = (bottleId: string) => {
    updateBottle(bottleId, { visualMode: 'card', imageUrl: undefined });
    if (inspectingBottle && inspectingBottle.id === bottleId) {
      setInspectingBottle({ ...inspectingBottle, visualMode: 'card', imageUrl: undefined });
    }
    showToast('Reverted to procedural label card');
  };

  const handleDeleteBottle = (bottleId: string) => {
    deleteBottle(bottleId);
    showToast('Bottle removed from cellar');
  };

  const handleLoadSeedData = () => {
    seedSampleInventory();
    showToast('Loaded curated collection (15 bottles across racks and staging)');
  };

  const handleClearCellar = () => {
    clearCellar();
    showToast('Cellar cleared to empty state');
  };

  const handleExportBackup = () => {
    const jsonStr = exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cellarsync-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON exported');
  };

  const handleImportBackup = (jsonStr: string) => {
    const ok = importJSON(jsonStr);
    if (ok) {
      showToast('Cellar inventory restored from backup');
    } else {
      showToast('Invalid cellar backup JSON format');
    }
  };

  const isCellarEmpty = activeBottles.length === 0;

  if (!currentUser) {
    return (
      <SplashScreen
        onAuthenticated={(user) => {
          setCurrentUser(user);
          showToast(`Welcome back, ${user.displayName}!`);
        }}
      />
    );
  }

  if (isHydrating) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-8 h-8 rounded-full border-2 border-rose-500/30 border-t-rose-500 animate-spin mb-3" />
        <p className="text-xs font-medium tracking-wider uppercase text-slate-400">Hydrating cellar inventory...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 flex flex-col text-slate-900 pb-16 xl:pb-8 selection:bg-rose-100 selection:text-rose-900">
      {/* 3-Zone Top Navigation Bar */}
      <Header
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'audit') {
            setIsAuditModalOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        onOpenAddBottle={() => {
          setInitialSlotForAdd(null);
          setIsAddModalOpen(true);
        }}
        onLoadSeedData={handleLoadSeedData}
        onClearCellar={handleClearCellar}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onOpenStorageManager={() => {
          setEditingStorageUnitId(null);
          setIsStorageModalOpen(true);
        }}
        currentUser={currentUser}
        onLogOut={handleLogOut}
        activeCount={activeBottles.length - stagingBottles.length}
        consumedCount={consumedBottles.length}
        stagingCount={stagingBottles.length}
      />

      {/* Main Responsive Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 py-2.5 sm:py-5 space-y-3.5 sm:space-y-6">
        
        {/* Empty State Onboarding Hero (When First Loaded / Cleared) */}
        {isCellarEmpty && currentTab === 'map' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs relative overflow-hidden">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-800 rounded-full text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                <span>Cellar Ready for Intake</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight text-balance">
                Welcome to CellarSync AI
              </h1>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Your 1:1 physical cellar map is initialized (Rack A: 48 slots, Rack B: 48 slots, Staging Shelf: 12 slots).
                Add your first bottle via Gemini multi-modal label scan in under 10 seconds, or load curated sample bottles to explore.
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-5">
                <button
                  onClick={() => {
                    setInitialSlotForAdd(null);
                    setIsAddModalOpen(true);
                  }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all min-h-[44px]"
                >
                  <Plus className="w-4 h-4 text-rose-300" />
                  <span>Scan or Add First Bottle</span>
                </button>

                <button
                  onClick={handleLoadSeedData}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors min-h-[44px]"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Load Curated Sample Cellar (15 Bottles)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: CELLAR MAP VIEW (Dual 4x12 Racks + Staging Shelf) */}
        {currentTab === 'map' && (
          <div className="space-y-3.5 sm:space-y-6">

            {/* Sticky Multi-Bottle Placement Banner */}
            {placementQueue && placementQueue.placedCoordinates.length < placementQueue.total && (
              <div className="sticky top-2 z-40 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700/80 p-3 sm:p-4 animate-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-900/70 border border-rose-700/70 flex items-center justify-center shrink-0">
                      <Wine className="w-5 h-5 text-rose-300 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-rose-400 uppercase tracking-wider">
                          Placing bottle {placementQueue.placedCoordinates.length + 1} of {placementQueue.total}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                          {placementQueue.total - placementQueue.placedCoordinates.length} remaining
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-white truncate max-w-md">
                        {placementQueue.wineData.vintage === 'NV' ? 'NV' : placementQueue.wineData.vintage} {placementQueue.wineData.producer}
                        {placementQueue.wineData.wineName ? ` · ${placementQueue.wineData.wineName}` : ''}
                        <span className="text-xs font-normal text-slate-400 ml-1.5">
                          ({placementQueue.wineData.varietal || placementQueue.wineData.style})
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoFillContiguous}
                      className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Auto-Fill Contiguous</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSendRestToStaging}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Send Rest to Staging</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPlacementQueue(null);
                        showToast('Intake cancelled');
                      }}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Cancel intake"
                      aria-label="Cancel intake"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* 3-Tier Standardized Cellar Map Header */}
            <CellarHeaderShell
              searchInput={
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Highlight by wine, varietal, producer..."
                    className="w-full pl-9 pr-8 py-1.5 sm:py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 placeholder:text-slate-400 font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 text-xs font-mono rounded-md cursor-pointer"
                      title="Clear search"
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
              }
              storageTabs={
                <StorageSegmentedTabs
                  storageUnits={storageUnits}
                  bottles={bottles}
                  selectedId={selectedRackId}
                  onSelect={(id) => setSelectedRackId(id)}
                  showCapacity
                />
              }
              filterRibbon={
                <FilterTrack>
                  <FilterDropdownPill
                    label="Window"
                    value={selectedWindow}
                    count={windowCount}
                    options={windowOptions}
                    onSelect={(val) => setSelectedWindow(val as DrinkingWindowMaturityStatus | 'all')}
                  />
                  <FilterDropdownPill
                    label="Style"
                    value={selectedStyle}
                    count={styleCount}
                    options={wineFollyStyles}
                    onSelect={(val) => setSelectedStyle(val as WineStyle | 'all')}
                  />
                  <FilterDropdownPill
                    label="Varietal"
                    value={selectedVarietal}
                    count={varietalCount}
                    options={varietalOptions}
                    onSelect={(val) => setSelectedVarietal(val)}
                  />
                </FilterTrack>
              }
            />

            {/* Dynamic Storage Racks Display */}
            {selectedRackId === 'all' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {activeRacks.map((rack) => (
                  <RackGrid
                    key={rack.id}
                    unit={rack}
                    bottles={activeBottles}
                    selectedSlotId={inspectingBottle?.slotId}
                    highlightStyle={selectedStyle}
                    highlightWindow={selectedWindow}
                    highlightVarietal={selectedVarietal}
                    searchQuery={searchQuery}
                    queuedSlotsMap={queuedSlotsMap}
                    onSlotClick={handleSlotClick}
                    onEmptySlotTapToAdd={handleEmptySlotAdd}
                    onManageRack={(unit) => {
                      setEditingStorageUnitId(unit.id);
                      setIsStorageModalOpen(true);
                    }}
                  />
                ))}
              </div>
            ) : selectedRackId === 'staging' ? (
              null
            ) : (
              (() => {
                const targetUnit = activeRacks.find((r) => r.id === selectedRackId) || activeRacks[0];
                if (!targetUnit) return null;
                return (
                  <RackGrid
                    unit={targetUnit}
                    bottles={activeBottles}
                    selectedSlotId={inspectingBottle?.slotId}
                    highlightStyle={selectedStyle}
                    highlightWindow={selectedWindow}
                    highlightVarietal={selectedVarietal}
                    searchQuery={searchQuery}
                    queuedSlotsMap={queuedSlotsMap}
                    onSlotClick={handleSlotClick}
                    onEmptySlotTapToAdd={handleEmptySlotAdd}
                    onManageRack={(unit) => {
                      setEditingStorageUnitId(unit.id);
                      setIsStorageModalOpen(true);
                    }}
                  />
                );
              })()
            )}

            {/* Staging Shelf Component */}
            <StagingShelf
              bottles={activeBottles}
              selectedSlotId={inspectingBottle?.slotId}
              onSlotClick={handleSlotClick}
              onEmptySlotClick={handleEmptySlotAdd}
            />
          </div>
        )}

        {/* TAB 2: INVENTORY LIST VIEW */}
        {currentTab === 'inventory' && (
          <InventoryView
            bottles={activeBottles}
            storageUnits={storageUnits}
            onSelectBottle={(b) => setInspectingBottle(b)}
            onQuickConsume={(b) => setConsumingBottle(b)}
            onOpenAddBottle={() => {
              setInitialSlotForAdd(null);
              setIsAddModalOpen(true);
            }}
          />
        )}

        {/* TAB 3: CONSUMED LOG & JOURNAL */}
        {currentTab === 'history' && (
          <HistoryView
            consumedBottles={consumedBottles}
            activeBottles={activeBottles}
            storageUnits={storageUnits}
            onRestoreBottle={handleRestore}
            onSelectBottle={(b) => setInspectingBottle(b)}
            onInspectActiveBottle={(activeBottle) => {
              setCurrentTab('map');
              if (activeBottle.slotId) {
                const matchUnit = activeRacks.find((r) => isSlotInUnit(activeBottle.slotId, r));
                if (matchUnit && selectedRackId !== 'all' && selectedRackId !== matchUnit.id) {
                  setSelectedRackId(matchUnit.id);
                }
              }
              setInspectingBottle(activeBottle);
            }}
            onOpenAddBottle={() => {
              setInitialSlotForAdd(null);
              setIsAddModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Mobile & Tablet Bottom Tab Bar (< 1280px xl breakpoint, Compact Thumb Zone) */}
      <nav className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe">
        <div className="max-w-xl mx-auto grid grid-cols-4 items-center h-12 sm:h-13 px-1">
          <button
            onClick={() => setCurrentTab('map')}
            className={`flex flex-col items-center justify-center h-full gap-0.5 transition-colors cursor-pointer whitespace-nowrap ${
              currentTab === 'map' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span className="text-[10px] leading-tight tracking-tight">Cellar Map</span>
          </button>

          <button
            onClick={() => setCurrentTab('inventory')}
            className={`flex flex-col items-center justify-center h-full gap-0.5 transition-colors cursor-pointer whitespace-nowrap ${
              currentTab === 'inventory' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <ListFilter className="w-4 h-4 shrink-0" />
            <span className="text-[10px] leading-tight tracking-tight">Inventory ({activeBottles.length})</span>
          </button>

          <button
            onClick={() => setCurrentTab('history')}
            className={`flex flex-col items-center justify-center h-full gap-0.5 transition-colors cursor-pointer whitespace-nowrap ${
              currentTab === 'history' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <History className="w-4 h-4 shrink-0" />
            <span className="text-[10px] leading-tight tracking-tight">Drunk ({consumedBottles.length})</span>
          </button>

          <button
            onClick={() => setIsAuditModalOpen(true)}
            className={`flex flex-col items-center justify-center h-full gap-0.5 transition-colors cursor-pointer whitespace-nowrap ${
              currentTab === 'audit' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <CheckCheck className="w-4 h-4 shrink-0" />
            <span className="text-[10px] leading-tight tracking-tight">Audit Drift</span>
          </button>
        </div>
      </nav>

      {/* Floating Toast Notification with Optional Immediate [Undo] Action */}
      {toastState && (
        <div className="fixed bottom-16 xl:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom duration-200 max-w-md">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastState.message}</span>
          {toastState.undoBottleId && (
            <button
              type="button"
              onClick={() => handleRestore(toastState.undoBottleId!)}
              className="ml-1 px-2.5 py-1 rounded-lg bg-rose-800 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Undo</span>
            </button>
          )}
        </div>
      )}

      {/* MODAL: Add Bottle Flow (Camera / Upload / Sample Labels / Gemini AI Parse) */}
      {isAddModalOpen && (
        <AddBottleModal
          key={`add-modal-${initialSlotForAdd || 'new'}`}
          isOpen={isAddModalOpen}
          initialSlotId={initialSlotForAdd}
          onClose={() => {
            setIsAddModalOpen(false);
            setInitialSlotForAdd(null);
          }}
          onSave={handleAddBottleSave}
          occupiedSlotIds={occupiedSlotIds}
          storageUnits={storageUnits}
        />
      )}

      {/* MODAL: Bottle Detail Sheet (Stored Tasting Profile & Cellar Notes / Consumed Archive View) */}
      {inspectingBottle && (
        <BottleActionSheet
          bottle={inspectingBottle}
          activeBottles={activeBottles}
          storageUnits={storageUnits}
          isOpen={Boolean(inspectingBottle)}
          onClose={() => setInspectingBottle(null)}
          onStartConsume={(b) => {
            setInspectingBottle(null);
            setConsumingBottle(b);
          }}
          onUndoConsume={(id) => {
            handleRestore(id);
            setInspectingBottle(null);
          }}
          onSelectActiveBottle={(activeBottle) => {
            setCurrentTab('map');
            if (activeBottle.slotId) {
              const matchUnit = activeRacks.find((r) => isSlotInUnit(activeBottle.slotId, r));
              if (matchUnit && selectedRackId !== 'all' && selectedRackId !== matchUnit.id) {
                setSelectedRackId(matchUnit.id);
              }
            }
            setInspectingBottle(activeBottle);
          }}
          onUpdateCellarNotes={handleUpdateCellarNotes}
          onUpdateConsumptionReview={handleUpdateConsumptionReview}
          onMoveSlot={(b) => {
            setMovingBottle(b);
            setInspectingBottle(null);
          }}
          onEdit={(b) => {
            setEditingBottle(b);
            setInspectingBottle(null);
          }}
          onDelete={(id) => {
            handleDeleteBottle(id);
            setInspectingBottle(null);
          }}
          onUpdatePhoto={handleUpdateBottlePhoto}
          onRemovePhoto={handleRemoveBottlePhoto}
        />
      )}

      {/* MODAL: Log Bottle Consumption (Step 2 Deliberate Uncorking & Evaluation Flow) */}
      <LogConsumptionModal
        bottle={consumingBottle}
        isOpen={Boolean(consumingBottle)}
        onClose={() => setConsumingBottle(null)}
        onConfirmConsume={handleConfirmConsumption}
      />

      {/* MODAL: Move Bottle Slot Reassignment */}
      {movingBottle && (
        <MoveBottleModal
          bottle={movingBottle}
          isOpen={Boolean(movingBottle)}
          onClose={() => setMovingBottle(null)}
          onMove={handleMoveConfirm}
          allBottles={activeBottles}
          storageUnits={storageUnits}
        />
      )}

      {/* MODAL: Edit Bottle Details */}
      {editingBottle && (
        <EditBottleModal
          bottle={editingBottle}
          isOpen={Boolean(editingBottle)}
          onClose={() => setEditingBottle(null)}
          onSave={handleEditConfirm}
          onDelete={(id) => {
            handleDeleteBottle(id);
            setEditingBottle(null);
          }}
        />
      )}

      {/* MODAL: Cellar Reconciliation Audit */}
      <AuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        bottles={activeBottles}
        onMarkDrunk={handleAuditMarkDrunk}
      />

      {/* MODAL: Dynamic Storage Units Manager (Add / Manage / Resize Racks) */}
      <StorageManagerModal
        isOpen={isStorageModalOpen}
        onClose={() => {
          setIsStorageModalOpen(false);
          setEditingStorageUnitId(null);
        }}
        storageUnits={storageUnits}
        bottles={bottles}
        onAddUnit={(data) => {
          const newUnit = addStorageUnit(data);
          showToast(`Created ${newUnit.name} (${newUnit.columns}×${newUnit.rows})`);
          setSelectedRackId(newUnit.id);
          return newUnit;
        }}
        onUpdateUnit={(id, patch) => {
          const res = updateStorageUnit(id, patch);
          if (res.success) {
            showToast('Storage rack updated successfully');
          }
          return res;
        }}
        onDeleteUnit={(id) => {
          const res = deleteStorageUnit(id);
          if (res.success) {
            showToast('Storage rack deleted');
            if (selectedRackId === id) {
              setSelectedRackId('all');
            }
          }
          return res;
        }}
        initialEditingUnitId={editingStorageUnitId}
      />
    </div>
  );
}
