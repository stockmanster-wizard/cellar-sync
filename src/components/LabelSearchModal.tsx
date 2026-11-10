/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Bottle } from '../types/cellar';
import { compressLabelImage } from '../utils/imageProcessor';
import { uploadBottleLabelImage, deleteBottleLabelImage } from '../services/imageStorage';
import { saveImageBlob, deleteImageBlob } from '../services/imageCacheStore';
import { auth } from '../services/firebase';
import {
  X,
  Check,
  Upload,
  RefreshCw,
  AlertCircle,
  Search,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface LabelSearchModalProps {
  bottle: Bottle;
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (downloadUrl: string) => void;
  onRemoveImage?: () => void;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to encode compressed WebP image.'));
    reader.readAsDataURL(blob);
  });
}

export const LabelSearchModal: React.FC<LabelSearchModalProps> = ({
  bottle,
  isOpen,
  onClose,
  onSelectImage,
  onRemoveImage,
}) => {
  const [candidates, setCandidates] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingSearch, setIsLoadingSearch] = useState<boolean>(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [selectedCandidateUrl, setSelectedCandidateUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCandidates = async (payload: {
    producer?: string;
    wineName?: string;
    varietal?: string;
    vintage?: string | number;
    region?: string;
    customQuery?: string;
  }) => {
    setIsLoadingSearch(true);
    setCandidates([]);
    setSearchMessage(null);
    setSelectedCandidateUrl(null);
    setFailedUrls(new Set());

    try {
      const res = await fetch('/api/search-label-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      const list = Array.isArray(data?.candidates) ? data.candidates.slice(0, 4) : [];
      setCandidates(list);

      if (list.length === 0) {
        setSearchMessage(
          data?.error ||
            'No verified label photos found for this query. Try refining your search terms above or upload a photo directly from your device.'
        );
      }
    } catch (err: any) {
      setSearchMessage(
        err?.message || 'Could not reach label search service. Please upload a photo manually.'
      );
    } finally {
      setIsLoadingSearch(false);
    }
  };

  useEffect(() => {
    if (isOpen && bottle) {
      setIsSaving(false);
      setSaveError(null);
      const cleanProd = (bottle.producer || '').trim();
      const rawSecondary = (bottle.wineName || bottle.varietal || '').trim();
      const cleanSec =
        rawSecondary.toLowerCase() !== cleanProd.toLowerCase()
          ? rawSecondary
          : (bottle.varietal || '').trim();
      const autoQuery = `${cleanProd} ${cleanSec}`.replace(/\s+/g, ' ').trim();
      setSearchQuery(autoQuery);
      fetchCandidates({
        producer: bottle.producer,
        wineName: bottle.wineName,
        varietal: bottle.varietal,
      });
    }
  }, [isOpen, bottle?.id]);

  if (!isOpen) return null;

  const processAndSaveLabel = async (webpBlob: Blob) => {
    const dataUrl = await blobToDataUrl(webpBlob);

    // Step 1: Save local cache to IndexedDB for instant offline viewing
    if (bottle?.id && !bottle.id.startsWith('draft-')) {
      await saveImageBlob(bottle.id, dataUrl);
    }

    // Step 2: Upload to Firebase Cloud Storage if authenticated, saving lightweight HTTPS URL to Firestore
    const userId = auth.currentUser?.uid;
    let finalImageUrl = dataUrl;
    if (userId && bottle?.id && !bottle.id.startsWith('draft-')) {
      try {
        const downloadUrl = await uploadBottleLabelImage(userId, bottle.id, webpBlob);
        finalImageUrl = downloadUrl;

        // Clean up previous Firebase Storage photo if it exists and differs
        if (bottle.imageUrl && bottle.imageUrl !== downloadUrl) {
          deleteBottleLabelImage(bottle.imageUrl).catch(() => {});
        }
      } catch (storageErr) {
        console.warn('Firebase Storage upload failed, falling back to data URL in Firestore:', storageErr);
      }
    }

    await onSelectImage(finalImageUrl);
  };

  const handleSelectCandidate = async (candidateUrl: string) => {
    if (isSaving) return;
    setSelectedCandidateUrl(candidateUrl);
    setIsSaving(true);
    setSaveError(null);

    try {
      // Step 1: Fetch clean base64 data through the server proxy (bypasses CORS)
      const proxyRes = await fetch('/api/proxy-label-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: candidateUrl }),
      });

      const proxyData = await proxyRes.json();
      if (!proxyRes.ok || !proxyData.dataUrl) {
        throw new Error(proxyData.error || 'Failed to download candidate image.');
      }

      // Step 2: Compress clean base64 via client canvas to 400x600 WebP Blob
      const webpBlob = await compressLabelImage(proxyData.dataUrl);

      // Step 3: Process and save via shared storage/cache pipeline
      await processAndSaveLabel(webpBlob);
      onClose();
    } catch (err: any) {
      console.error('Failed to save candidate label:', err);
      setSaveError(err.message || 'Could not save this label. Please choose another candidate.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeviceFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || isSaving) return;

    setSelectedCandidateUrl('device-upload');
    setIsSaving(true);
    setSaveError(null);

    try {
      const webpBlob = await compressLabelImage(file);
      await processAndSaveLabel(webpBlob);
      onClose();
    } catch (err: any) {
      console.error('Failed to save uploaded label:', err);
      setSaveError(err.message || 'Could not process the selected file. Please try another photo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveExistingPhoto = async () => {
    if (bottle?.id) {
      await deleteImageBlob(bottle.id);
    }
    if (bottle.imageUrl) {
      try {
        await deleteBottleLabelImage(bottle.imageUrl);
      } catch {
        // Ignore storage cleanup error
      }
    }
    if (onRemoveImage) {
      onRemoveImage();
    }
    onClose();
  };

  const visibleCandidates = candidates.filter((url) => !failedUrls.has(url));

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isSaving) onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal / Bottom Sheet */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Mobile Grab Handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
              <Search className="w-3.5 h-3.5" />
              <span>LABEL SEARCH</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Select Bottle Label
            </h3>
            <p className="line-clamp-2 text-sm text-neutral-500 mt-0.5 leading-snug">
              {[
                bottle.vintage === 'NV' ? 'NV' : bottle.vintage,
                bottle.producer,
                bottle.wineName || bottle.varietal,
              ]
                .filter(Boolean)
                .join(' ')}
            </p>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
            aria-label="Close label search modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Interactive Search Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                fetchCandidates({ customQuery: searchQuery.trim() });
              }
            }}
            className="relative w-full mb-3"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Refine search terms (e.g. Whitman Cellars Killer Cab 2008)..."
              className="w-full pl-9 pr-20 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 font-medium"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Saving inline spinner banner */}
          {isSaving && (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
              <RefreshCw className="w-4 h-4 text-rose-700 animate-spin shrink-0" />
              <span className="font-semibold">Saving label to cellar storage...</span>
            </div>
          )}

          {/* Error banner */}
          {saveError && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Candidate Grid or Loading Skeletons */}
          {isLoadingSearch ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="aspect-[2/3] rounded-2xl bg-slate-100 border border-slate-200 animate-pulse flex flex-col items-center justify-center p-3"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-200 mb-2" />
                  <div className="h-2 w-16 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ) : visibleCandidates.length > 0 ? (
            <div>
              <p className="text-xs text-slate-500 mb-2.5">
                Tap an image to update your bottle photo:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {visibleCandidates.map((url, idx) => {
                  const isSelected = selectedCandidateUrl === url;
                  return (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSelectCandidate(url)}
                      className={`group relative aspect-[2/3] rounded-2xl overflow-hidden border bg-stone-50 flex flex-col justify-between text-left hover:border-neutral-400 active:scale-[0.98] transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 ring-2 ring-emerald-600 ring-offset-2 shadow-md'
                          : 'border-slate-200 hover:shadow-sm'
                      }`}
                    >
                      <img
                        src={url}
                        referrerPolicy="no-referrer"
                        alt={`${bottle.producer} candidate label ${idx + 1}`}
                        onError={() => {
                          setFailedUrls((prev) => new Set(prev).add(url));
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />

                      {/* Subtle Semi-Transparent Scrim & Circular Checkmark Badge on Tap/Selection */}
                      <div
                        className={`absolute inset-0 transition-opacity pointer-events-none ${
                          isSelected
                            ? 'bg-slate-950/15 opacity-100'
                            : 'bg-slate-950/10 opacity-0 group-hover:opacity-100'
                        }`}
                      />
                      <div
                        className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all pointer-events-none shadow-sm ${
                          isSelected
                            ? 'bg-emerald-600 text-white scale-100 opacity-100'
                            : 'bg-slate-900/60 text-white/90 scale-95 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 mx-auto flex items-center justify-center text-slate-500">
                <Sparkles className="w-5 h-5 text-rose-700" />
              </div>
              <p className="text-xs font-semibold text-slate-800">
                No automatic web label matches found
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchMessage ||
                  'Upload a custom photo of the bottle label from your device.'}
              </p>
            </div>
          )}

          {/* Hidden File Input for Manual Device Upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleDeviceFileSelect}
            accept="image/*"
            className="hidden"
          />
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row-reverse items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] py-2 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white hover:bg-neutral-50 text-neutral-600 dark:text-neutral-300 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span>Upload Custom Photo</span>
          </button>

          <div className="flex items-center justify-center sm:justify-start gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="min-h-[44px] py-2 px-4 rounded-xl text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 hover:bg-neutral-100/80 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {bottle.imageUrl && onRemoveImage && (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleRemoveExistingPhoto}
                className="min-h-[44px] py-2 px-3.5 rounded-xl text-rose-700 hover:bg-rose-50 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Photo</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
