/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Bottle,
  StorageUnit,
  formatSlotLabel,
  WINE_STYLES,
  getBottleReferenceProfile,
  getBottleConsumption,
  getBottleMaturity,
  getMatchingCellarStock,
  buildBuyMoreSearchUrl,
} from '../types/cellar';
import {
  X,
  Check,
  ArrowRightLeft,
  Edit3,
  Trash2,
  MapPin,
  Maximize2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  BookOpen,
  StickyNote,
  Calendar,
  ExternalLink,
  Layers,
  Camera,
} from 'lucide-react';
import { LabelLightboxModal } from './LabelLightboxModal';
import { LabelSearchModal } from './LabelSearchModal';
import { HalfStarRating } from './HalfStarRating';
import { BottleArtworkColumn } from './ui/BottleArtworkColumn';
import { buildWineEstateCardProps } from './ui/WineEstateCard';
import {
  VarietalBadge,
  DrinkMeStatusBadge,
  PrimaryDrinkButton,
  SecondaryActionButton,
} from './ui/WineCellarDesignSystem';

interface BottleActionSheetProps {
  bottle: Bottle;
  activeBottles?: Bottle[];
  storageUnits?: StorageUnit[];
  isOpen: boolean;
  onClose: () => void;
  onStartConsume: (bottle: Bottle) => void;
  onUndoConsume?: (bottleId: string) => void;
  onSelectActiveBottle?: (bottle: Bottle) => void;
  onUpdateCellarNotes: (bottleId: string, cellarNotes: string) => void;
  onUpdateConsumptionReview?: (
    bottleId: string,
    review: { date: string; rating: number | null; tastingNotes: string }
  ) => void;
  onMoveSlot: (bottle: Bottle) => void;
  onEdit: (bottle: Bottle) => void;
  onDelete: (bottleId: string) => void;
  onUpdatePhoto?: (bottleId: string, newImageUrl: string) => void;
  onRemovePhoto?: (bottleId: string) => void;
}

export const BottleActionSheet: React.FC<BottleActionSheetProps> = ({
  bottle,
  activeBottles = [],
  storageUnits,
  isOpen,
  onClose,
  onStartConsume,
  onUndoConsume,
  onSelectActiveBottle,
  onUpdateCellarNotes,
  onUpdateConsumptionReview,
  onMoveSlot,
  onEdit,
  onDelete,
  onUpdatePhoto,
  onRemovePhoto,
}) => {
  const [isEditingCellarNotes, setIsEditingCellarNotes] = useState(false);
  const [cellarNotesDraft, setCellarNotesDraft] = useState(bottle.cellarNotes || '');
  const [showReferenceCollapse, setShowReferenceCollapse] = useState(false);

  // Post-consumption inline review editor state (only for consumed bottles)
  const consumptionData = getBottleConsumption(bottle);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [reviewRatingDraft, setReviewRatingDraft] = useState<number | null>(
    consumptionData?.rating ?? null
  );
  const [reviewNotesDraft, setReviewNotesDraft] = useState<string>(
    consumptionData?.tastingNotes || ''
  );

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isLabelSearchOpen, setIsLabelSearchOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    setCellarNotesDraft(bottle.cellarNotes || '');
    setIsEditingCellarNotes(false);
    setShowReferenceCollapse(false);
    setIsEditingReview(false);
    setIsLabelSearchOpen(false);
    setIsConfirmingDelete(false);
    const currentConsumption = getBottleConsumption(bottle);
    setReviewRatingDraft(currentConsumption?.rating ?? null);
    setReviewNotesDraft(currentConsumption?.tastingNotes || '');
  }, [bottle.id, bottle.cellarNotes, bottle.status, bottle.consumption, bottle.rating, bottle.tastingNotes]);

  const maturityInfo = useMemo(() => getBottleMaturity(bottle), [bottle]);

  const matchingStock = useMemo(
    () => getMatchingCellarStock(bottle, activeBottles),
    [bottle, activeBottles]
  );

  if (!isOpen) return null;

  const styleMeta = WINE_STYLES[bottle.style] || WINE_STYLES['Medium-Bodied Red Wine'];
  const isConsumed = bottle.status === 'consumed';
  const referenceProfile = getBottleReferenceProfile(bottle);

  const handleSaveCellarNotes = () => {
    onUpdateCellarNotes(bottle.id, cellarNotesDraft.trim());
    setIsEditingCellarNotes(false);
  };

  const handleSaveReviewUpdate = () => {
    if (onUpdateConsumptionReview && consumptionData) {
      onUpdateConsumptionReview(bottle.id, {
        date: consumptionData.date,
        rating: reviewRatingDraft,
        tastingNotes: reviewNotesDraft.trim(),
      });
    }
    setIsEditingReview(false);
  };

  const formattedConsumedDate = consumptionData?.date
    ? new Date(consumptionData.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recently';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Content Container */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-250">
        {/* Grab Handle for Mobile */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
              {isConsumed
                ? `Tasting Archive · ${formattedConsumedDate}`
                : bottle.slotId
                ? formatSlotLabel(bottle.slotId, storageUnits)
                : 'Staging Shelf'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            aria-label="Close sheet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 pb-36 overflow-y-auto space-y-5">
          {/* Main Bottle Header */}
          <div className="flex gap-4 items-start">
            <BottleArtworkColumn
              customPhotoUrl={bottle.imageUrl}
              wineData={buildWineEstateCardProps(bottle, 'sm')}
              onEnlarge={() => setIsLightboxOpen(true)}
              onChangePhoto={() => setIsLabelSearchOpen(true)}
            />

            <div className="flex-1 min-w-0 pt-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-stone-600 leading-none">
                  {bottle.vintage === 'NV' ? 'Non-Vintage' : bottle.vintage}
                </span>
                <VarietalBadge varietal={bottle.varietal || 'Blend'} styleKey={bottle.style} />
              </div>
              <h2 className="text-xl font-bold text-stone-900 tracking-tight leading-snug">
                {bottle.producer}
              </h2>
              {bottle.wineName && (
                <p className="text-base text-stone-700 leading-normal">{bottle.wineName}</p>
              )}
              <div className="flex items-start gap-2 text-xs text-stone-500 mt-2">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                <span className="break-words line-clamp-2 text-xs text-stone-500">
                  {bottle.region}, {bottle.country}
                </span>
              </div>
            </div>
          </div>

          {/* Key Attributes Strip */}
          <div className="grid grid-cols-[1.4fr_1fr] gap-x-4 gap-y-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block">
                Style
              </span>
              <span className="break-words text-sm font-medium text-stone-900 block">
                {bottle.style}
              </span>
            </div>
            {bottle.alcoholPercent && (
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block">
                  Alcohol ABV
                </span>
                <span className="font-mono font-semibold text-slate-800 tabular-nums">
                  {bottle.alcoholPercent}%
                </span>
              </div>
            )}
            {bottle.drinkingWindow && (
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block">
                  Drinking Window
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-medium text-stone-900 whitespace-nowrap tabular-nums">
                    {bottle.drinkingWindow.replace(/\s*[-–]\s*/, ' – ')}
                  </span>
                  {maturityInfo && (
                    <DrinkMeStatusBadge
                      isDrinkWindow={maturityInfo.status === 'peak'}
                      label={maturityInfo.label}
                      badgeClass={maturityInfo.badgeClass}
                      className="text-[11px]"
                      title={
                        maturityInfo.isConsumedEval
                          ? `Evaluated at uncorking year (${maturityInfo.referenceYear})`
                          : `Evaluated against current cellar year (${maturityInfo.referenceYear})`
                      }
                    />
                  )}
                </div>
              </div>
            )}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block">
                Date Cellared
              </span>
              <span className="font-mono font-medium text-slate-700">
                {new Date(bottle.addedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* ================================================================= */}
          {/* VIEW A: STORED BOTTLE (IN-CELLAR OR STAGING)                      */}
          {/* ================================================================= */}
          {!isConsumed && (
            <>
              {/* 1. TASTING PROFILE (READ-ONLY WINEMAKER / REFERENCE) */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Tasting Profile
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">
                    {referenceProfile?.source || 'Producer / Reference Notes'}
                  </span>
                </div>

                {referenceProfile?.notes ? (
                  <blockquote className="text-xs leading-relaxed text-slate-700 italic bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/80">
                    &ldquo;{referenceProfile.notes}&rdquo;
                  </blockquote>
                ) : (
                  <div className="text-xs text-slate-400 bg-slate-50/60 p-3 rounded-xl border border-dashed border-slate-200">
                    No winemaker reference profile recorded for this bottle.
                  </div>
                )}
              </div>

              {/* 2. CELLAR NOTES (EDITABLE PRE-DRINK LOGISTICS) */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Cellar Notes
                    </span>
                  </div>

                  {!isEditingCellarNotes ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingCellarNotes(true)}
                      className="text-xs font-semibold text-rose-800 hover:text-rose-950 transition-colors cursor-pointer"
                    >
                      {bottle.cellarNotes ? 'Edit' : '+ Add Note'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCellarNotesDraft(bottle.cellarNotes || '');
                          setIsEditingCellarNotes(false);
                        }}
                        className="text-xs font-medium text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCellarNotes}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>

                {isEditingCellarNotes ? (
                  <div className="space-y-2">
                    <textarea
                      value={cellarNotesDraft}
                      onChange={(e) => setCellarNotesDraft(e.target.value)}
                      placeholder="e.g., Gift from Jason, hold until 2028..."
                      rows={2}
                      autoFocus
                      className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800"
                    />
                  </div>
                ) : bottle.cellarNotes ? (
                  <div className="text-xs text-slate-700 bg-amber-50/50 p-3 rounded-xl border border-amber-200/70 font-medium">
                    {bottle.cellarNotes}
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingCellarNotes(true)}
                    className="text-xs text-slate-400 bg-slate-50/60 hover:bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 cursor-pointer transition-colors"
                  >
                    e.g., Gift from Jason, hold until 2028...
                  </div>
                )}
              </div>
            </>
          )}

          {/* ================================================================= */}
          {/* VIEW B: CONSUMED BOTTLE (CHRONOLOGICAL TASTING ARCHIVE DETAIL)    */}
          {/* ================================================================= */}
          {isConsumed && (
            <div className="border-t border-slate-100 pt-4 space-y-4">
              {/* Prominent User Rating & Personal Tasting Notes */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Personal Tasting Review
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formattedConsumedDate}
                    </span>
                  </div>

                  {!isEditingReview ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingReview(true)}
                      className="text-xs font-semibold text-rose-800 hover:text-rose-950 cursor-pointer"
                    >
                      Edit Review
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingReview(false)}
                        className="text-xs font-medium text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveReviewUpdate}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>

                {isEditingReview ? (
                  <div className="space-y-3 pt-1">
                    <HalfStarRating
                      value={reviewRatingDraft}
                      onChange={setReviewRatingDraft}
                      size="md"
                      showSkipButton
                    />
                    <textarea
                      value={reviewNotesDraft}
                      onChange={(e) => setReviewNotesDraft(e.target.value)}
                      placeholder="How was the balance, acidity, finish? What did you pair it with?"
                      rows={3}
                      className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      {consumptionData?.rating !== null &&
                      consumptionData?.rating !== undefined &&
                      consumptionData.rating > 0 ? (
                        <HalfStarRating value={consumptionData.rating} readOnly size="md" />
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-200/70 text-slate-600 text-xs font-mono font-semibold">
                          Unrated
                        </span>
                      )}
                    </div>

                    {consumptionData?.tastingNotes ? (
                      <p className="text-xs leading-relaxed text-slate-800 bg-white p-3.5 rounded-xl border border-slate-200/80">
                        &ldquo;{consumptionData.tastingNotes}&rdquo;
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        No personal tasting notes recorded when uncorked.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Cross-Vintage Inventory Bridge (Remaining Cellar Stock) */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cellar Inventory Bridge</span>
                  </div>
                  {matchingStock.length > 0 ? (
                    <div className="text-xs font-semibold text-slate-800">
                      <span className="font-mono font-bold text-emerald-800">
                        {matchingStock.length} {matchingStock.length === 1 ? 'bottle' : 'bottles'}
                      </span>{' '}
                      remaining in cellar ·{' '}
                      <span className="font-mono text-slate-600">
                        {matchingStock[0].vintage !== 'NV' ? `${matchingStock[0].vintage} · ` : ''}
                        {matchingStock[0].slotId
                          ? formatSlotLabel(matchingStock[0].slotId, storageUnits)
                          : 'Staging Shelf'}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-amber-800">
                      Depleted in cellar (0 bottles remaining)
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {matchingStock.length > 0 && onSelectActiveBottle && (
                    <button
                      type="button"
                      onClick={() => onSelectActiveBottle(matchingStock[0])}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      View Cellar Slot
                    </button>
                  )}
                  {matchingStock.length <= 1 && (
                    <a
                      href={buildBuyMoreSearchUrl(bottle)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <span>Find to Buy More</span>
                      <ExternalLink className="w-3 h-3 text-amber-700" />
                    </a>
                  )}
                </div>
              </div>

              {/* Read-Only Collapsible Reference Tasting Notes at Bottom */}
              {(referenceProfile?.notes || bottle.cellarNotes) && (
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setShowReferenceCollapse((prev) => !prev)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reference Tasting Notes ({referenceProfile?.source || 'Winemaker'})</span>
                    </span>
                    {showReferenceCollapse ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {showReferenceCollapse && (
                    <div className="px-4 pb-3.5 pt-1 space-y-2.5 border-t border-slate-100 text-xs bg-slate-50/40">
                      {referenceProfile?.notes && (
                        <blockquote className="text-xs text-slate-600 italic leading-relaxed">
                          &ldquo;{referenceProfile.notes}&rdquo;
                        </blockquote>
                      )}
                      {bottle.cellarNotes && (
                        <div className="pt-1 border-t border-slate-100">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Pre-Drink Cellar Note
                          </span>
                          <p className="text-xs text-slate-600 mt-0.5">{bottle.cellarNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-stone-100 p-4 flex flex-col gap-2.5">
          {isConfirmingDelete ? (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex flex-col gap-2.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
                <span className="text-xs font-bold text-red-900">
                  Permanently remove {bottle.vintage === 'NV' ? 'NV' : bottle.vintage} {bottle.producer} from cellar?
                </span>
              </div>
              <p className="text-[11px] text-red-700 leading-tight">
                This action will delete the bottle record and immediately free up slot {bottle.slotId ? formatSlotLabel(bottle.slotId, storageUnits) : 'Staging'}.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="py-2 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer min-h-[38px]"
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
                  className="py-2 px-4 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer min-h-[38px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Yes, Delete Bottle</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Row 1: Primary Full-Width CTA */}
              {!isConsumed ? (
                <PrimaryDrinkButton onClick={() => onStartConsume(bottle)}>
                  <Check className="w-5 h-5 text-rose-300" />
                  <span>Mark as Consumed</span>
                </PrimaryDrinkButton>
              ) : (
                onUndoConsume && (
                  <button
                    type="button"
                    onClick={() => {
                      onUndoConsume(bottle.id);
                      onClose();
                    }}
                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-rose-300" />
                    <span>
                      Undo Drink{' '}
                      {bottle.previousSlotId
                        ? `(Restore to ${formatSlotLabel(bottle.previousSlotId)})`
                        : '(Restore to Staging Shelf)'}
                    </span>
                  </button>
                )
              )}

              {/* Row 2: Management Tasks Side-by-Side */}
              <div className="flex items-center justify-between gap-2">
                {!isConsumed && (
                  <SecondaryActionButton
                    onClick={() => {
                      onClose();
                      onMoveSlot(bottle);
                    }}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-stone-500" />
                    <span>Move Slot</span>
                  </SecondaryActionButton>
                )}

                <SecondaryActionButton
                  onClick={() => {
                    onClose();
                    onEdit(bottle);
                  }}
                >
                  <Edit3 className="w-3.5 h-3.5 text-stone-500" />
                  <span>Edit Info</span>
                </SecondaryActionButton>
              </div>

              {/* Row 3: Destructive Action Separated Below */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="text-xs text-stone-400 hover:text-rose-600 transition-colors py-1 cursor-pointer"
                  title="Delete bottle"
                >
                  Delete Bottle
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lightbox Modal for Tap-to-Enlarge Regional Heritage Estate Label Card */}
      {isLightboxOpen && (
        <LabelLightboxModal
          bottle={bottle}
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          onUpdatePhoto={(newUrl) => {
            if (onUpdatePhoto) {
              onUpdatePhoto(bottle.id, newUrl);
            }
          }}
          onRemovePhoto={() => {
            if (onRemovePhoto) {
              onRemovePhoto(bottle.id);
            }
          }}
        />
      )}

      {/* Label Search & Verification Modal */}
      {isLabelSearchOpen && (
        <LabelSearchModal
          bottle={bottle}
          isOpen={isLabelSearchOpen}
          onClose={() => setIsLabelSearchOpen(false)}
          onSelectImage={(downloadUrl) => {
            if (onUpdatePhoto) {
              onUpdatePhoto(bottle.id, downloadUrl);
            }
          }}
          onRemoveImage={() => {
            if (onRemovePhoto) {
              onRemovePhoto(bottle.id);
            }
          }}
        />
      )}
    </div>
  );
};
