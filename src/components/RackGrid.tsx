/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Bottle,
  SlotId,
  StorageUnit,
  WINE_STYLES,
  WineStyle,
  normalizeWineStyle,
  getUnitSlotPrefix,
  getBottleMaturity,
  DrinkingWindowMaturityStatus,
} from '../types/cellar';
import { RackCapacityHeader } from './ui/RackCapacityHeader';
import { GridCoordinateBadge } from './ui/GridCoordinateBadge';
import { Plus, LayoutGrid, Grid3x3, SlidersHorizontal } from 'lucide-react';

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
  const [densityMode, setDensityMode] = useState<'detail' | 'minimap'>('detail');
  const [inspectedSlotId, setInspectedSlotId] = useState<SlotId | null>(null);

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
  const occupancyPct = totalSlots > 0 ? Math.round((rackOccupiedCount / totalSlots) * 100) : 0;

  const hasActiveFilter =
    highlightStyle !== 'all' ||
    highlightWindow !== 'all' ||
    highlightVarietal !== 'all' ||
    searchQuery.trim() !== '';

  // Active inspected slot in Minimap mode (defaults to selectedSlotId or first occupied bottle)
  const effectiveInspectedSlotId = useMemo(() => {
    if (inspectedSlotId && inspectedSlotId.startsWith(`${rackPrefix}-`)) {
      return inspectedSlotId;
    }
    if (selectedSlotId && selectedSlotId.startsWith(`${rackPrefix}-`)) {
      return selectedSlotId;
    }
    const firstKey = slotBottleMap.keys().next().value as SlotId | undefined;
    return firstKey || `${rackPrefix}-R01-C01`;
  }, [inspectedSlotId, selectedSlotId, rackPrefix, slotBottleMap]);

  const inspectedBottle = slotBottleMap.get(effectiveInspectedSlotId);
  const inspectedMaturity = inspectedBottle ? getBottleMaturity(inspectedBottle) : null;

  const isFluidDetail = densityMode === 'detail' && unit.columns <= 3;
  const isMinimap = densityMode === 'minimap';

  const gridTemplateColumns = isMinimap
    ? `28px repeat(${unit.columns}, minmax(22px, 1fr))`
    : isFluidDetail
    ? `32px repeat(${unit.columns}, minmax(0, 1fr))`
    : `32px repeat(${unit.columns}, minmax(76px, 1fr))`;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs p-2 sm:p-5 transition-all">
      {/* Compact Mobile Bar (< sm) + Full RackCapacityHeader (sm+) */}
      <div className="mb-2 sm:mb-3">
        <div className="flex sm:hidden items-center justify-between gap-2 px-1 py-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-bold text-slate-900 truncate">{unit.name}</span>
            <span className="text-[11px] font-mono text-slate-500 shrink-0 tabular-nums">
              {rackOccupiedCount}/{totalSlots} · {occupancyPct}%
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
              <button
                type="button"
                onClick={() => setDensityMode('detail')}
                className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer inline-flex items-center gap-1 ${
                  densityMode === 'detail'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
                <span>Detail</span>
              </button>
              <button
                type="button"
                onClick={() => setDensityMode('minimap')}
                className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer inline-flex items-center gap-1 ${
                  densityMode === 'minimap'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Grid3x3 className="w-3 h-3" />
                <span>Minimap</span>
              </button>
            </div>

            {onManageRack && (
              <button
                type="button"
                onClick={() => onManageRack(unit)}
                aria-label="Manage Racks"
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="hidden sm:flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <RackCapacityHeader
              rackId={rackPrefix}
              rackName={`${unit.name} (${unit.columns} × ${unit.rows} Grid)`}
              occupiedSlots={rackOccupiedCount}
              totalSlots={totalSlots}
              onManageRacks={onManageRack ? () => onManageRack(unit) : undefined}
            />
          </div>
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => setDensityMode('detail')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                densityMode === 'detail'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Detail</span>
            </button>
            <button
              type="button"
              onClick={() => setDensityMode('minimap')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                densityMode === 'minimap'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Grid3x3 className="w-3.5 h-3.5" />
              <span>Minimap</span>
            </button>
          </div>
        </div>
      </div>

      {/* Option A: Pinned Inspector Bar for Minimap Mode */}
      {isMinimap && (
        <div className="mb-2 rounded-xl bg-slate-900 text-white px-3 py-2 flex items-center justify-between gap-2.5 shadow-xs">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <span>{effectiveInspectedSlotId.replace(`${rackPrefix}-`, '')}</span>
              <span>·</span>
              <span>{inspectedBottle ? 'SELECTED' : 'EMPTY SLOT'}</span>
              {inspectedMaturity?.status === 'peak' && (
                <span className="text-emerald-400 font-semibold">· ★ Peak</span>
              )}
            </div>
            {inspectedBottle ? (
              <>
                <p className="text-xs font-bold text-white truncate">
                  {inspectedBottle.vintage === 'NV' ? 'NV' : inspectedBottle.vintage}{' '}
                  {inspectedBottle.producer}
                  {inspectedBottle.wineName ? ` · ${inspectedBottle.wineName}` : ''}
                </p>
                <p className="text-[11px] text-slate-300 truncate">
                  {inspectedBottle.varietal || inspectedBottle.style}
                </p>
              </>
            ) : (
              <p className="text-xs font-semibold text-slate-200 truncate">
                Available rack slot — tap Open to add a bottle
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (inspectedBottle) {
                onSlotClick(effectiveInspectedSlotId, inspectedBottle);
              } else if (onEmptySlotTapToAdd) {
                onEmptySlotTapToAdd(effectiveInspectedSlotId);
              } else {
                onSlotClick(effectiveInspectedSlotId);
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold shrink-0 cursor-pointer"
          >
            {inspectedBottle ? 'Open' : 'Add'}
          </button>
        </div>
      )}

      {/* Freeze-Pane Grid Container: h-auto hugs short racks (1-4 rows), scrolls tall racks (5-25 rows) with sticky Col & Row headers */}
      <div className="relative">
        <div className="overflow-auto max-h-[calc(100dvh-235px)] sm:max-h-[68vh] pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-slate-200 overscroll-contain">
          <div
            className={isMinimap || isFluidDetail ? 'w-full' : 'w-max min-w-full'}
            style={
              isMinimap || isFluidDetail
                ? undefined
                : { minWidth: `calc(32px + ${unit.columns} * 76px + ${unit.columns} * 6px)` }
            }
          >
            <div
              className="grid gap-1 sm:gap-1.5 items-center"
              style={{ gridTemplateColumns }}
            >
              {/* Top-left Sticky Corner */}
              <div
                className="h-6 sticky top-0 left-0 z-30 bg-white select-none"
                aria-hidden="true"
              />

              {/* Sticky Column Headers */}
              {cols.map((col) => (
                <div
                  key={`header-col-${col}`}
                  className="h-6 sticky top-0 z-20 flex items-center justify-center bg-white/95 backdrop-blur-xs select-none"
                >
                  {isMinimap && unit.columns >= 7 ? (
                    <span className="text-[9px] font-mono font-bold text-slate-400">
                      C{col}
                    </span>
                  ) : (
                    <GridCoordinateBadge type="col" index={col} />
                  )}
                </div>
              ))}

              {/* Dynamic Rows × Columns */}
              {rows.map((row) => {
                const rowStr = row < 10 ? `0${row}` : `${row}`;
                const isEvenRow = row % 2 === 0;

                return (
                  <React.Fragment key={`rack-${rackPrefix}-row-${row}`}>
                    {/* Sticky Row Indicator */}
                    <div
                      className={`${
                        isMinimap ? 'h-[30px]' : 'h-[74px] sm:h-[76px]'
                      } sticky left-0 z-20 bg-white border-r border-slate-200/80 flex items-center justify-center select-none shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]`}
                    >
                      <GridCoordinateBadge type="row" index={row} />
                    </div>

                    {/* Cell Slots */}
                    {cols.map((col) => {
                      const colStr = col < 10 ? `0${col}` : `${col}`;
                      const slotId = `${rackPrefix}-R${rowStr}-C${colStr}`;
                      const bottle = slotBottleMap.get(slotId);
                      const isSelected = isMinimap
                        ? effectiveInspectedSlotId === slotId
                        : selectedSlotId === slotId;

                      // Search / Filter matching
                      let matchesFilter = true;
                      const normalizedStyle = bottle
                        ? normalizeWineStyle(bottle.style)
                        : 'Medium-Bodied Red Wine';

                      if (highlightStyle !== 'all') {
                        matchesFilter =
                          matchesFilter && (bottle ? normalizedStyle === highlightStyle : false);
                      }
                      if (highlightWindow !== 'all') {
                        matchesFilter =
                          matchesFilter &&
                          (bottle ? getBottleMaturity(bottle)?.status === highlightWindow : false);
                      }
                      if (highlightVarietal !== 'all') {
                        matchesFilter =
                          matchesFilter &&
                          (bottle ? (bottle.varietal || 'Blend') === highlightVarietal : false);
                      }
                      if (searchQuery.trim() !== '' && bottle) {
                        const q = searchQuery.toLowerCase();
                        const matchName = (bottle.wineName || '').toLowerCase().includes(q);
                        const matchProd = bottle.producer.toLowerCase().includes(q);
                        const matchVarietal = (bottle.varietal || '').toLowerCase().includes(q);
                        const matchStyle =
                          normalizedStyle.toLowerCase().includes(q) ||
                          (bottle.style || '').toLowerCase().includes(q);
                        const matchVintage = String(bottle.vintage).includes(q);
                        matchesFilter =
                          matchesFilter &&
                          (matchName || matchProd || matchVarietal || matchStyle || matchVintage);
                      }

                      const styleMeta = bottle
                        ? WINE_STYLES[normalizedStyle] || WINE_STYLES['Medium-Bodied Red Wine']
                        : null;
                      const maturity = bottle ? getBottleMaturity(bottle) : null;
                      const isPeak = maturity?.status === 'peak';

                      // MINIMAP TILE RENDERER (Option A+B)
                      if (isMinimap) {
                        const dimmed = hasActiveFilter && (!bottle || !matchesFilter);
                        if (bottle) {
                          return (
                            <button
                              key={slotId}
                              type="button"
                              onClick={() => setInspectedSlotId(slotId)}
                              title={`${bottle.vintage} ${bottle.producer} (${slotId})`}
                              className={`h-[30px] w-full rounded-md border flex items-center justify-center relative transition-all cursor-pointer ${
                                styleMeta
                                  ? `${styleMeta.badgeBg} ${styleMeta.accentBorder}`
                                  : 'bg-rose-50 border-rose-200'
                              } ${
                                isSelected
                                  ? 'ring-2 ring-slate-900 ring-offset-1 z-10 scale-[1.04]'
                                  : ''
                              } ${dimmed ? 'opacity-20 grayscale' : 'opacity-100'}`}
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: styleMeta?.dotColor || '#881337' }}
                              />
                              {isPeak && (
                                <span
                                  className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500"
                                  aria-label="Peak Drinking Window"
                                />
                              )}
                            </button>
                          );
                        }

                        return (
                          <button
                            key={slotId}
                            type="button"
                            onClick={() => setInspectedSlotId(slotId)}
                            title={`Empty slot ${slotId}`}
                            className={`h-[30px] w-full rounded-md border border-dashed border-slate-200 bg-slate-50/70 transition-all cursor-pointer ${
                              isSelected ? 'ring-2 ring-slate-900 ring-offset-1 z-10' : ''
                            } ${hasActiveFilter ? 'opacity-20' : ''}`}
                          />
                        );
                      }

                      // DETAIL MODE: OCCUPIED CELL (P0: plain dot + vintage + varietal, 12px 2-line producer, Peak indicator)
                      if (bottle) {
                        const fullTitle = `${
                          bottle.vintage === 'NV' ? 'NV' : bottle.vintage
                        } ${bottle.producer}${bottle.wineName ? ` · ${bottle.wineName}` : ''}${
                          bottle.varietal ? ` [${bottle.varietal}]` : ''
                        } (${bottle.style}) — Slot ${slotId}`;

                        return (
                          <button
                            key={slotId}
                            type="button"
                            onClick={() => onSlotClick(slotId, bottle)}
                            title={fullTitle}
                            className={`flex flex-col justify-between p-1.5 rounded-xl border text-left transition-all duration-150 h-[74px] sm:h-[76px] w-full overflow-hidden relative group cursor-pointer ${
                              isPeak ? 'border-l-[3px] border-l-emerald-500' : ''
                            } ${
                              isSelected
                                ? 'ring-2 ring-slate-900 bg-white border-slate-900 shadow-md z-10'
                                : matchesFilter
                                ? `${
                                    isEvenRow ? 'bg-slate-50/50' : 'bg-white'
                                  } hover:border-slate-400 hover:shadow-xs border-slate-200`
                                : 'bg-slate-50/70 border-slate-100 opacity-25 grayscale hover:opacity-100'
                            }`}
                          >
                            {isPeak && (
                              <span
                                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
                                title="Peak Drinking Window"
                              />
                            )}

                            {/* Row 1: Style Dot + Vintage + Varietal */}
                            <div className="flex items-center gap-1 w-full min-w-0 pr-2">
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: styleMeta?.dotColor || '#881337' }}
                              />
                              <span className="text-[11px] font-mono font-bold text-stone-800 shrink-0 leading-none tabular-nums">
                                {bottle.vintage === 'NV' ? 'NV' : bottle.vintage}
                              </span>
                              <span className="text-[10px] font-medium text-stone-500 truncate leading-none">
                                {bottle.varietal || 'Blend'}
                              </span>
                            </div>

                            {/* Row 2: Producer Name (12px bold, up to 2 lines) */}
                            <div className="w-full min-w-0">
                              <p className="font-bold text-stone-900 text-xs leading-tight line-clamp-2">
                                {bottle.producer}
                              </p>
                            </div>

                            {/* Row 3: Wine Name / Style */}
                            <div className="w-full min-w-0">
                              <p className="text-[10px] text-stone-500 truncate leading-none">
                                {bottle.wineName || bottle.style}
                              </p>
                            </div>
                          </button>
                        );
                      }

                      // Queued Bottle Placement State
                      const queuedInfo = queuedSlotsMap?.get(slotId);
                      if (queuedInfo) {
                        const qBottle = queuedInfo.bottle;
                        const qIndex = queuedInfo.queueIndex;

                        return (
                          <button
                            key={slotId}
                            type="button"
                            onClick={() => onSlotClick(slotId)}
                            title={`Queued bottle #${qIndex}: ${qBottle.producer}${
                              qBottle.wineName ? ` · ${qBottle.wineName}` : ''
                            } (${slotId}). Tap to remove (undo).`}
                            className="flex flex-col justify-between p-1.5 rounded-xl border border-rose-400 ring-2 ring-rose-500/80 bg-rose-50/70 text-left transition-all duration-150 h-[74px] sm:h-[76px] w-full overflow-hidden relative group cursor-pointer shadow-xs animate-in fade-in"
                          >
                            <div className="flex items-center justify-between gap-1 w-full min-w-0">
                              <span className="text-[10px] font-mono font-bold text-rose-900 bg-rose-200/80 border border-rose-300 rounded px-1 leading-none shrink-0">
                                #{qIndex}
                              </span>
                              <span className="text-[9px] font-mono text-rose-700 font-bold group-hover:underline shrink-0">
                                Undo
                              </span>
                            </div>

                            <div className="w-full min-w-0">
                              <p className="font-bold text-stone-900 text-xs leading-tight line-clamp-2">
                                {qBottle.producer}
                              </p>
                            </div>

                            <div className="w-full min-w-0">
                              <p className="text-[10px] text-rose-950 truncate leading-none">
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
                          className={`h-[74px] sm:h-[76px] rounded-xl border border-dashed text-left p-1.5 flex flex-col justify-between transition-all duration-150 w-full overflow-hidden cursor-pointer group ${
                            isSelected
                              ? 'border-slate-800 bg-slate-50 ring-2 ring-slate-900 shadow-xs'
                              : `border-slate-200 hover:border-slate-400 ${
                                  isEvenRow ? 'bg-slate-50/60' : 'bg-slate-50/20'
                                } hover:bg-slate-50`
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

        {/* Subtle right-edge scroll fade on wide racks in Detail mode */}
        {!isMinimap && !isFluidDetail && unit.columns >= 5 && (
          <div
            className="pointer-events-none absolute top-0 right-0 bottom-0 w-4 bg-gradient-to-l from-white/90 to-transparent z-30"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
};
