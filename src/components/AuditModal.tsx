/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bottle, SlotId, formatSlotLabel, WINE_STYLES } from '../types/cellar';
import { CheckCircle2, AlertTriangle, X, Check, ArrowRight, RefreshCw, Wine } from 'lucide-react';

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  bottles: Bottle[];
  onMarkDrunk: (bottleId: string) => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({
  isOpen,
  onClose,
  bottles,
  onMarkDrunk,
}) => {
  const [activeRack, setActiveRack] = useState<'A' | 'B'>('A');
  const [reconciledCount, setReconciledCount] = useState(0);

  if (!isOpen) return null;

  // Filter occupied bottles in current rack, sorted by slot coordinate
  const rackBottles = bottles
    .filter((b) => b.slotId?.startsWith(`${activeRack}-`) && b.status === 'in-cellar')
    .sort((a, b) => (a.slotId || '').localeCompare(b.slotId || ''));

  const handleBottleDrunk = (bottleId: string) => {
    onMarkDrunk(bottleId);
    setReconciledCount((c) => c + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Cellar Reconciliation Audit
              </h3>
              <p className="text-xs text-slate-500">
                Audit physical bottles against digital map to eliminate inventory drift
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rack Selector */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveRack('A')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeRack === 'A'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Audit Rack A ({bottles.filter((b) => b.slotId?.startsWith('A-')).length} bottles)
            </button>
            <button
              onClick={() => setActiveRack('B')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeRack === 'B'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Audit Rack B ({bottles.filter((b) => b.slotId?.startsWith('B-')).length} bottles)
            </button>
          </div>
        </div>

        {/* Audit List Body */}
        <div className="p-6 overflow-y-auto space-y-3">
          {rackBottles.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Rack {activeRack} currently has no assigned bottles to audit.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-slate-400 font-mono mb-2">
                Checking Rack {activeRack} (Top to bottom, left to right):
              </div>

              {rackBottles.map((bottle) => {
                const styleMeta = WINE_STYLES[bottle.style] || WINE_STYLES['Medium-Bodied Red Wine'];

                return (
                  <div
                    key={bottle.id}
                    className="p-3 rounded-2xl border border-slate-200 bg-white shadow-xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="px-2 py-1 bg-slate-100 rounded-lg text-slate-800 font-mono font-bold text-xs shrink-0">
                        {bottle.slotId}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: styleMeta.dotColor }}
                          />
                          <span className="font-mono font-bold text-slate-700">
                            {bottle.vintage}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{bottle.style}</span>
                          {bottle.varietal && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60">
                                {bottle.varietal}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {bottle.producer} {bottle.wineName ? `· ${bottle.wineName}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleBottleDrunk(bottle.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1"
                        title="Mark as drunk if physical slot is empty"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Mark Drunk</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-mono">
            {reconciledCount > 0 ? (
              <span className="text-emerald-700 font-semibold">
                ✓ Reconciled {reconciledCount} missing {reconciledCount === 1 ? 'bottle' : 'bottles'}
              </span>
            ) : (
              'Review slots to ensure physical rack matches digital records'
            )}
          </div>
          <button
            onClick={onClose}
            className="py-2 px-5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Done Auditing
          </button>
        </div>
      </div>
    </div>
  );
};
