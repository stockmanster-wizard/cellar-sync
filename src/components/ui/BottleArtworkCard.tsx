/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Bottle } from '../../types/cellar';
import { WineEstateCard, buildWineEstateCardProps } from './WineEstateCard';

export interface BottleArtworkCardProps {
  src?: string;
  alt: string;
  onEnlarge: () => void;
  aspectRatio?: string;
  bottle?: Bottle;
}

export const BottleArtworkCard: React.FC<BottleArtworkCardProps> = ({
  src,
  alt,
  onEnlarge,
  aspectRatio = '2/3',
  bottle,
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  const hasValidSrc = Boolean(src && src.trim().length > 0 && !imageError);

  return (
    <div
      onClick={onEnlarge}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEnlarge();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Enlarge ${alt}`}
      style={{ aspectRatio }}
      className="relative w-full rounded-xl overflow-hidden border border-neutral-200/80 dark:border-neutral-800 shadow-sm cursor-zoom-in active:scale-[0.98] transition-transform duration-150 select-none bg-[#FAF6EE]"
    >
      {hasValidSrc ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover select-none"
          onError={() => setImageError(true)}
          draggable={false}
        />
      ) : bottle ? (
        <WineEstateCard
          {...buildWineEstateCardProps(bottle, 'sm')}
          size="sm"
          className="w-full h-full !rounded-none !border-0"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-stone-400 p-2 text-center">
          {alt}
        </div>
      )}
    </div>
  );
};
