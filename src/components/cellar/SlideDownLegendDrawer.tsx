/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WINE_STYLES, WineStyle, SOMMELIER_WINE_STYLE_ORDER } from '../../types/cellar';
import { X, Sparkles } from 'lucide-react';

interface SlideDownLegendDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryStyles?: Array<{
    style: WineStyle;
    count: number;
    label?: string;
    dotColor?: string;
    sublabel?: string;
  }>;
}

export const SlideDownLegendDrawer: React.FC<SlideDownLegendDrawerProps> = ({
  isOpen,
  onClose,
  inventoryStyles = [],
}) => {
  if (!isOpen) return null;

  // Build style lookup map with counts from inventory
  const inventoryCountMap = new Map<string, number>();
  inventoryStyles.forEach((s) => {
    inventoryCountMap.set(s.style, s.count);
  });

  return (
    <div className="w-full bg-slate-50 rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 my-1 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/60">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-rose-600" />
          <h4 className="text-xs font-bold text-slate-900 tracking-tight">
            Wine Folly 9 Styles Color Legend
          </h4>
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
            (Organized in sommelier service progression)
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          title="Close Legend"
          aria-label="Close Legend"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {SOMMELIER_WINE_STYLE_ORDER.map((styleKey) => {
          const meta = WINE_STYLES[styleKey];
          const count = inventoryCountMap.get(styleKey) || 0;

          return (
            <div
              key={styleKey}
              className={`flex items-start gap-2.5 p-2 rounded-xl border transition-colors ${
                count > 0
                  ? 'bg-white border-slate-200/90 shadow-2xs'
                  : 'bg-slate-100/50 border-slate-200/40 opacity-60'
              }`}
            >
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs mt-0.5"
                style={{ backgroundColor: meta.dotColor }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {meta.label}
                  </span>
                  {count > 0 && (
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 tabular-nums shrink-0">
                      {count}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                  {meta.sublabel}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
