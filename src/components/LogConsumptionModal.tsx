/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Bottle, WINE_STYLES, formatSlotLabel, getBottleReferenceProfile } from '../types/cellar';
import { HalfStarRating } from './HalfStarRating';
import { Wine, X, Check, Calendar, ChevronDown, ChevronRight, BookOpen } from 'lucide-react';

interface LogConsumptionModalProps {
  bottle: Bottle | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmConsume: (
    bottleId: string,
    evaluation: { date: string; rating: number | null; tastingNotes: string }
  ) => void;
}

export const LogConsumptionModal: React.FC<LogConsumptionModalProps> = ({
  bottle,
  isOpen,
  onClose,
  onConfirmConsume,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [consumedDate, setConsumedDate] = useState<string>(todayStr);
  const [rating, setRating] = useState<number | null>(null);
  const [tastingNotes, setTastingNotes] = useState<string>('');
  const [showReferenceAccordion, setShowReferenceAccordion] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && bottle) {
      setConsumedDate(new Date().toISOString().slice(0, 10));
      setRating(null);
      setTastingNotes('');
      setShowReferenceAccordion(false);
    }
  }, [isOpen, bottle?.id]);

  if (!isOpen || !bottle) return null;

  const styleMeta = WINE_STYLES[bottle.style] || WINE_STYLES['Medium-Bodied Red Wine'];
  const referenceProfile = getBottleReferenceProfile(bottle);
  const displayVintage = bottle.vintage === 'NV' ? 'NV' : String(bottle.vintage);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmConsume(bottle.id, {
      date: consumedDate || todayStr,
      rating,
      tastingNotes: tastingNotes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-250"
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-900 shrink-0">
              <Wine className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
                Log Bottle Consumption
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                Uncorked: {displayVintage} {bottle.producer}
                {bottle.wineName ? ` · ${bottle.wineName}` : ''}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            aria-label="Cancel consumption"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Context Strip: Vacating Slot & Wine Style */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: styleMeta.dotColor }}
              />
              <span className="font-semibold text-slate-800 truncate">{bottle.style}</span>
              {bottle.varietal && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-600 font-medium truncate">{bottle.varietal}</span>
                </>
              )}
            </div>
            {bottle.slotId && (
              <span className="font-mono text-[11px] font-semibold text-rose-800 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-md shrink-0">
                Clears {formatSlotLabel(bottle.slotId)}
              </span>
            )}
          </div>

          {/* Date Consumed Picker */}
          <div>
            <label
              htmlFor="consumption-date"
              className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5"
            >
              Date Consumed
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="consumption-date"
                type="date"
                value={consumedDate}
                max={todayStr}
                onChange={(e) => setConsumedDate(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs font-mono font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>
          </div>

          {/* Interactive Half-Star Rating Control */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Your Rating
              </label>
              <span className="text-[11px] text-slate-400">
                0.5 to 5.0 ★ (Use click or ← / → keys)
              </span>
            </div>
            <HalfStarRating
              value={rating}
              onChange={setRating}
              size="lg"
              autoFocus
              showSkipButton
            />
          </div>

          {/* Personal Tasting Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="personal-tasting-notes"
                className="text-xs font-bold uppercase tracking-wider text-slate-800"
              >
                Personal Tasting Notes
              </label>
              <span className="text-[11px] text-slate-400">Optional</span>
            </div>
            <textarea
              id="personal-tasting-notes"
              value={tastingNotes}
              onChange={(e) => setTastingNotes(e.target.value)}
              placeholder="How was the balance, acidity, finish? What did you pair it with?"
              rows={4}
              className="w-full text-xs p-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800 leading-relaxed placeholder:text-slate-400"
            />
          </div>

          {/* Reference Accordion (Collapsed by Default) */}
          {(referenceProfile || bottle.cellarNotes) && (
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowReferenceAccordion((prev) => !prev)}
                className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>View Winemaker Profile</span>
                </span>
                {showReferenceAccordion ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showReferenceAccordion && (
                <div className="px-4 pb-3.5 pt-1 space-y-2.5 border-t border-slate-100 text-xs">
                  {referenceProfile && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        {referenceProfile.source}
                      </span>
                      <blockquote className="text-xs text-slate-600 italic leading-relaxed pl-3 border-l-2 border-rose-300">
                        &ldquo;{referenceProfile.notes}&rdquo;
                      </blockquote>
                    </div>
                  )}
                  {bottle.cellarNotes && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                        Cellar Note Reminder
                      </span>
                      <p className="text-xs text-slate-600">{bottle.cellarNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer Actions */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors min-h-[44px] cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="flex-1 sm:flex-initial py-2.5 px-6 rounded-xl bg-rose-900 hover:bg-rose-950 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/15 active:scale-[0.98] transition-all min-h-[44px] cursor-pointer"
          >
            <Check className="w-4 h-4 text-rose-300" />
            <span>Save to Tasting Archive</span>
          </button>
        </div>
      </form>
    </div>
  );
};
