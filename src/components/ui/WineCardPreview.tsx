import React, { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { WineEstateCard, WineEstateCardProps } from './WineEstateCard';
import { Button } from './Button';
import { SegmentedControl } from './SegmentedControl';
import { Skeleton } from './Skeleton';

export interface WineCardPreviewProps {
  wineData: WineEstateCardProps;
  customPhotoUrl?: string;
  hasUploadedPhoto: boolean;
  selectedStyle: 'photo' | 'card';
  onSelectStyle: (style: 'photo' | 'card') => void;
  onRetakePhoto: () => void;
  isEmptyManual?: boolean;
  isLoading?: boolean;
  isScanning?: boolean;
}

export const WineCardPreview: React.FC<WineCardPreviewProps> = ({
  wineData,
  customPhotoUrl,
  hasUploadedPhoto,
  selectedStyle,
  onSelectStyle,
  onRetakePhoto,
  isEmptyManual = false,
  isLoading = false,
  isScanning = false,
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [customPhotoUrl]);

  const activeLoading = isLoading || isScanning;

  const showPhoto =
    selectedStyle === 'photo' &&
    Boolean(customPhotoUrl && customPhotoUrl.trim().length > 0 && !imageError);

  const originLine = [wineData.region, wineData.country]
    .map((s) => (s || '').trim())
    .filter((s) => s && s.toLowerCase() !== 'estate')
    .join(', ');

  const cuveeAndVintage = [
    wineData.cuvee?.trim(),
    wineData.vintage ? String(wineData.vintage) : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-row gap-4 p-4 bg-stone-50 dark:bg-neutral-900 rounded-2xl border border-stone-200/80 dark:border-neutral-800">
      {/* Left Column: Bottle Thumbnail + Retake Button */}
      <div className="flex-shrink-0 flex flex-col justify-between w-32 sm:w-40">
        {isEmptyManual && !showPhoto ? (
          <div
            onClick={onRetakePhoto}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRetakePhoto();
              }
            }}
            aria-label="Retake or add bottle photo"
            className="w-full aspect-[2/3] border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl flex flex-col items-center justify-center p-3 text-center bg-white/60 dark:bg-neutral-900/50 cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors select-none"
          >
            <Camera className="w-6 h-6 text-neutral-400 mb-1.5" />
            <span className="text-[11px] font-medium text-neutral-400">
              Photo / Preview
            </span>
          </div>
        ) : (
          <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden shadow-xs border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 select-none">
            {showPhoto ? (
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

        <Button
          variant="outline"
          size="sm"
          icon={<Camera className="w-4 h-4 text-neutral-500" />}
          onClick={onRetakePhoto}
          className="w-full mt-2 h-9 flex items-center justify-center gap-1.5 text-xs"
        >
          Retake Photo
        </Button>
      </div>

      {/* Right Column: Text/Skeleton Stack + Bottom Button Row */}
      <div className="min-w-0 flex-1 overflow-hidden flex flex-col justify-between">
        {/* Top metadata stack */}
        <div className="min-w-0 overflow-hidden space-y-1">
          {activeLoading ? (
            <div className="min-w-0 overflow-hidden">
              <Skeleton className="h-6 w-36 max-w-full mb-1" />
              <Skeleton className="h-4 w-12 max-w-full mb-1" />
              <Skeleton className="h-4 w-28 max-w-full mb-2" />
              <Skeleton className="h-4 w-24 max-w-full" />
            </div>
          ) : isEmptyManual && !hasUploadedPhoto ? (
            <>
              <h3 className="font-bold text-base text-neutral-900 dark:text-white leading-tight">
                Enter bottle details below
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Your wine card preview updates live as you enter the producer, region, and vintage.
              </p>
            </>
          ) : (
            <>
              <h3 className="font-bold text-base sm:text-lg text-neutral-900 dark:text-white line-clamp-2 leading-tight">
                {wineData.producer}
              </h3>
              {cuveeAndVintage && (
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 font-medium line-clamp-2">
                  {cuveeAndVintage}
                </p>
              )}
              {originLine && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  {originLine}
                </p>
              )}
              {(wineData.varietal || wineData.style) && (
                <div className="flex items-center gap-1.5 pt-1 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: wineData.varietalColor }}
                  />
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">
                    {wineData.varietal || wineData.style}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom control anchor */}
        <div className="mt-3 pt-2 border-t border-neutral-200/70 dark:border-neutral-800 flex items-center justify-between gap-2">
          <span className="hidden sm:inline text-[11px] font-medium text-neutral-400 uppercase tracking-wider shrink-0">
            Style
          </span>
          <SegmentedControl
            size="sm"
            options={[
              { label: 'Photo', value: 'photo' },
              { label: 'Card', value: 'card' },
            ]}
            value={selectedStyle}
            onChange={onSelectStyle}
            className="h-9 w-full sm:w-auto"
          />
        </div>
      </div>
    </div>
  );
};

export default WineCardPreview;
