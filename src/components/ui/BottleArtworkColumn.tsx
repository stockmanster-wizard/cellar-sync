/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { WineEstateCard, WineEstateCardProps } from './WineEstateCard';

export interface BottleArtworkColumnProps {
  customPhotoUrl?: string;
  wineData: WineEstateCardProps;
  onEnlarge?: () => void;
  onChangePhoto: () => void;
  widthClass?: string;
  isEmptyPlaceholder?: boolean;
  actionLabel?: string;
}

export const BottleArtworkColumn: React.FC<BottleArtworkColumnProps> = ({
  customPhotoUrl,
  wineData,
  onEnlarge,
  onChangePhoto,
  widthClass = 'w-28',
  isEmptyPlaceholder = false,
  actionLabel,
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [customPhotoUrl]);

  const hasCustomPhoto = Boolean(customPhotoUrl && customPhotoUrl.trim().length > 0 && !imageError);
  const resolvedActionLabel = actionLabel || (hasCustomPhoto ? 'Change Photo' : 'Add Bottle Photo');

  return (
    <div className={`flex flex-col ${widthClass} shrink-0 gap-2`}>
      {/* Artwork Thumbnail or Empty State Placeholder */}
      {isEmptyPlaceholder && !hasCustomPhoto ? (
        <div
          onClick={onChangePhoto}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onChangePhoto();
            }
          }}
          aria-label="Add bottle photo or enter wine details to preview card"
          className="w-full aspect-[2/3] border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl flex flex-col items-center justify-center p-2 text-center bg-neutral-50/50 dark:bg-neutral-900/50 cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors select-none"
        >
          <Camera className="w-6 h-6 text-neutral-400 mb-1" />
          <span className="text-[10px] font-medium text-neutral-400">
            Photo / Preview
          </span>
        </div>
      ) : (
        <div
          onClick={onEnlarge}
          onKeyDown={(e) => {
            if (onEnlarge && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onEnlarge();
            }
          }}
          role={onEnlarge ? 'button' : undefined}
          tabIndex={onEnlarge ? 0 : undefined}
          aria-label={
            onEnlarge
              ? `Enlarge ${wineData.producer} ${wineData.cuvee || wineData.varietal || 'bottle'}`
              : undefined
          }
          className={`relative w-full aspect-[2/3] rounded-xl overflow-hidden ${
            onEnlarge ? 'cursor-zoom-in active:scale-[0.98] transition-transform' : ''
          } shadow-sm border border-neutral-200/80 dark:border-neutral-800 select-none`}
        >
          {hasCustomPhoto ? (
            <img
              src={customPhotoUrl}
              alt={`${wineData.producer} ${wineData.cuvee || wineData.varietal || 'bottle'}`.trim()}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover object-center select-none"
              draggable={false}
            />
          ) : (
            <WineEstateCard
              {...wineData}
              size="sm"
              className="w-full h-full !rounded-none !border-0"
            />
          )}
        </div>
      )}

      {/* Action Pill: w-full to match container boundaries without truncating "Change Photo" */}
      <button
        type="button"
        onClick={onChangePhoto}
        className="w-full py-1.5 px-1.5 rounded-lg border border-neutral-200 dark:border-neutral-750 bg-neutral-50 dark:bg-neutral-800 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 shadow-xs flex items-center justify-center gap-1 whitespace-nowrap active:bg-neutral-100 dark:active:bg-neutral-700 transition-colors cursor-pointer"
      >
        <Camera className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
        <span>{resolvedActionLabel}</span>
      </button>
    </div>
  );
};
