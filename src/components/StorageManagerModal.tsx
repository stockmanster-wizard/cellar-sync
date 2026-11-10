/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { StorageUnit, Bottle, parseSlotCoordinates, isSlotInUnit } from '../types/cellar';
import { X, Plus, Trash2, Check, AlertCircle, Layers, SlidersHorizontal, Info, ShieldAlert, Sparkles } from 'lucide-react';

interface StorageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  storageUnits: StorageUnit[];
  bottles: Bottle[];
  onAddUnit: (data: { name: string; columns: number; rows: number }) => StorageUnit;
  onUpdateUnit: (id: string, patch: { name?: string; columns?: number; rows?: number }) => { success: boolean; error?: string };
  onDeleteUnit: (id: string) => { success: boolean; error?: string };
  initialEditingUnitId?: string | null;
}

export const StorageManagerModal: React.FC<StorageManagerModalProps> = ({
  isOpen,
  onClose,
  storageUnits,
  bottles,
  onAddUnit,
  onUpdateUnit,
  onDeleteUnit,
  initialEditingUnitId,
}) => {
  const [activeTab, setActiveTab] = useState<'add' | 'manage'>(initialEditingUnitId ? 'manage' : 'add');

  // Form State for New Unit
  const [newName, setNewName] = useState('');
  const [newColumns, setNewColumns] = useState<number>(4);
  const [newRows, setNewRows] = useState<number>(12);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Editing state for existing units
  const [editingId, setEditingId] = useState<string | null>(initialEditingUnitId || null);
  const [editName, setEditName] = useState('');
  const [editColumns, setEditColumns] = useState<number>(4);
  const [editRows, setEditRows] = useState<number>(12);

  // Synchronize modal tab and editing state when opened for a specific rack
  useEffect(() => {
    if (isOpen) {
      setErrorBanner(null);
      setSuccessBanner(null);
      if (initialEditingUnitId) {
        setActiveTab('manage');
        setEditingId(initialEditingUnitId);
        const targetUnit = storageUnits.find((u) => u.id === initialEditingUnitId);
        if (targetUnit) {
          setEditName(targetUnit.name);
          setEditColumns(targetUnit.columns);
          setEditRows(targetUnit.rows);
        }
      } else {
        setActiveTab('add');
        setEditingId(null);
      }
    }
  }, [isOpen, initialEditingUnitId, storageUnits]);

  if (!isOpen) return null;

  const handleStartEdit = (unit: StorageUnit) => {
    setEditingId(unit.id);
    setEditName(unit.name);
    setEditColumns(unit.columns);
    setEditRows(unit.rows);
    setErrorBanner(null);
    setSuccessBanner(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);

    const cols = Math.max(1, Math.min(12, Number(newColumns) || 4));
    const rows = Math.max(1, Math.min(25, Number(newRows) || 12));
    const name = newName.trim() || `Rack ${storageUnits.filter((u) => !u.is_staging).length + 1}`;

    try {
      const created = onAddUnit({ name, columns: cols, rows });
      setSuccessBanner(`Created ${created.name} (${cols} × ${rows})`);
      setNewName('');
      setNewColumns(4);
      setNewRows(12);
      setTimeout(() => {
        setSuccessBanner(null);
        setActiveTab('manage');
        setEditingId(created.id);
      }, 1000);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to create storage rack.');
    }
  };

  const handleSaveEdit = (unit: StorageUnit) => {
    setErrorBanner(null);
    setSuccessBanner(null);

    const cols = Math.max(1, Math.min(12, Number(editColumns) || unit.columns));
    const rows = Math.max(1, Math.min(25, Number(editRows) || unit.rows));
    const name = editName.trim() || unit.name;

    const res = onUpdateUnit(unit.id, { name, columns: cols, rows });
    if (!res.success) {
      setErrorBanner(res.error || 'Failed to update rack dimensions.');
      return;
    }

    setSuccessBanner(`Updated ${name} to ${cols} × ${rows}`);
    setEditingId(null);
    setTimeout(() => setSuccessBanner(null), 2500);
  };

  const handleDelete = (unit: StorageUnit) => {
    setErrorBanner(null);
    setSuccessBanner(null);

    if (unit.is_staging) {
      setErrorBanner('The Staging Shelf is a permanent area and cannot be deleted.');
      return;
    }

    const res = onDeleteUnit(unit.id);
    if (!res.success) {
      setErrorBanner(res.error || 'Cannot delete this rack.');
      return;
    }

    setSuccessBanner(`Deleted ${unit.name}`);
    if (editingId === unit.id) setEditingId(null);
    setTimeout(() => setSuccessBanner(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Layers className="w-4 h-4 text-rose-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Cellar Storage Units & Racks
              </h2>
              <p className="text-xs text-slate-500">
                Customizable physical grids & flexible staging
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

        {/* Tab Switcher */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('add');
              setErrorBanner(null);
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'add'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add New Rack</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('manage');
              setErrorBanner(null);
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'manage'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Manage Racks ({storageUnits.length})</span>
          </button>
        </div>

        {/* Status Banners */}
        {errorBanner && (
          <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-900 animate-in fade-in">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="flex-1 font-medium">{errorBanner}</span>
          </div>
        )}
        {successBanner && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-900 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="flex-1 font-semibold">{successBanner}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* TAB 1: ADD NEW RACK */}
          {activeTab === 'add' && (
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Form Controls */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Storage Name / Location <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Rack C, Wine Fridge, Credenza"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none font-medium"
                      required
                    />
                  </div>

                  {/* Columns (1-12) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Columns (Width)
                      </label>
                      <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                        {newColumns} {newColumns === 1 ? 'Column' : 'Columns'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={12}
                      value={newColumns}
                      onChange={(e) => setNewColumns(Number(e.target.value))}
                      className="w-full accent-slate-900 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                      <span>1 col (narrow)</span>
                      <span>4 cols (std)</span>
                      <span>12 cols (max)</span>
                    </div>
                  </div>

                  {/* Rows (1-25) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Rows (Height)
                      </label>
                      <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                        {newRows} {newRows === 1 ? 'Row' : 'Rows'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={25}
                      value={newRows}
                      onChange={(e) => setNewRows(Number(e.target.value))}
                      className="w-full accent-slate-900 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                      <span>1 row</span>
                      <span>12 rows (std)</span>
                      <span>25 rows (max)</span>
                    </div>
                  </div>

                  {/* Dimension Stats & Responsive Info */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-slate-500">Total Capacity:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {newColumns * newRows} bottles ({newColumns} × {newRows})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        {newColumns <= 4
                          ? '✓ 1–4 columns: Fits mobile viewport smoothly without scrolling.'
                          : '↔ 5–12 columns: Protected 76px cell width safeguard with horizontal scrolling.'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-rose-300" />
                    <span>Create Storage Unit</span>
                  </button>
                </div>

                {/* Real-Time Visual Dimension Preview (Requirement 2) */}
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-3 pb-2 border-b border-slate-200 text-xs">
                    <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      Live Dimension Preview
                    </span>
                    <span className="font-mono text-slate-500 text-[11px]">
                      {newColumns}W × {newRows}H
                    </span>
                  </div>

                  {/* Scaled Visual Grid */}
                  <div className="w-full flex items-center justify-center min-h-[200px] max-h-[280px] p-2 overflow-hidden">
                    <div
                      className="border border-amber-900/30 rounded-xl p-2 bg-[#fdfbf7] shadow-xs flex flex-col gap-1 max-w-[240px] w-full"
                      style={{
                        aspectRatio: `${Math.max(1, newColumns)} / ${Math.min(18, newRows)}`,
                      }}
                    >
                      {/* Mini column header bars */}
                      <div
                        className="grid gap-0.5 text-center text-[7px] font-mono text-stone-400"
                        style={{ gridTemplateColumns: `repeat(${newColumns}, 1fr)` }}
                      >
                        {Array.from({ length: newColumns }, (_, i) => (
                          <div key={i} className="bg-amber-100/60 rounded-xs py-0.5">
                            C{i + 1}
                          </div>
                        ))}
                      </div>

                      {/* Mini Grid Cells */}
                      <div
                        className="grid gap-0.5 flex-1 overflow-hidden"
                        style={{
                          gridTemplateColumns: `repeat(${newColumns}, 1fr)`,
                          gridTemplateRows: `repeat(${Math.min(12, newRows)}, 1fr)`,
                        }}
                      >
                        {Array.from({ length: Math.min(newColumns * newRows, 72) }, (_, i) => (
                          <div
                            key={i}
                            className="bg-amber-50/70 border border-amber-900/15 rounded-xs flex items-center justify-center"
                          >
                            <div className="w-1 h-1 rounded-full bg-amber-900/20" />
                          </div>
                        ))}
                      </div>

                      {newRows > 12 && (
                        <p className="text-[8px] font-mono text-stone-400 text-center">
                          +{newRows - 12} more rows
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 text-center mt-2 font-mono">
                    {newName || 'Untitled'} · {newColumns * newRows} Capacity
                  </p>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: MANAGE EXISTING UNITS */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Configure names and grid dimensions for your cellar units. Racks with active bottles cannot be deleted or shrunken beyond occupied coordinates.
              </p>

              <div className="space-y-3">
                {storageUnits.map((unit) => {
                  const isStaging = unit.is_staging;
                  const bottlesInUnit = bottles.filter((b) =>
                    isStaging ? b.status === 'staging' : isSlotInUnit(b.slotId, unit) && b.status === 'in-cellar'
                  );
                  const isEditing = editingId === unit.id;
                  const totalSlots = isStaging ? 12 : unit.columns * unit.rows;

                  // Safety checks
                  const hasBottles = bottlesInUnit.length > 0;

                  // Max occupied coordinates if physical rack
                  let maxRowOccupied = 0;
                  let maxColOccupied = 0;
                  if (!isStaging) {
                    bottlesInUnit.forEach((b) => {
                      const coords = parseSlotCoordinates(b.slotId);
                      if (coords && !coords.isStaging) {
                        if (coords.row > maxRowOccupied) maxRowOccupied = coords.row;
                        if (coords.col > maxColOccupied) maxColOccupied = coords.col;
                      }
                    });
                  }

                  const wouldDisplaceBottles =
                    isEditing &&
                    !isStaging &&
                    (editRows < maxRowOccupied || editColumns < maxColOccupied);

                  return (
                    <div
                      key={unit.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isEditing
                          ? 'bg-slate-50 border-slate-900 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {!isEditing ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-bold font-mono text-xs text-slate-800">
                              {unit.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900">
                                  {unit.name}
                                </h4>
                                {isStaging && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                    Permanent Staging
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 font-mono">
                                {isStaging
                                  ? 'Flexible unslotted storage (12 bins)'
                                  : `${unit.columns} Cols × ${unit.rows} Rows (${totalSlots} slots)`}{' '}
                                · <span className="font-bold text-slate-700">{bottlesInUnit.length}</span> bottles stored
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {!isStaging && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(unit)}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                              >
                                Edit Dimensions
                              </button>
                            )}

                            {!isStaging && (
                              <button
                                type="button"
                                onClick={() => handleDelete(unit)}
                                disabled={hasBottles}
                                title={
                                  hasBottles
                                    ? `Cannot delete: holds ${bottlesInUnit.length} active bottles. Move them first.`
                                    : 'Delete empty storage unit'
                                }
                                className={`p-2 rounded-xl border transition-colors ${
                                  hasBottles
                                    ? 'opacity-40 cursor-not-allowed text-slate-400 bg-slate-50 border-slate-200'
                                    : 'text-red-600 hover:bg-red-50 border-slate-200 hover:border-red-200 cursor-pointer'
                                }`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Editing Form for this unit */
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                              Configure {unit.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="text-xs text-slate-400 hover:text-slate-600"
                            >
                              Cancel
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Name
                              </label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-semibold text-slate-700">
                                  Columns (1–12)
                                </label>
                                <span className="text-xs font-mono font-bold text-slate-800">
                                  {editColumns}
                                </span>
                              </div>
                              <input
                                type="range"
                                min={1}
                                max={12}
                                value={editColumns}
                                onChange={(e) => setEditColumns(Number(e.target.value))}
                                className="w-full accent-slate-900 cursor-pointer"
                              />
                              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                                <span>1 col (narrow)</span>
                                <span>4 cols (std)</span>
                                <span>12 cols (max)</span>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-semibold text-slate-700">
                                  Rows (1–25)
                                </label>
                                <span className="text-xs font-mono font-bold text-slate-800">
                                  {editRows}
                                </span>
                              </div>
                              <input
                                type="range"
                                min={1}
                                max={25}
                                value={editRows}
                                onChange={(e) => setEditRows(Number(e.target.value))}
                                className="w-full accent-slate-900 cursor-pointer"
                              />
                            </div>
                          </div>

                          {/* Safety Warning if Bottles Would be Displaced (Requirement 4) */}
                          {wouldDisplaceBottles && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold block">Cannot resize smaller</span>
                                <span>
                                  Bottles currently occupy slots up to Row {maxRowOccupied}, Col {maxColOccupied}. Move them to the Staging Shelf before reducing dimensions.
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(unit)}
                              disabled={wouldDisplaceBottles}
                              className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 ${
                                wouldDisplaceBottles
                                  ? 'bg-slate-300 cursor-not-allowed'
                                  : 'bg-slate-900 hover:bg-slate-800 cursor-pointer'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Save Dimensions</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Staging shelf is permanent for intake & flexibility.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
