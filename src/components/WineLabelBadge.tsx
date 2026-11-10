/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Bottle, WINE_STYLES } from '../types/cellar';
import {
  WineEstateCard,
  buildWineEstateCardProps,
  isOldWorldWine,
} from './ui/WineEstateCard';
import { Maximize2 } from 'lucide-react';

export { isOldWorldWine };

export interface WineLabelBadgeProps {
  bottle: Pick<
    Bottle,
    | 'producer'
    | 'wineName'
    | 'varietal'
    | 'vintage'
    | 'style'
    | 'country'
    | 'region'
    | 'alcoholPercent'
    | 'slotId'
    | 'visualMode'
    | 'imageUrl'
  >;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  showEnlargeHint?: boolean;
  className?: string;
}

export const WineLabelBadge: React.FC<WineLabelBadgeProps> = ({
  bottle,
  size = 'md',
  onClick,
  showEnlargeHint = false,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [bottle.imageUrl]);

  const styleMeta = WINE_STYLES[bottle.style] || WINE_STYLES['Medium-Bodied Red Wine'];
  const oldWorld = isOldWorldWine(bottle.country, bottle.region);

  // ---------------------------------------------------------------------------
  // HYBRID PHOTO RENDERING — Verified Bottle Label Photo with Sommelier Overlays
  // ---------------------------------------------------------------------------
  if (bottle.visualMode !== 'card' && bottle.imageUrl && !imageError) {
    const sizeGeometry =
      size === 'sm'
        ? 'shrink-0 w-12 h-16'
        : size === 'md'
        ? 'shrink-0 w-24 h-36'
        : 'w-full max-w-[336px] aspect-[2/3] mx-auto';

    return (
      <div
        onClick={onClick}
        className={`relative overflow-hidden rounded-xl border border-stone-200/90 shadow-xs bg-stone-100 flex items-center justify-center group select-none transition-all ${sizeGeometry} ${
          onClick ? 'cursor-pointer hover:shadow-md active:scale-98' : ''
        } ${className}`}
        title={`${bottle.vintage} ${bottle.producer} - ${bottle.wineName || bottle.varietal || bottle.style}`}
      >
        <img
          src={bottle.imageUrl}
          loading="lazy"
          alt={`${bottle.producer} ${bottle.wineName || ''} label`.trim()}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover object-center"
        />

        {/* Top-Left Overlay: Vintage Chip */}
        <span
          className={`absolute top-1 left-1 z-10 bg-slate-900/80 backdrop-blur-xs text-white font-mono font-bold rounded leading-none tabular-nums ${
            size === 'sm' ? 'text-[7px] px-1 py-0.5' : 'text-[9px] px-1.5 py-0.5'
          }`}
        >
          {bottle.vintage === 'NV' ? 'NV' : bottle.vintage}
        </span>

        {/* Top-Right Overlay: Sommelier Style Dot */}
        <span
          className={`absolute top-1 right-1 z-10 rounded-full ring-1 ring-white/90 shadow-2xs shrink-0 ${
            size === 'sm' ? 'w-1.5 h-1.5' : 'w-2.5 h-2.5'
          }`}
          style={{ backgroundColor: styleMeta.dotColor }}
          title={bottle.style}
        />

        {/* Hover / Tap Enlarge Cue */}
        {showEnlargeHint && (
          <div className="absolute inset-0 bg-stone-950/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[1px] z-20">
            <div className="bg-white/95 text-stone-900 p-1.5 rounded-full shadow-md">
              <Maximize2 className="w-3.5 h-3.5" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 1. COMPACT SIZE (sm) — Inventory Table & History List Micro-Thumbnails
  // ---------------------------------------------------------------------------
  if (size === 'sm') {
    const microOrigin = (bottle.country || bottle.region || 'ESTATE').toUpperCase();
    return (
      <div
        onClick={onClick}
        className={`relative shrink-0 w-12 h-16 rounded-lg overflow-hidden border ${
          oldWorld
            ? 'bg-[#FAF6EE] border-[#D5C7A9]'
            : 'bg-white border-neutral-200'
        } shadow-2xs select-none transition-transform active:scale-95 ${
          onClick ? 'cursor-pointer hover:shadow-xs' : ''
        } ${className}`}
        title={`${bottle.vintage} ${bottle.producer} - ${bottle.wineName || bottle.varietal || bottle.style}`}
      >
        {!oldWorld && (
          <div
            className="w-full h-1"
            style={{
              background: `linear-gradient(90deg, ${styleMeta.dotColor} 0%, #c8a25a 55%, ${styleMeta.dotColor} 100%)`,
            }}
          />
        )}
        <div
          className={`absolute inset-[2px] border ${
            oldWorld ? 'border-[#E5DEC9] rounded-md' : 'border-neutral-200/70 rounded-xs'
          } pointer-events-none`}
        />

        <div className="relative z-10 w-full h-full p-1 flex flex-col justify-between text-stone-900">
          <div className="flex items-center justify-between text-[7.5px] font-mono leading-none text-stone-700 px-0.5">
            <span className="font-bold tabular-nums">
              {bottle.vintage === 'NV' ? 'NV' : bottle.vintage}
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 ring-1 ring-white/80"
              style={{ backgroundColor: styleMeta.dotColor }}
            />
          </div>

          <div className="my-auto text-center px-0.5">
            <p
              className="text-[5.5px] font-sans font-bold tracking-[0.12em] uppercase truncate"
              style={{ color: styleMeta.dotColor }}
            >
              {microOrigin}
            </p>
            <div
              className={`h-[1px] w-6 mx-auto my-0.5 ${
                oldWorld ? 'bg-[#D5C7A9]' : 'bg-neutral-200'
              }`}
            />
            <p
              className={`${
                oldWorld
                  ? 'font-serif font-bold tracking-wide'
                  : 'font-sans font-extrabold tracking-tight'
              } text-[8px] leading-[9.5px] text-stone-950 line-clamp-2 uppercase`}
            >
              {bottle.producer || 'Estate'}
            </p>
          </div>

          <div
            className="h-0.5 w-full rounded-full opacity-90"
            style={{ backgroundColor: styleMeta.dotColor }}
          />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. MEDIUM & LARGE SIZES (md / lg) — Delegates directly to WineEstateCard
  //    (Zero map rendering, zero cellar slot coordinates)
  // ---------------------------------------------------------------------------
  const cardSize = size === 'lg' ? 'lg' : 'sm';
  const estateProps = buildWineEstateCardProps(bottle, cardSize);

  return (
    <div
      onClick={onClick}
      className={`${
        size === 'md' ? 'shrink-0 w-24' : 'w-full max-w-[336px] mx-auto'
      } ${onClick ? 'cursor-pointer active:scale-98 transition-transform' : ''} ${className}`}
    >
      <WineEstateCard {...estateProps} size={cardSize} />
    </div>
  );
};
