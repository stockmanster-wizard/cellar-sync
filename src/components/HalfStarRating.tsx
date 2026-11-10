/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Star } from 'lucide-react';

interface HalfStarRatingProps {
  value: number | null;
  onChange?: (newValue: number | null) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  autoFocus?: boolean;
  showSkipButton?: boolean;
}

export const HalfStarRating: React.FC<HalfStarRatingProps> = ({
  value,
  onChange,
  readOnly = false,
  size = 'md',
  autoFocus = false,
  showSkipButton = true,
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus && !readOnly && containerRef.current) {
      containerRef.current.focus();
    }
  }, [autoFocus, readOnly]);

  const activeScore = hoverValue !== null ? hoverValue : value;

  const iconSizeClass =
    size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (readOnly || !onChange) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const current = value ?? 0;
      const next = Math.min(5.0, Math.round((current + 0.5) * 2) / 2);
      onChange(next);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (value === null || value <= 0.5) {
        onChange(null);
      } else {
        const prev = Math.max(0.5, Math.round((value - 0.5) * 2) / 2);
        onChange(prev);
      }
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      e.preventDefault();
      onChange(null);
    }
  };

  const computeHalfOrFullFromPointer = (
    e: React.MouseEvent<HTMLButtonElement>,
    starIndex: number
  ): number => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeftHalf = clickX < rect.width / 2;
    return isLeftHalf ? starIndex - 0.5 : starIndex;
  };

  const renderStarVisual = (starIndex: number) => {
    const score = activeScore ?? 0;
    const isFull = score >= starIndex;
    const isHalf = !isFull && score >= starIndex - 0.5;

    return (
      <span className={`relative inline-flex items-center justify-center ${iconSizeClass}`}>
        {/* Base empty star */}
        <Star className={`${iconSizeClass} text-slate-300`} />

        {/* Full or Half filled overlay */}
        {(isFull || isHalf) && (
          <span
            className="absolute inset-y-0 left-0 overflow-hidden flex items-center"
            style={{ width: isFull ? '100%' : '50%' }}
          >
            <Star className={`${iconSizeClass} fill-amber-400 text-amber-500 shrink-0`} />
          </span>
        )}
      </span>
    );
  };

  if (readOnly) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <div className="flex items-center gap-0.5" aria-label={value ? `Rated ${value} out of 5 stars` : 'Unrated'}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className="inline-flex">
              {renderStarVisual(star)}
            </span>
          ))}
        </div>
        <span className="font-mono text-xs font-bold tabular-nums text-slate-700">
          {value !== null && value > 0 ? `${value.toFixed(value % 1 === 0 ? 0 : 1)}/5` : 'Unrated'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div
        ref={containerRef}
        tabIndex={0}
        role="slider"
        aria-label="Wine rating in half-star increments"
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={value ?? 0}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => setHoverValue(null)}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-shadow"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            tabIndex={-1}
            onMouseMove={(e) => {
              const targetVal = computeHalfOrFullFromPointer(e, star);
              setHoverValue(targetVal);
            }}
            onClick={(e) => {
              if (!onChange) return;
              const clickedVal = computeHalfOrFullFromPointer(e, star);
              if (value === clickedVal) {
                onChange(null);
              } else {
                onChange(clickedVal);
              }
            }}
            className="p-0.5 cursor-pointer transition-transform active:scale-95 focus:outline-none"
            title={`Rate ${star - 0.5} or ${star} stars`}
          >
            {renderStarVisual(star)}
          </button>
        ))}

        <span className="ml-2 text-xs font-mono font-bold tabular-nums text-slate-800 min-w-[68px]">
          {activeScore !== null && activeScore > 0
            ? `★ ${activeScore.toFixed(1)} / 5`
            : 'Unrated'}
        </span>
      </div>

      {showSkipButton && onChange && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
            value === null
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          {value === null ? 'Skipped (Unrated)' : 'Skip Rating'}
        </button>
      )}
    </div>
  );
};
