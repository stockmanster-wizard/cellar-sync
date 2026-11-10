/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Bottle,
  WineStyle,
  POPULAR_VARIETALS,
  getBottleReferenceProfile,
  getBottleConsumption,
} from '../types/cellar';
import { VintageSelect } from './VintageSelect';
import { HalfStarRating } from './HalfStarRating';
import { X, Check, Edit3, Trash2 } from 'lucide-react';

interface EditBottleModalProps {
  bottle: Bottle;
  isOpen: boolean;
  onClose: () => void;
  onSave: (bottleId: string, updates: Partial<Bottle>) => void;
  onDelete?: (bottleId: string) => void;
}

export const EditBottleModal: React.FC<EditBottleModalProps> = ({
  bottle,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const existingRefProfile = getBottleReferenceProfile(bottle);
  const existingConsumption = getBottleConsumption(bottle);
  const isConsumed = bottle.status === 'consumed';

  const [producer, setProducer] = useState(bottle.producer);
  const [wineName, setWineName] = useState(bottle.wineName || '');
  const [varietal, setVarietal] = useState(bottle.varietal || 'Red Blend');
  const [vintage, setVintage] = useState<string>(String(bottle.vintage));
  const [style, setStyle] = useState<WineStyle>(bottle.style);
  const [country, setCountry] = useState(bottle.country);
  const [region, setRegion] = useState(bottle.region);
  const [alcoholPercent, setAlcoholPercent] = useState<string>(
    bottle.alcoholPercent ? String(bottle.alcoholPercent) : ''
  );
  const [drinkingWindow, setDrinkingWindow] = useState(bottle.drinkingWindow || '');

  // Reference profile & pre-drink cellar notes
  const [referenceNotes, setReferenceNotes] = useState(existingRefProfile?.notes || '');
  const [cellarNotes, setCellarNotes] = useState(bottle.cellarNotes || '');

  // Post-consumption evaluation fields (only for consumed bottles)
  const [consumptionRating, setConsumptionRating] = useState<number | null>(
    existingConsumption?.rating ?? null
  );
  const [consumptionNotes, setConsumptionNotes] = useState(
    existingConsumption?.tastingNotes || ''
  );

  const [formError, setFormError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!producer.trim()) {
      setFormError('Producer name is required.');
      return;
    }

    const vintageVal =
      vintage === 'NV' || isNaN(parseInt(vintage, 10)) ? 'NV' : parseInt(vintage, 10);
    const abvVal = alcoholPercent ? parseFloat(alcoholPercent) : undefined;

    const updatedRefProfile = referenceNotes.trim()
      ? {
          source: existingRefProfile?.source || 'Producer / AI Reference',
          notes: referenceNotes.trim(),
        }
      : undefined;

    const updates: Partial<Bottle> = {
      producer: producer.trim(),
      wineName: wineName.trim() || undefined,
      varietal: varietal.trim() || undefined,
      vintage: vintageVal,
      style,
      country: country.trim(),
      region: region.trim(),
      alcoholPercent: abvVal,
      drinkingWindow: drinkingWindow.trim() || undefined,
      referenceProfile: updatedRefProfile,
      cellarNotes: cellarNotes.trim() || undefined,
    };

    if (isConsumed) {
      updates.consumption = {
        date: existingConsumption?.date || bottle.consumedAt || new Date().toISOString(),
        rating: consumptionRating,
        tastingNotes: consumptionNotes.trim(),
      };
      updates.rating = consumptionRating ?? undefined;
      updates.tastingNotes = consumptionNotes.trim() || undefined;
    } else {
      updates.tastingNotes = referenceNotes.trim() || undefined;
    }

    onSave(bottle.id, updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Edit3 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Edit Wine Details</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Producer / Winery <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={producer}
                onChange={(e) => setProducer(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Wine Name / Cuvée
              </label>
              <input
                type="text"
                value={wineName}
                onChange={(e) => setWineName(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Varietal / Grape Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Varietal / Grape Variety <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Single grape or specific blend
              </span>
            </div>
            <input
              type="text"
              value={varietal}
              onChange={(e) => setVarietal(e.target.value)}
              placeholder="e.g. Pinot Noir, Sangiovese, GSM Blend"
              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none font-medium"
              required
            />

            {/* Quick-select chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {POPULAR_VARIETALS.slice(0, 10).map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setVarietal(v)}
                  className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                    varietal.toLowerCase() === v.toLowerCase()
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vintage
              </label>
              <VintageSelect value={vintage} onChange={(val) => setVintage(val)} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Style Category
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as WineStyle)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none font-medium"
              >
                <optgroup label="Effervescent & Pink">
                  <option value="Sparkling Wine">Sparkling Wine</option>
                  <option value="Rosé Wine">Rosé Wine</option>
                </optgroup>
                <optgroup label="White Wines (Light to Sweet)">
                  <option value="Light-Bodied White Wine">Light-Bodied White Wine</option>
                  <option value="Full-Bodied White Wine">Full-Bodied White Wine</option>
                  <option value="Aromatic (Sweet) White Wine">Aromatic (Sweet) White Wine</option>
                </optgroup>
                <optgroup label="Red Wines (Light to Full)">
                  <option value="Light-Bodied Red Wine">Light-Bodied Red Wine</option>
                  <option value="Medium-Bodied Red Wine">Medium-Bodied Red Wine</option>
                  <option value="Full-Bodied Red Wine">Full-Bodied Red Wine</option>
                </optgroup>
                <optgroup label="Dessert & Fortified">
                  <option value="Dessert Wine">Dessert Wine</option>
                </optgroup>
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alcohol %
              </label>
              <input
                type="number"
                step="0.1"
                value={alcoholPercent}
                onChange={(e) => setAlcoholPercent(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Region
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Drinking Window
            </label>
            <input
              type="text"
              value={drinkingWindow}
              onChange={(e) => setDrinkingWindow(e.target.value)}
              placeholder="e.g. 2024 - 2035"
              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none font-mono"
            />
          </div>

          {/* Winemaker / Reference Tasting Profile */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Tasting Profile (Winemaker / Reference)
              </label>
              <span className="text-[11px] text-slate-400">Reference aroma &amp; structure</span>
            </div>
            <textarea
              value={referenceNotes}
              onChange={(e) => setReferenceNotes(e.target.value)}
              placeholder="Aromas, palate structure, and pairing profile..."
              rows={2}
              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          {/* Pre-Drink Cellar Notes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Cellar Notes (Pre-Drink Logistics)
              </label>
              <span className="text-[11px] text-slate-400">Provenance &amp; holding reminders</span>
            </div>
            <input
              type="text"
              value={cellarNotes}
              onChange={(e) => setCellarNotes(e.target.value)}
              placeholder="e.g., Gift from Jason, hold until 2028..."
              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          {/* Post-Consumption Evaluation (Only shown if bottle is already consumed) */}
          {isConsumed && (
            <div className="border-t border-slate-100 pt-3 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Personal Rating (0.5 – 5.0 ★)
                </label>
                <HalfStarRating
                  value={consumptionRating}
                  onChange={setConsumptionRating}
                  size="md"
                  showSkipButton
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Personal Tasting Review
                </label>
                <textarea
                  value={consumptionNotes}
                  onChange={(e) => setConsumptionNotes(e.target.value)}
                  placeholder="How was the balance, acidity, finish? What did you pair it with?"
                  rows={3}
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {onDelete && (
            <div>
              {isConfirmingDelete ? (
                <div className="flex items-center gap-2 animate-in fade-in">
                  <span className="text-xs font-bold text-red-600">Delete permanently?</span>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="py-1.5 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(bottle.id);
                      setIsConfirmingDelete(false);
                      onClose();
                    }}
                    className="py-1.5 px-3 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="py-2 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Delete Bottle</span>
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors min-h-[44px] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="py-2.5 px-6 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 min-h-[44px] cursor-pointer"
            >
              <Check className="w-4 h-4 text-rose-300" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
