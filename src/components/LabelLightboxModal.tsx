/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Bottle, WINE_STYLES } from '../types/cellar';
import { WineEstateCard, buildWineEstateCardProps, isOldWorldWine } from './ui/WineEstateCard';
import { LabelSearchModal } from './LabelSearchModal';
import { deleteBottleLabelImage } from '../services/imageStorage';
import { X, ZoomIn, ZoomOut, Camera, RotateCcw } from 'lucide-react';

interface LabelLightboxModalProps {
  bottle: Bottle;
  isOpen: boolean;
  onClose: () => void;
  onUpdatePhoto?: (newImageUrl: string) => void;
  onRemovePhoto?: () => void;
}

export const LabelLightboxModal: React.FC<LabelLightboxModalProps> = ({
  bottle,
  isOpen,
  onClose,
  onUpdatePhoto,
  onRemovePhoto,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    setIsZoomed(false);
    setImageLoadFailed(false);
    setIsSearchOpen(false);
  }, [isOpen, bottle.id, bottle.imageUrl]);

  if (!isOpen) return null;

  const oldWorld = isOldWorldWine(bottle.country, bottle.region);
  const styleMeta = WINE_STYLES[bottle.style] || WINE_STYLES['Medium-Bodied Red Wine'];
  const hasValidPhoto = Boolean(bottle.imageUrl && !imageLoadFailed);
  const estateCardProps = buildWineEstateCardProps(bottle, 'lg');

  const handleRevertToProcedural = async () => {
    if (bottle.imageUrl) {
      try {
        await deleteBottleLabelImage(bottle.imageUrl);
      } catch {
        // Ignore storage cleanup error
      }
    }
    setIsZoomed(false);
    if (onRemovePhoto) {
      onRemovePhoto();
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Dark Ambient Cellar Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/88 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Lightbox Estate Showcase Container */}
      <div
        className={`relative z-10 w-full max-w-md bg-gradient-to-b from-[#1c1917] to-[#141210] text-stone-100 rounded-3xl p-5 sm:p-6 shadow-[0_28px_64px_-12px_rgba(0,0,0,0.85)] border ${
          oldWorld ? 'border-amber-700/35' : 'border-slate-700/60'
        } flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200`}
      >
        {/* Top Bar: Appellation Classification & Dismiss */}
        <div
          className={`w-full flex items-center justify-between pb-3 border-b ${
            oldWorld ? 'border-amber-700/25' : 'border-slate-800'
          }`}
        >
          <div className="min-w-0 pr-3">
            <p
              className={`text-[10.5px] font-mono font-semibold uppercase tracking-[0.2em] ${
                oldWorld ? 'text-amber-400/90' : 'text-rose-400'
              }`}
            >
              {hasValidPhoto
                ? 'Verified Bottle Label Photo'
                : oldWorld
                ? 'OLD WORLD'
                : 'NEW WORLD'}{' '}
              • {bottle.vintage === 'NV' ? 'NV' : bottle.vintage}
            </p>
            <h3
              className={`text-base sm:text-lg text-stone-100 truncate mt-0.5 ${
                oldWorld
                  ? "font-['Playfair_Display',Georgia,serif] font-bold tracking-wide"
                  : 'font-sans font-extrabold tracking-tight'
              }`}
            >
              {bottle.producer}
              {bottle.wineName ? ` · ${bottle.wineName}` : ''}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white bg-stone-800/70 hover:bg-stone-800 border border-stone-700/60 rounded-full transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            aria-label="Close label viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center: High-Resolution Label Photo with Zoom OR Full-Scale Digital Estate Wine Card */}
        <div className="w-full py-2 px-1 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-stone-950/50 to-stone-950/80 border border-white/[0.04] shadow-inner">
          {hasValidPhoto ? (
            <div className="relative w-full max-w-[336px] aspect-[2/3] max-h-[504px] mx-auto rounded-2xl overflow-hidden border border-stone-700/70 bg-stone-900 shadow-2xl">
              <div
                onClick={() => setIsZoomed((prev) => !prev)}
                className={`w-full h-full overflow-auto flex items-center justify-center ${
                  isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
                }`}
              >
                <img
                  src={bottle.imageUrl}
                  loading="lazy"
                  alt={`${bottle.producer} ${bottle.wineName || ''} label`.trim()}
                  onError={() => setImageLoadFailed(true)}
                  className={`w-full h-full object-cover object-center transition-transform duration-200 ${
                    isZoomed ? 'scale-150' : 'scale-100'
                  }`}
                />
              </div>

              {/* Top-Left Vintage Chip */}
              <span className="absolute top-2.5 left-2.5 z-10 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded leading-none tabular-nums pointer-events-none">
                {bottle.vintage === 'NV' ? 'NV' : bottle.vintage}
              </span>

              {/* Top-Right Sommelier Dot */}
              <span
                className="absolute top-2.5 right-2.5 z-10 w-3 h-3 rounded-full ring-2 ring-white/90 shadow-sm pointer-events-none"
                style={{ backgroundColor: styleMeta.dotColor }}
                title={bottle.style}
              />

              {/* Bottom-Right Zoom Toggle Pill */}
              <button
                type="button"
                onClick={() => setIsZoomed((prev) => !prev)}
                className="absolute bottom-2.5 right-2.5 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/80 hover:bg-slate-950 text-stone-100 border border-white/15 text-[11px] font-semibold backdrop-blur-xs transition-colors cursor-pointer"
              >
                {isZoomed ? (
                  <>
                    <ZoomOut className="w-3.5 h-3.5" />
                    <span>Reset Zoom</span>
                  </>
                ) : (
                  <>
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Zoom</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="w-full max-w-[336px] mx-auto shadow-2xl rounded-2xl">
              <WineEstateCard {...estateCardProps} size="lg" />
            </div>
          )}

          {/* Photo Management Actions when bottle.imageUrl is present */}
          {hasValidPhoto && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-rose-300" />
                <span>Change Photo</span>
              </button>
              <button
                type="button"
                onClick={handleRevertToProcedural}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900/80 hover:bg-rose-950/60 text-stone-300 hover:text-rose-200 border border-stone-700/80 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revert to Procedural Card</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div
          className={`w-full flex items-center justify-between gap-3 pt-3 border-t ${
            oldWorld ? 'border-amber-700/25' : 'border-slate-800'
          } text-xs`}
        >
          <span className="text-[10.5px] text-stone-400 font-mono uppercase tracking-[0.12em] truncate">
            {[bottle.varietal, bottle.region, bottle.country].filter(Boolean).join(' · ')}
          </span>

          <button
            onClick={onClose}
            className={`inline-flex items-center px-5 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer min-h-[44px] shrink-0 ${
              oldWorld
                ? 'bg-stone-800 hover:bg-stone-700 text-amber-100 border border-amber-700/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
            }`}
          >
            Done
          </button>
        </div>
      </div>

      {/* Embedded Label Search Modal when "Change Photo" is clicked inside Lightbox */}
      {isSearchOpen && (
        <LabelSearchModal
          bottle={bottle}
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSelectImage={(newUrl) => {
            if (onUpdatePhoto) {
              onUpdatePhoto(newUrl);
            }
            setIsSearchOpen(false);
          }}
          onRemoveImage={() => {
            if (onRemovePhoto) {
              onRemovePhoto();
            }
            setIsSearchOpen(false);
          }}
        />
      )}
    </div>
  );
};
