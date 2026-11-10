/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bottle, SlotId, StorageUnit, DEFAULT_STORAGE_UNITS, formatSlotLabel, generateUnitSlots, isSlotInUnit } from '../types/cellar';
import { ArrowRightLeft, X, Check, Layers, AlertCircle } from 'lucide-react';

interface MoveBottleModalProps {
  bottle: Bottle;
  isOpen: boolean;
  onClose: () => void;
  onMove: (bottleId: string, newSlotId: SlotId) => void;
  allBottles: Bottle[];
  storageUnits?: StorageUnit[];
}

export const MoveBottleModal: React.FC<MoveBottleModalProps> = ({
  bottle,
  isOpen,
  onClose,
  onMove,
  allBottles,
  storageUnits,
}) => {
  const units = storageUnits && storageUnits.length > 0 ? storageUnits : DEFAULT_STORAGE_UNITS;
  const initialUnit = units.find((u) => isSlotInUnit(bottle.slotId, u)) || units[0];
  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialUnit.id);
  const [selectedSlot, setSelectedSlot] = useState<SlotId | null>(null);

  if (!isOpen) return null;

  const activeUnit = units.find((u) => u.id === selectedUnitId) || units[0];

  // Build slot occupancy lookup
  const occupancyMap = new Map<SlotId, Bottle>();
  allBottles.forEach((b) => {
    if (b.slotId && b.id !== bottle.id && b.status !== 'consumed') {
      occupancyMap.set(b.slotId, b);
    }
  });

  const slots = generateUnitSlots(activeUnit);
  const currentSlotLabel = bottle.slotId ? formatSlotLabel(bottle.slotId, units) : 'Unassigned (Staging)';
  const targetBottle = selectedSlot ? occupancyMap.get(selectedSlot) : undefined;

  const handleConfirm = () => {
    if (!selectedSlot) return;
    onMove(bottle.id, selectedSlot);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Move Bottle
              </h3>
              <p className="text-xs text-slate-500">
                Currently in <span className="font-semibold text-slate-800">{currentSlotLabel}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-xs font-bold text-slate-900">
              {bottle.producer} {bottle.wineName ? `· ${bottle.wineName}` : ''} ({bottle.vintage})
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {bottle.style} · {bottle.region}
            </div>
          </div>

          {/* Unit Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Destination Storage Unit
            </label>
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
              {units.map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => {
                    setSelectedUnitId(unit.id);
                    setSelectedSlot(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    selectedUnitId === unit.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {unit.name} {!unit.is_staging ? `(${unit.columns}×${unit.rows})` : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Slots Grid */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Choose target slot in {activeUnit.name}:</span>
              <span className="font-mono text-slate-800 font-semibold">
                {selectedSlot ? formatSlotLabel(selectedSlot, units) : 'Tap a slot'}
              </span>
            </div>

            <div
              className="max-h-56 overflow-y-auto p-2 border border-slate-200 rounded-2xl grid gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${Math.min(activeUnit.columns || 4, 6)}, minmax(0, 1fr))`,
              }}
            >
              {slots.map((slotId) => {
                const occupant = occupancyMap.get(slotId);
                const isSelected = selectedSlot === slotId;
                const isCurrent = bottle.slotId === slotId;

                return (
                  <button
                    key={slotId}
                    type="button"
                    disabled={isCurrent}
                    onClick={() => setSelectedSlot(slotId)}
                    className={`p-2 rounded-xl text-center text-xs font-mono transition-all border min-h-[48px] flex flex-col items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-sm'
                        : isCurrent
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                        : occupant
                        ? 'bg-amber-50/60 border-amber-200 text-amber-900 hover:border-amber-400'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold text-[10px]">
                      {slotId.includes('-R') ? slotId.split('-').slice(1).join('·') : slotId}
                    </span>
                    <span className="text-[9px] truncate max-w-full block mt-0.5 opacity-80">
                      {isCurrent ? 'Current' : occupant ? 'Swap' : 'Empty'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Swap Notice if Target Slot is Occupied */}
          {targetBottle && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2 text-xs text-amber-900 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Slot Swap Required</span>
                <span>
                  This slot currently holds{' '}
                  <span className="font-semibold">{targetBottle.producer} {targetBottle.wineName || ''}</span>. Moving here will automatically swap their positions.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedSlot}
            className={`px-5 py-2 text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 ${
              selectedSlot
                ? 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Confirm Move</span>
          </button>
        </div>
      </div>
    </div>
  );
};
