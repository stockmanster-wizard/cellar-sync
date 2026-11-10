/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { WineStyle, WINE_STYLES, SOMMELIER_WINE_STYLE_ORDER } from '../types/cellar';
import { ChevronDown, Check, Wine, ExternalLink } from 'lucide-react';

export interface InventoryStyleItem {
  style: WineStyle;
  count: number;
  label: string;
  shortLabel: string;
  dotColor: string;
  sublabel?: string;
}

interface StyleDropdownProps {
  selectedStyle: string; // 'all' or WineStyle
  onChange: (style: WineStyle | 'all') => void;
  inventoryStyles: InventoryStyleItem[];
  totalBottles: number;
  className?: string;
}

export const StyleDropdown: React.FC<StyleDropdownProps> = ({
  selectedStyle,
  onChange,
  inventoryStyles,
  totalBottles,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = useCallback(() => {
    if (!dropdownRef.current) return;
    const triggerRect = dropdownRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const margin = 12;
    const menuWidth = menuRef.current
      ? menuRef.current.offsetWidth
      : Math.min(viewportWidth >= 640 ? 320 : 288, viewportWidth - margin * 2);

    // Default: align left edge of menu with left edge of trigger button
    let targetScreenLeft = triggerRect.left;

    // If extending rightward overflows the right viewport boundary, shift left
    if (targetScreenLeft + menuWidth > viewportWidth - margin) {
      const rightAlignedScreenLeft = triggerRect.right - menuWidth;
      if (rightAlignedScreenLeft >= margin) {
        targetScreenLeft = rightAlignedScreenLeft;
      } else {
        targetScreenLeft = viewportWidth - margin - menuWidth;
      }
    }

    // Never allow left edge of menu to go past the left viewport margin
    targetScreenLeft = Math.max(margin, targetScreenLeft);

    setMenuCoords({
      top: triggerRect.bottom + 6,
      left: targetScreenLeft,
    });
  }, []);

  useLayoutEffect(() => {
    if (isOpen) {
      updateMenuPosition();
    }
  }, [isOpen, updateMenuPosition]);

  // Close when clicking outside or pressing Escape, and recalculate position on resize/scroll
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', updateMenuPosition);
      window.addEventListener('scroll', updateMenuPosition, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen, updateMenuPosition]);

  const selectedMeta = selectedStyle !== 'all' ? WINE_STYLES[selectedStyle as WineStyle] : null;

  // Ensure inventory styles always appear in canonical sommelier tasting progression
  const sortedInventoryStyles = useMemo(() => {
    return [...inventoryStyles].sort((a, b) => {
      const idxA = SOMMELIER_WINE_STYLE_ORDER.indexOf(a.style);
      const idxB = SOMMELIER_WINE_STYLE_ORDER.indexOf(b.style);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });
  }, [inventoryStyles]);

  return (
    <div className={`relative inline-block text-left flex-shrink-0 whitespace-nowrap ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-3 py-1.5 sm:py-2 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-all shadow-xs text-slate-800 min-h-[32px] sm:min-h-[36px] select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900"
      >
        {selectedStyle === 'all' ? (
          <div className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap">
            <span className="flex -space-x-1 overflow-hidden shrink-0">
              {sortedInventoryStyles.slice(0, 3).map((item) => (
                <span
                  key={item.style}
                  className="w-2.5 h-2.5 rounded-full ring-1 ring-white shrink-0"
                  style={{ backgroundColor: item.dotColor }}
                />
              ))}
              {sortedInventoryStyles.length === 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
              )}
            </span>
            <span>All Styles</span>
            <span className="text-[11px] font-mono text-slate-500 font-normal">
              ({totalBottles})
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs ring-2 ring-white"
              style={{ backgroundColor: selectedMeta?.dotColor || '#881337' }}
            />
            <span className="font-semibold text-slate-900">
              {selectedMeta?.label || selectedStyle}
            </span>
            {sortedInventoryStyles.find((i) => i.style === selectedStyle) && (
              <span className="text-[11px] font-mono text-slate-500 font-normal">
                ({sortedInventoryStyles.find((i) => i.style === selectedStyle)?.count})
              </span>
            )}
          </div>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ml-1 ${
            isOpen ? 'rotate-180 text-slate-700' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu — Rendered in Portal so horizontal scroll wrappers never clip it */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: `${menuCoords.top}px`, left: `${menuCoords.left}px` }}
            className="fixed w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 z-[100] animate-in fade-in-50 zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Filter by Wine Style
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {sortedInventoryStyles.length} {sortedInventoryStyles.length === 1 ? 'style' : 'styles'} in cellar
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {/* Option: All Styles */}
            <button
              type="button"
              onClick={() => {
                onChange('all');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                selectedStyle === 'all'
                  ? 'bg-rose-50/70 text-rose-950 font-bold'
                  : 'text-slate-800 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  <Wine className="w-3.5 h-3.5 text-rose-700" />
                </div>
                <div className="min-w-0">
                  <span className="block truncate">All Styles</span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    Showing all wines in cellar
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                  {totalBottles}
                </span>
                {selectedStyle === 'all' && (
                  <Check className="w-4 h-4 text-rose-700 shrink-0" />
                )}
              </div>
            </button>

            {/* Empty state when no styles in cellar */}
            {sortedInventoryStyles.length === 0 ? (
              <div className="px-4 py-4 text-center text-xs text-slate-400">
                No bottles in cellar yet.
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  Add bottles to filter by style.
                </span>
              </div>
            ) : (
              /* Only styles that currently exist in inventory */
              sortedInventoryStyles.map((item) => {
                const isSelected = selectedStyle === item.style;
                const meta = WINE_STYLES[item.style] || WINE_STYLES['Medium-Bodied Red Wine'];

                return (
                  <button
                    key={item.style}
                    type="button"
                    onClick={() => {
                      onChange(item.style);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50/70 text-rose-950 font-bold'
                        : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Wine Folly Color Indicator Dot */}
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-xs ring-2 ring-white border border-black/10"
                        style={{ backgroundColor: item.dotColor }}
                        title={`${item.label} color indicator`}
                      />
                      <div className="min-w-0">
                        <span className="block truncate font-medium">{item.label}</span>
                        {meta.sublabel && (
                          <span className="text-[10px] text-slate-400 block truncate font-normal">
                            {meta.sublabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        {item.count}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-rose-700 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer with Wine Folly Reference Link */}
          <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl flex items-center justify-between text-[10px] text-slate-500">
            <span>Wine Folly 9 Primary Styles</span>
            <a
              href="https://winefolly.com/deep-dive/everything-you-need-to-know-about-wine-in-9-bottles/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-rose-700 hover:text-rose-900 font-medium transition-colors"
            >
              <span>Learn Guide</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
