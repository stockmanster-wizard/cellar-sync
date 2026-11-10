/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Bottle, ParsedWineDraft, SlotId, StorageUnit, DEFAULT_STORAGE_UNITS, WINE_STYLES, WineStyle, SOMMELIER_WINE_STYLE_ORDER, formatSlotLabel, generateUnitSlots, isSlotInUnit, normalizeWineStyle, POPULAR_VARIETALS, normalizeVarietal } from '../types/cellar';
import { SAMPLE_LABEL_PRESETS, SamplePreset } from '../data/sampleBottles';
import { parseWineLabelImage } from '../services/geminiService';
import { compressImageForOcr } from '../utils/imageCompression';
import { compressLabelImage, blobToDataUrl } from '../utils/imageProcessor';
import { uploadBottleLabelImage } from '../services/imageStorage';
import { auth } from '../services/firebase';
import { WineLabelBadge } from './WineLabelBadge';
import { WineCardPreview } from './ui/WineCardPreview';
import { buildWineEstateCardProps } from './ui/WineEstateCard';
import { FormField } from './ui/FormField';
import { VintageSelect } from './VintageSelect';
import { Camera, Upload, Sparkles, X, Check, AlertCircle, RefreshCw, Wine, ChevronRight, Plus, Minus } from 'lucide-react';

interface AddBottleModalProps {
  isOpen: boolean;
  initialSlotId?: SlotId | null;
  onClose: () => void;
  onSave: (
    bottleData: Omit<Bottle, 'id' | 'addedAt' | 'status'> & { slotId?: SlotId },
    quantity?: number
  ) => void;
  occupiedSlotIds: Set<SlotId>;
  storageUnits?: StorageUnit[];
}

export const AddBottleModal: React.FC<AddBottleModalProps> = ({
  isOpen,
  initialSlotId,
  onClose,
  onSave,
  occupiedSlotIds,
  storageUnits,
}) => {
  const units = storageUnits && storageUnits.length > 0 ? storageUnits : DEFAULT_STORAGE_UNITS;
  const [step, setStep] = useState<'input' | 'review' | 'slot'>('input');
  const [entryMode, setEntryMode] = useState<'scan' | 'preset' | 'manual'>('scan');
  const [isParsing, setIsParsing] = useState(false);
  const [parsingStepText, setParsingStepText] = useState('Scanning wine label...');
  const [parseError, setParseError] = useState<string | null>(null);

  // Staged Label Photo & Visual Mode State
  const [pendingLabelImage, setPendingLabelImage] = useState<string | null>(null);
  const [pendingLabelBlob, setPendingLabelBlob] = useState<File | Blob | null>(null);
  const [visualMode, setVisualMode] = useState<'photo' | 'card'>('photo');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [uploadToastAlert, setUploadToastAlert] = useState<string | null>(null);

  // Form Fields
  const [producer, setProducer] = useState('');
  const [wineName, setWineName] = useState('');
  const [varietal, setVarietal] = useState('');
  const [vintage, setVintage] = useState<string>('');
  const [style, setStyle] = useState<WineStyle>('Medium-Bodied Red Wine');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [alcoholPercent, setAlcoholPercent] = useState<string>('');
  const [tastingNotes, setTastingNotes] = useState('');
  const [cellarNotes, setCellarNotes] = useState('');
  const [drinkingWindow, setDrinkingWindow] = useState('');
  const [quantity, setQuantity] = useState<number>(1);

  // Selected Target Slot
  const [selectedSlot, setSelectedSlot] = useState<SlotId | undefined>(initialSlotId || undefined);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(() => {
    if (initialSlotId) {
      const match = units.find((u) => isSlotInUnit(initialSlotId, u));
      if (match) return match.id;
    }
    return units[0]?.id || 'rack-a';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const labelOnlyInputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setStep('input');
      setEntryMode('scan');
      setIsParsing(false);
      setParseError(null);
      setPendingLabelImage(null);
      setPendingLabelBlob(null);
      setVisualMode('photo');
      setIsSaving(false);
      setUploadToastAlert(null);
      setQuantity(1);
      setProducer('');
      setWineName('');
      setVarietal('');
      setVintage('');
      setStyle('Medium-Bodied Red Wine');
      setCountry('');
      setRegion('');
      setAlcoholPercent('');
      setTastingNotes('');
      setCellarNotes('');
      setDrinkingWindow('');

      if (initialSlotId) {
        setSelectedSlot(initialSlotId);
        const match = units.find((u) => isSlotInUnit(initialSlotId, u));
        if (match) setSelectedUnitId(match.id);
      } else {
        // Find first available slot in active racks
        let foundFreeSlot: SlotId | null = null;
        let foundUnitId: string | null = null;
        for (const unit of units) {
          const unitSlots = generateUnitSlots(unit);
          const free = unitSlots.find((s) => !occupiedSlotIds.has(s));
          if (free) {
            foundFreeSlot = free;
            foundUnitId = unit.id;
            break;
          }
        }
        if (foundFreeSlot && foundUnitId) {
          setSelectedSlot(foundFreeSlot);
          setSelectedUnitId(foundUnitId);
        } else {
          setSelectedSlot(undefined);
          setSelectedUnitId(units[0]?.id || 'rack-a');
        }
      }
    } else if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen, initialSlotId, occupiedSlotIds, units]);

  if (!isOpen) return null;

  // Process image in memory for Gemini extraction
  const handleProcessImage = async (imageForOcr: string, sampleData?: ParsedWineDraft, mimeType?: string) => {
    setIsParsing(true);
    setParseError(null);
    setStep('review');
    setParsingStepText('Scanning wine label...');

    // If a sample preset was clicked, populate its curated baseline immediately
    if (sampleData) {
      setProducer(sampleData.producer);
      setWineName(sampleData.wineName || '');
      setVintage(sampleData.vintage);
      setStyle(sampleData.style);
      setCountry(sampleData.country);
      setRegion(sampleData.region);
      setAlcoholPercent(sampleData.alcoholPercent ? String(sampleData.alcoholPercent) : '');
      setTastingNotes(sampleData.tastingNotes || '');
      setDrinkingWindow(sampleData.drinkingWindow || '');
    }

    try {
      // Execute multi-modal Gemini label extraction (<2s on compressed image)
      const result = await parseWineLabelImage(imageForOcr, mimeType);
      if (result.success && result.draft) {
        setParsingStepText('Scanning wine label...');
        setProducer(result.draft.producer || sampleData?.producer || '');
        setWineName(result.draft.wineName || '');
        if (result.draft.varietal) {
          setVarietal(
            normalizeVarietal(result.draft.varietal, {
              region: result.draft.region,
              country: result.draft.country,
              wineName: result.draft.wineName,
              producer: result.draft.producer,
              style: result.draft.style,
            })
          );
        }
        if (result.draft.vintage) setVintage(result.draft.vintage);
        if (result.draft.style) setStyle(normalizeWineStyle(result.draft.style));
        if (result.draft.country) setCountry(result.draft.country);
        if (result.draft.region) setRegion(result.draft.region);
        if (result.draft.alcoholPercent) setAlcoholPercent(String(result.draft.alcoholPercent));
        if (result.draft.tastingNotes !== undefined) setTastingNotes(result.draft.tastingNotes);
        if (result.draft.drinkingWindow !== undefined) setDrinkingWindow(result.draft.drinkingWindow);
      } else if (!sampleData) {
        setParseError(
          result.error || "Couldn't read all details automatically. Please confirm the draft fields."
        );
      }
    } catch (err: any) {
      if (!sampleData) {
        setParseError(err.message || 'Label scan timed out. Please enter details manually.');
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    // Immediately transition to review with progress feedback and clear dummy defaults
    setEntryMode('scan');
    setStep('review');
    setIsParsing(true);
    setParseError(null);
    setProducer('');
    setWineName('');
    setVarietal('');
    setVintage('');
    setCountry('');
    setRegion('');
    setAlcoholPercent('');
    setTastingNotes('');
    setCellarNotes('');
    setDrinkingWindow('');
    setParsingStepText('Scanning wine label...');
    setPendingLabelBlob(file);
    setVisualMode('photo');

    try {
      const compressedDataUrl = await compressImageForOcr(file);
      setPendingLabelImage(compressedDataUrl);
      await handleProcessImage(compressedDataUrl, undefined, 'image/jpeg');
    } catch (err: any) {
      setIsParsing(false);
      setParseError(err.message || 'Failed to process image for scanning.');
    }
  };

  // Attach or replace label photo from the Review step without wiping edited fields
  const handleLabelOnlyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawBase64 = event.target?.result as string;
      if (rawBase64) {
        setPendingLabelBlob(file);
        setPendingLabelImage(rawBase64);
        setVisualMode('photo');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Preset sample test labels
  const handlePresetClick = async (preset: SamplePreset) => {
    setIsParsing(false);
    setParseError(null);
    setPendingLabelImage(null);
    setPendingLabelBlob(null);
    setVisualMode('card');
    setEntryMode('preset');
    setStep('review');

    // Pre-fill fields for immediate response
    setProducer(preset.draftData.producer);
    setWineName(preset.draftData.wineName || '');
    setVarietal(
      preset.draftData.varietal
        ? normalizeVarietal(preset.draftData.varietal, {
            region: preset.draftData.region,
            country: preset.draftData.country,
            wineName: preset.draftData.wineName,
            producer: preset.draftData.producer,
            style: preset.draftData.style,
          })
        : 'GSM Blend'
    );
    setVintage(preset.draftData.vintage);
    setStyle(preset.draftData.style);
    setCountry(preset.draftData.country);
    setRegion(preset.draftData.region);
    setAlcoholPercent(preset.draftData.alcoholPercent ? String(preset.draftData.alcoholPercent) : '14.0');
    setTastingNotes(preset.draftData.tastingNotes || '');
    setCellarNotes('');
    setDrinkingWindow(preset.draftData.drinkingWindow || '');
  };

  const resetForm = () => {
    setStep('input');
    setEntryMode('scan');
    setIsParsing(false);
    setParseError(null);
    setPendingLabelImage(null);
    setPendingLabelBlob(null);
    setVisualMode('photo');
    setIsSaving(false);
    setUploadToastAlert(null);
    setProducer('');
    setWineName('');
    setVarietal('');
    setVintage('');
    setStyle('Medium-Bodied Red Wine');
    setCountry('');
    setRegion('');
    setAlcoholPercent('');
    setTastingNotes('');
    setCellarNotes('');
    setDrinkingWindow('');
    setQuantity(1);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleConfirmSave = async () => {
    if (!producer.trim()) {
      setParseError('Please provide a Producer or Winery name.');
      return;
    }

    const vintageVal = vintage === 'NV' || isNaN(parseInt(vintage, 10)) ? 'NV' : parseInt(vintage, 10);
    const abvVal = parseFloat(alcoholPercent) || undefined;
    const trimmedRefNotes = tastingNotes.trim();

    const hasPendingPhoto = Boolean(pendingLabelImage || pendingLabelBlob);
    const effectiveVisualMode: 'photo' | 'card' =
      visualMode === 'photo' && hasPendingPhoto ? 'photo' : 'card';

    let uploadedImageUrl: string | undefined = undefined;
    let imageStoragePath: string | undefined = undefined;

    if (hasPendingPhoto) {
      setIsSaving(true);
      try {
        if (
          pendingLabelImage &&
          (pendingLabelImage.startsWith('http://') || pendingLabelImage.startsWith('https://'))
        ) {
          uploadedImageUrl = pendingLabelImage;
        } else {
          const sourceForCompression =
            pendingLabelBlob instanceof File ? pendingLabelBlob : pendingLabelImage!;
          const compressedBlob = await compressLabelImage(sourceForCompression);
          const compressedDataUrl = await blobToDataUrl(compressedBlob);
          uploadedImageUrl = compressedDataUrl;
        }
      } catch (err: any) {
        console.warn('Image compression fallback, retaining raw captured photo:', err);
        uploadedImageUrl = pendingLabelImage || undefined;
      } finally {
        setIsSaving(false);
      }
    }

    onSave(
      {
        producer: producer.trim(),
        wineName: wineName.trim() || undefined,
        varietal: varietal.trim() || undefined,
        vintage: vintageVal,
        style,
        country: country.trim() || 'Unknown',
        region: region.trim() || 'Unknown',
        alcoholPercent: abvVal,
        visualMode: effectiveVisualMode,
        imageUrl: uploadedImageUrl,
        imageStoragePath,
        referenceProfile: trimmedRefNotes
          ? {
              source: 'Producer / AI Reference',
              notes: trimmedRefNotes,
            }
          : undefined,
        cellarNotes: cellarNotes.trim() || undefined,
        tastingNotes: trimmedRefNotes || undefined,
        drinkingWindow: drinkingWindow.trim() || undefined,
        slotId: selectedSlot,
      },
      quantity
    );

    // Reset modal completely so the next bottle intake starts completely clean
    setIsSaving(false);
    resetForm();
    onClose();
  };

  // Render open slots in selected target storage unit
  const getAvailableSlotsForZone = () => {
    const activeUnit = units.find((u) => u.id === selectedUnitId) || units[0];
    if (!activeUnit) return [];
    return generateUnitSlots(activeUnit);
  };

  const isManualEmpty = entryMode === 'manual' && (!producer.trim() || !region.trim());
  const activeCustomPhotoUrl = visualMode === 'photo' && pendingLabelImage ? pendingLabelImage : undefined;

  const livePreviewBottle = {
    producer: producer.trim(),
    wineName: wineName.trim() || undefined,
    varietal: varietal.trim() || undefined,
    vintage: vintage === 'NV' ? ('NV' as const) : !isNaN(parseInt(vintage, 10)) ? parseInt(vintage, 10) : ('NV' as const),
    style,
    country: country.trim(),
    region: region.trim(),
    alcoholPercent: parseFloat(alcoholPercent) || undefined,
    slotId: selectedSlot,
    visualMode,
    imageUrl: activeCustomPhotoUrl,
  };

  const previewEstateProps = {
    ...buildWineEstateCardProps(livePreviewBottle, 'sm'),
    producer: producer.trim(),
    vintage: vintage.trim(),
    region: region.trim(),
    country: country.trim(),
    varietal: varietal.trim(),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-800">
              <Wine className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {step === 'input' && 'Add Bottle to Cellar'}
                {step === 'review' && 'Review Wine & Estate Label'}
                {step === 'slot' && 'Assign Storage Slot'}
              </h2>
              <span className="text-xs text-slate-400">
                {step === 'input' && 'Scan label for text extraction or choose a sample'}
                {step === 'review' && 'Label Preview'}
                {step === 'slot' && (selectedSlot ? formatSlotLabel(selectedSlot) : 'Select a slot')}
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {step === 'input' && (
            <div className="space-y-6">
              {/* Primary Capture Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Native Camera */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-900 hover:bg-slate-50 transition-all text-center group min-h-[140px]"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center text-slate-700 transition-colors mb-3">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-slate-900">Scan Label with Camera</span>
                  <span className="text-xs text-slate-500 mt-1">Extracts wine details via AI (photo not saved)</span>
                </button>

                {/* Upload File */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-900 hover:bg-slate-50 transition-all text-center group min-h-[140px]"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center text-slate-700 transition-colors mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-slate-900">Scan from Photo Library</span>
                  <span className="text-xs text-slate-500 mt-1">Reads label text &amp; builds Estate Card</span>
                </button>

                <input
                  type="file"
                  ref={cameraInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Sample Bottle Label Tray */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-rose-700" />
                    <span>Instant Sample Estates (1-Tap Test)</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Old World &amp; New World presets</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SAMPLE_LABEL_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetClick(preset)}
                      className="group flex flex-col items-center p-2.5 rounded-2xl border border-slate-200 hover:border-slate-900 hover:shadow-md transition-all text-left bg-stone-50/60"
                    >
                      <div className="mb-2">
                        <WineLabelBadge
                          bottle={{
                            producer: preset.draftData.producer,
                            wineName: preset.draftData.wineName,
                            varietal: preset.draftData.varietal,
                            vintage:
                              preset.draftData.vintage === 'NV' || isNaN(parseInt(preset.draftData.vintage, 10))
                                ? 'NV'
                                : parseInt(preset.draftData.vintage, 10),
                            style: preset.draftData.style,
                            country: preset.draftData.country,
                            region: preset.draftData.region,
                          }}
                          size="md"
                        />
                      </div>
                      <div className="w-full text-xs font-bold text-slate-900 leading-tight truncate text-center">
                        {preset.producer}
                      </div>
                      <div className="w-full text-[10px] text-slate-500 truncate mt-0.5 text-center">
                        {preset.region}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Entry Fallback */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEntryMode('manual');
                    setIsParsing(false);
                    setParseError(null);
                    setPendingLabelImage(null);
                    setPendingLabelBlob(null);
                    setVisualMode('card');
                    setProducer('');
                    setWineName('');
                    setVarietal('');
                    setVintage('');
                    setCountry('');
                    setRegion('');
                    setAlcoholPercent('');
                    setTastingNotes('');
                    setCellarNotes('');
                    setDrinkingWindow('');
                    setStep('review');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Or enter bottle details manually &rarr;
                </button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              {/* Parsing Indicator Banner */}
              {isParsing && (
                <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 text-rose-900 rounded-2xl p-4">
                  <RefreshCw className="w-5 h-5 text-rose-700 animate-spin shrink-0" />
                  <div className="text-xs">
                    <span className="font-semibold text-rose-950 block">Scanning wine label...</span>
                    <span className="text-rose-700">Identifying vintage, producer, and region</span>
                  </div>
                </div>
              )}

              {parseError && (
                <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}

              {uploadToastAlert && (
                <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{uploadToastAlert}</span>
                </div>
              )}

              {/* Consolidated Hero Header & Artwork Preview */}
              <div>
                <input
                  type="file"
                  ref={labelOnlyInputRef}
                  onChange={handleLabelOnlyUpload}
                  accept="image/*"
                  className="hidden"
                />
                <WineCardPreview
                  isLoading={isParsing}
                  wineData={previewEstateProps}
                  customPhotoUrl={pendingLabelImage || undefined}
                  hasUploadedPhoto={Boolean(pendingLabelImage)}
                  selectedStyle={visualMode === 'photo' && pendingLabelImage ? 'photo' : 'card'}
                  onSelectStyle={(nextStyle) => {
                    if (nextStyle === 'photo') {
                      setVisualMode('photo');
                      if (!pendingLabelImage) {
                        labelOnlyInputRef.current?.click();
                      }
                    } else {
                      setVisualMode('card');
                    }
                  }}
                  onRetakePhoto={() => setStep('input')}
                  isEmptyManual={entryMode === 'manual' && isManualEmpty && !pendingLabelImage}
                />
              </div>

              {/* Form Grid */}
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                  <FormField label="Producer / Winery" required>
                    <input
                      type="text"
                      value={producer}
                      onChange={(e) => setProducer(e.target.value)}
                      placeholder="e.g. Castello di Ama"
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none font-medium"
                      required
                    />
                  </FormField>

                  <FormField label="Wine Name / Cuvée">
                    <input
                      type="text"
                      value={wineName}
                      onChange={(e) => setWineName(e.target.value)}
                      placeholder="e.g. San Lorenzo Gran Selezione"
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </FormField>
                </div>

                {/* Varietal / Grape Field */}
                <FormField
                  label="Varietal / Grape Variety"
                  required
                  helperText="Single grape or specific blend"
                >
                  <input
                    type="text"
                    value={varietal}
                    onChange={(e) => setVarietal(e.target.value)}
                    placeholder="e.g. Pinot Noir, Sangiovese, GSM Blend, Bordeaux Blend"
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none font-medium"
                    required
                  />

                  {/* Quick-select chips */}
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {POPULAR_VARIETALS.slice(0, 12).map((v) => (
                      <button
                        type="button"
                        key={v}
                        onClick={() => setVarietal(v)}
                        className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                          varietal.toLowerCase() === v.toLowerCase()
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                            : v.includes('Blend')
                            ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100 font-medium'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </FormField>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3">
                  <FormField label="Vintage" required>
                    <VintageSelect
                      value={vintage}
                      onChange={(val) => setVintage(val)}
                      required
                    />
                  </FormField>

                  <FormField label="Style Category" required>
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
                  </FormField>

                  <FormField label="Alcohol % (ABV)" className="col-span-2 sm:col-span-1">
                    <input
                      type="number"
                      step="0.1"
                      value={alcoholPercent}
                      onChange={(e) => setAlcoholPercent(e.target.value)}
                      placeholder="14.0"
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none font-mono"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                  <FormField label="Country" required>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g. Italy"
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </FormField>

                  <FormField label="Region / Appellation" required>
                    <input
                      type="text"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder="e.g. Tuscany / Chianti Classico"
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </FormField>
                </div>

                <FormField
                  label="Tasting Profile (Winemaker / AI Reference)"
                  helperText="Reference aroma & structure"
                >
                  <textarea
                    value={tastingNotes}
                    onChange={(e) => setTastingNotes(e.target.value)}
                    placeholder="Sommelier aromas, structure, pairing suggestions..."
                    rows={2}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </FormField>

                <FormField
                  label="Cellar Notes"
                  helperText="Optional pre-drink note"
                  className="mb-1"
                >
                  <input
                    type="text"
                    value={cellarNotes}
                    onChange={(e) => setCellarNotes(e.target.value)}
                    placeholder="e.g., Gift from Jason, hold until 2028..."
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </FormField>
              </div>

              {/* Quantity Selector */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Quantity</span>
                    <span className="text-[11px] text-slate-400">
                      {quantity === 1 ? '1 bottle' : `${quantity} bottles allocation`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Stepper Controls: [-] [ N ] [+] */}
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center font-mono font-bold text-xs text-slate-900 select-none">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      disabled={quantity >= 24}
                      onClick={() => setQuantity((prev) => Math.min(24, prev + 1))}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick-preset chips: [ 2 ] [ 3 ] [ 6 ] [ 12 ] */}
                  <div className="flex items-center gap-1">
                    {[2, 3, 6, 12].map((chipVal) => (
                      <button
                        key={chipVal}
                        type="button"
                        onClick={() => setQuantity(chipVal)}
                        className={`px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border transition-all ${
                          quantity === chipVal
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {chipVal}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Slot Target Preview Button */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Assigned Placement</span>
                  <span className="text-xs font-bold text-slate-900">
                    {selectedSlot ? formatSlotLabel(selectedSlot) : 'No slot chosen (Staging Shelf)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('slot')}
                  className="text-xs font-semibold text-rose-800 hover:text-rose-950 flex items-center gap-1"
                >
                  Change Slot <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 'slot' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                {units.map((unit) => (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => {
                      setSelectedUnitId(unit.id);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      selectedUnitId === unit.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {unit.name} ({unit.columns}×{unit.rows})
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>Select an open slot for placement:</span>
                <span className="font-mono text-slate-700">
                  {selectedSlot ? formatSlotLabel(selectedSlot, units) : 'None selected'}
                </span>
              </div>

              {/* Grid Slot Selection */}
              <div className="max-h-60 overflow-y-auto p-2 border border-slate-200 rounded-2xl grid grid-cols-4 sm:grid-cols-6 gap-2">
                {getAvailableSlotsForZone().map((slotId) => {
                  const isOccupied = occupiedSlotIds.has(slotId);
                  const isSelected = selectedSlot === slotId;

                  return (
                    <button
                      key={slotId}
                      type="button"
                      disabled={isOccupied}
                      onClick={() => {
                        setSelectedSlot(slotId);
                      }}
                      className={`p-2 rounded-xl text-center text-xs font-mono transition-all border ${
                        isSelected
                          ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-sm'
                          : isOccupied
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                          : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <div>{slotId.includes(':') ? slotId.split(':')[1] : slotId.replace(/^[AB]-/, '')}</div>
                      <span className="text-[9px] block opacity-70">
                        {isOccupied ? 'Filled' : 'Open'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="py-2.5 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors min-h-[44px] cursor-pointer"
          >
            Cancel
          </button>

          {step === 'review' && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleConfirmSave}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl py-3 px-5 text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 text-rose-300 animate-spin" />
                  <span>Saving Label...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-rose-300" />
                  <span>{quantity === 1 ? 'Confirm & Place Bottle' : `Confirm & Place ${quantity} Bottles`}</span>
                </>
              )}
            </button>
          )}

          {step === 'slot' && (
            <button
              type="button"
              onClick={() => setStep('review')}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-3 px-5 text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              Select This Slot
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
