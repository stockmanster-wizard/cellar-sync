/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Bottle, SlotId, WINE_STYLES } from '../types/cellar';
import { Layers, Plus, ArrowRight, Wine } from 'lucide-react';

interface StagingShelfProps {
  bottles: Bottle[];
  selectedSlotId?: SlotId | null;
  onSlotClick: (slotId: SlotId, bottle?: Bottle) => void;
  onEmptySlotClick?: (slotId: SlotId) => void;
}

export const StagingShelf: React.FC<StagingShelfProps> = ({
  bottles,
  selectedSlotId,
  onSlotClick,
  onEmptySlotClick,
}) => {
  const stagingMap = useMemo(() => {
    const map = new Map<SlotId, Bottle>();
    bottles.forEach((b) => {
      if (b.status === 'staging' && b.slotId) {
        map.set(b.slotId, b);
      }
    });
    return map;
  }, [bottles]);

  const slots = Array.from({ length: 12 }, (_, i) => {
    const num = i + 1;
    const str = num < 10 ? `0${num}` : `${num}`;
    return `S-${str}`;
  });

  const occupiedCount = stagingMap.size;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-6 transition-all">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Staging Shelf & Countertop (12 Bins)
            </h3>
            <p className="text-xs text-slate-500">
              For incoming deliveries, magnums, or odd-shaped bottles awaiting rack assignment
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-slate-800 tabular-nums">
            {occupiedCount}
          </span>
          <span className="text-xs text-slate-400 font-mono"> / 12 slots</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {slots.map((slotId, index) => {
          const bottle = stagingMap.get(slotId);
          const isSelected = selectedSlotId === slotId;
          const styleMeta = bottle ? WINE_STYLES[bottle.style] || WINE_STYLES['Medium-Bodied Red Wine'] : null;

          if (bottle) {
            const fullTitle = `${bottle.producer}${bottle.wineName ? ` · ${bottle.wineName}` : ''} (${bottle.vintage === 'NV' ? 'NV' : bottle.vintage}) — Bin #${index + 1}`;

            return (
              <button
                key={slotId}
                onClick={() => onSlotClick(slotId, bottle)}
                className={`flex flex-col justify-between p-3 rounded-2xl border text-left transition-all duration-150 h-[96px] w-full min-w-0 relative group overflow-hidden ${
                  isSelected
                    ? 'ring-2 ring-slate-900 bg-white border-slate-900 shadow-md z-20'
                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-xs hover:z-20'
                }`}
                title={fullTitle}
              >
                <div className="flex items-center justify-between w-full min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: styleMeta?.dotColor || '#d97706' }}
                    />
                    <span className="text-[10px] font-mono text-slate-400">
                      #{index + 1}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-800 tabular-nums shrink-0">
                    {bottle.vintage === 'NV' ? 'NV' : bottle.vintage}
                  </span>
                </div>

                <div className="my-auto py-0.5 w-full min-w-0">
                  <div className="text-xs font-bold text-slate-900 leading-snug truncate w-full">
                    {bottle.producer}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 w-full min-w-0">
                    {bottle.varietal && (
                      <span className="inline-flex items-center text-[9px] font-semibold px-1 py-0 rounded bg-slate-100 text-slate-700 border border-slate-200/60 truncate shrink-0 max-w-[65px]">
                        {bottle.varietal}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 truncate w-full">
                      {bottle.wineName || bottle.style}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-1 mt-0.5 w-full min-w-0">
                  <span className="truncate">{bottle.country}</span>
                  <span className="text-slate-600 font-medium group-hover:text-slate-900 flex items-center gap-0.5 shrink-0">
                    Move <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            );
          }

          return (
            <button
              key={slotId}
              onClick={() => {
                if (onEmptySlotClick) onEmptySlotClick(slotId);
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border border-dashed text-center transition-all duration-150 h-[96px] w-full min-w-0 ${
                isSelected
                  ? 'border-slate-900 bg-slate-100 ring-2 ring-slate-900 z-10'
                  : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50/70 bg-slate-50/30'
              }`}
              title={`Empty staging slot: ${slotId}. Tap to place bottle.`}
            >
              <span className="text-[10px] font-mono text-slate-400">
                Bin #{index + 1}
              </span>
              <div className="mt-1 flex items-center justify-center text-slate-400 group-hover:text-slate-600">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-[9px] text-slate-400 mt-1">Empty Slot</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
