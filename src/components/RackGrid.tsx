/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Bottle, SlotId, StorageUnit, WINE_STYLES, WineStyle, normalizeWineStyle, getUnitSlotPrefix, getBottleMaturity, DrinkingWindowMaturityStatus } from '../types/cellar';
import { VarietalBadge } from './ui/WineCellarDesignSystem';
import { RackCapacityHeader } from './ui/RackCapacityHeader';
import { GridCoordinateBadge } from './ui/GridCoordinateBadge';
import { Plus, ArrowLeftRight } from 'lucide-react';

interface RackGridProps {
  unit: StorageUnit;
  bottles: Bottle[];
  selectedSlotId?: SlotId | null;
  highlightStyle?: WineStyle | 'all';
  highlightWindow?: DrinkingWindowMaturityStatus | 'all';
  highlightVarietal?: string | 'all';
  searchQuery?: string;
  queuedSlotsMap?: Map<SlotId, { bottle: Omit<Bottle, 'id' | 'addedAt' | 'status'>; queueIndex: number }>;
  onSlotClick: (slotId: SlotId, existingBottle?: Bottle) => void;
  onEmptySlotTapToAdd?: (slotId: SlotId) => void;
  onManageRack?: (unit: StorageUnit) => void;
}

export const RackGrid: React.FC<RackGridProps> = ({
  unit,
  bottles,
  selectedSlotId,
  highlightStyle = 'all',
  highlightWindow = 'all',
  highlightVarietal = 'all',
  searchQuery = '',
  queuedSlotsMap,
  onSlotClick,
  onEmptySlotTapToAdd,
  onManageRack,
}) => {
  const rackPrefix = getUnitSlotPrefix(unit);

  // Map occupied slots for fast O(1) lookup
  const slotBottleMap = useMemo(() => {
    const map = new Map<SlotId, Bottle>();
    bottles.forEach((b) => {
      if (b.slotId && b.slotId.startsWith(`${rackPrefix}-`) && b.status === 'in-cellar') {
        map.set(b.slotId, b);
      }
    });
    return map;
  }, [bottles, rackPrefix]);

  const rows = Array.from({ length: unit.rows }, (_, i) => i + 1);
  const cols = Array.from({ length: unit.columns }, (_, i) => i + 1);
  const totalSlots = unit.columns * unit.rows;

  const rackOccupiedCount = slotBottleMap.size;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-2.5 sm:p-6 transition-all">
      {/* Header with Rack Info and Capacity */}
      <div className="mb-3">
        <RackCapacityHeader
          rackId={rackPrefix}
          rackName={`${unit.name} (${unit.columns} × ${unit.rows} Grid)`}
          occupiedSlots={rackOccupiedCount}
          totalSlots={totalSlots}
          onManageRacks={onManageRack ? () => onManageRack(unit) : undefined}
        />
      </div>

      {/* Swipe Hint for horizontal scroll */}
      {unit.columns >= 5 && (
        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pb-2 font-mono">
          <span className="flex items-center gap-1">
            <ArrowLeftRight className="w-3 h-3 text-slate-400" />
            Swipe horizontally ({unit.columns} columns)
          </span>
          <span>76px slot min · Row pinned</span>
        </div>
      )}

      {/* Grid Table Container */}
      <div className="overflow-x-auto pb-2 pt-1 -mx-1 px-1 sm:-mx-0.5 sm:px-0.5 scrollbar-thin scrollbar-thumb-slate-200 overscroll-x-contain">
        <div
          className="w-max min-w-full"
          style={{
            minWidth: `calc(36px + ${unit.columns} * 76px + ${unit.columns} * 8px)`,
          }}
        >
          {/* Unified Dynamic Grid: Headers and all rows share identical column tracks */}
          <div
            className="grid gap-1.5 sm:gap-2 items-center"
            style={{
              gridTemplateColumns: `36px repeat(${unit.columns}, minmax(76px, 1fr))`,
            }}
          >
            {/* Column Headers */}
            <div className="h-6 sm:h-7 w-9 shrink-0 sticky left-0 z-20 bg-white select-none" aria-hidden="true" />
            {cols.map((col) => (
              <div
                key={`header-col-${col}`}
                className="h-6 sm:h-7 sticky top-0 z-10 flex items-center justify-center bg-white/95 backdrop-blur-xs select-none"
              >
                <GridCoordinateBadge type="col" index={col} />
              </div>
            ))}

            {/* Dynamic Rows × Columns */}
            {rows.map((row) => {
              const rowStr = row < 10 ? `0${row}` : `${row}`;

              return (
                <React.Fragment key={`rack-${rackPrefix}-row-${row}`}>
                  {/* Sticky Pinned Row Indicator */}
                  <div className="h-[74px] sm:h-[76px] sticky left-0 z-20 bg-white border-r border-slate-200/80 flex items-center justify-center select-none shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                    <GridCoordinateBadge type="row" index={row} />
                  </div>

                  {/* Cell Slots */}
                  {cols.map((col) => {
                    const colStr = col < 10 ? `0${col}` : `${col}`;
                    const slotId = `${rackPrefix}-R${rowStr}-C${colStr}`;
                    const bottle = slotBottleMap.get(slotId);
                    const isSelected = selectedSlotId === slotId;

                    // Search / Filter matching
                    let matchesFilter = true;
                    const normalizedStyle = bottle ? normalizeWineStyle(bottle.style) : 'Medium-Bodied Red Wine';

                    if (highlightStyle !== 'all') {
                      matchesFilter = matchesFilter && (bottle ? normalizedStyle === highlightStyle : false);
                    }
                    if (highlightWindow !== 'all') {
                      matchesFilter = matchesFilter && (bottle ? getBottleMaturity(bottle)?.status === highlightWindow : false);
                    }
                    if (highlightVarietal !== 'all') {
                      matchesFilter = matchesFilter && (bottle ? (bottle.varietal || 'Blend') === highlightVarietal : false);
                    }
                    if (searchQuery.trim() !== '' && bottle) {
                      const q = searchQuery.toLowerCase();
                      const matchName = (bottle.wineName || '').toLowerCase().includes(q);
                      const matchProd = bottle.producer.toLowerCase().includes(q);
                      const matchVarietal = (bottle.varietal || '').toLowerCase().includes(q);
                      const matchStyle = normalizedStyle.toLowerCase().includes(q) || (bottle.style || '').toLowerCase().includes(q);
                      const matchVintage = String(bottle.vintage).includes(q);
                      matchesFilter = matchesFilter && (matchName || matchProd || matchVarietal || matchStyle || matchVintage);
                    }

                    const styleMeta = bottle ? WINE_STYLES[normalizedStyle] || WINE_STYLES['Medium-Bodied Red Wine'] : null;

                    if (bottle) {
                      const fullTitle = `${bottle.vintage === 'NV' ? 'NV' : bottle.vintage} ${bottle.producer}${bottle.wineName ? ` · ${bottle.wineName}` : ''}${bottle.varietal ? ` [${bottle.varietal}]` : ''} (${bottle.style}) — Slot ${slotId}`;

                      return (
                        <button
                          key={slotId}
                          type="button"
                          onClick={() => onSlotClick(slotId, bottle)}
                          title={fullTitle}
                          className={`flex flex-col justify-between p-1.5 sm:p-2 rounded-xl border text-left transition-all duration-150 h-[74px] sm:h-[76px] w-full min-w-[76px] overflow-hidden relative group cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-slate-900 bg-white border-slate-900 shadow-md z-10'
                              : matchesFilter
                              ? 'bg-white hover:border-slate-400 hover:shadow-xs border-slate-200'
                              : 'bg-slate-50/70 border-slate-100 opacity-25 grayscale hover:opacity-100'
                          }`}
                        >
                          {/* Row 1: Vintage Year + VarietalBadge */}
                          <div className="flex items-center gap-1.5 w-full min-w-0">
                            <span className="text-xs font-semibold text-stone-700 shrink-0 leading-none tabular-nums">
                              {bottle.vintage === 'NV' ? 'NV' : bottle.vintage}
                            </span>
                            <VarietalBadge
                              varietal={bottle.varietal || 'Blend'}
                              styleKey={bottle.style}
                              size="xs"
                              truncate
                            />
                          </div>

                          {/* Row 2: Producer Name */}
                          <div className="w-full min-w-0">
                            <p className="font-bold text-stone-900 text-sm leading-tight truncate">
                              {bottle.producer}
                            </p>
                          </div>

                          {/* Row 3: Wine Name (or Wine Style if name absent) */}
                          <div className="w-full min-w-0">
                            <p className="text-xs text-stone-600 truncate">
                              {bottle.wineName || bottle.style}
                            </p>
                          </div>
                        </button>
                      );
                    }

                    // Queued Bottle Placement State (Optimistic Preview during multi-bottle allocation)
                    const queuedInfo = queuedSlotsMap?.get(slotId);
                    if (queuedInfo) {
                      const qBottle = queuedInfo.bottle;
                      const qIndex = queuedInfo.queueIndex;

                      return (
                        <button
                          key={slotId}
                          type="button"
                          onClick={() => onSlotClick(slotId)}
                          title={`Queued bottle #${qIndex}: ${qBottle.producer}${qBottle.wineName ? ` · ${qBottle.wineName}` : ''} (${slotId}). Tap to remove (undo).`}
                          className="flex flex-col justify-between p-1.5 sm:p-2 rounded-xl border border-rose-400 ring-2 ring-rose-500/80 bg-rose-50/70 text-left transition-all duration-150 h-[74px] sm:h-[76px] w-full min-w-[76px] overflow-hidden relative group cursor-pointer shadow-xs animate-in fade-in"
                        >
                          <div className="flex items-center justify-between gap-1 w-full min-w-0">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-[9px] sm:text-[10px] font-mono font-bold text-rose-900 bg-rose-200/80 border border-rose-300 rounded px-1 leading-none shrink-0">
                                #{qIndex}
                              </span>
                              <VarietalBadge
                                varietal={qBottle.varietal || 'Blend'}
                                styleKey={qBottle.style}
                                size="xs"
                                truncate
                              />
                            </div>
                            <span className="text-[8px] font-mono text-rose-700 font-bold group-hover:underline shrink-0">
                              Undo
                            </span>
                          </div>

                          <div className="w-full min-w-0">
                            <p className="font-bold text-stone-900 text-sm leading-tight truncate">
                              {qBottle.producer}
                            </p>
                          </div>

                          <div className="w-full min-w-0">
                            <p className="text-xs text-rose-950 truncate">
                              {qBottle.wineName || qBottle.style}
                            </p>
                          </div>
                        </button>
                      );
                    }

                    // Empty Slot State
                    return (
                      <button
                        key={slotId}
                        type="button"
                        onClick={() => {
                          if (onEmptySlotTapToAdd) onEmptySlotTapToAdd(slotId);
                          else onSlotClick(slotId);
                        }}
                        title={`Slot ${slotId} is empty. Tap to add a bottle.`}
                        className={`h-[74px] sm:h-[76px] rounded-xl border border-dashed text-left p-1.5 sm:p-2 flex flex-col justify-between transition-all duration-150 w-full min-w-[76px] overflow-hidden cursor-pointer group ${
                          isSelected
                            ? 'border-slate-800 bg-slate-50 ring-2 ring-slate-900 shadow-xs'
                            : 'border-slate-200 hover:border-slate-400 bg-slate-50/30 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 group-hover:text-slate-600 font-medium">
                            R{rowStr}·C{colStr}
                          </span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 group-hover:text-slate-700">
                            <Plus className="w-3 h-3" />
                          </span>
                        </div>

                        <div className="my-auto flex items-center justify-center">
                          <div className="w-4 h-4 rounded-full border border-dashed border-slate-300 group-hover:border-slate-500 group-hover:bg-white flex items-center justify-center text-slate-300 group-hover:text-slate-600 transition-colors">
                            <Plus className="w-2.5 h-2.5" />
                          </div>
                        </div>

                        <span className="text-[8px] sm:text-[9px] text-slate-300 group-hover:text-slate-500 text-center font-medium leading-none">
                          Empty
                        </span>
                      </button>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
