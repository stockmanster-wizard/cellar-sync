/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

interface CellarHeaderShellProps {
  searchInput: React.ReactNode;
  storageTabs?: React.ReactNode;
  filterRibbon: React.ReactNode;
  legendDrawer?: React.ReactNode;
  className?: string;
}

/**
 * Standardized header shell shared between Cellar Map, Inventory, and History views.
 * On mobile (< sm), filterRibbon collapses behind a compact Filters toggle to maximize above-the-fold grid rows.
 */
export const CellarHeaderShell: React.FC<CellarHeaderShellProps> = ({
  searchInput,
  storageTabs,
  filterRibbon,
  legendDrawer,
  className = '',
}) => {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    <div className={`w-full flex flex-col gap-1.5 sm:gap-3 p-2 sm:p-4 bg-white rounded-2xl border border-slate-100 shadow-sm ${className}`}>
      {/* Tier 1: Search + Mobile Filters Toggle */}
      <div className="w-full flex items-center gap-1.5">
        <div className="flex-1 min-w-0">{searchInput}</div>
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((prev) => !prev)}
          aria-expanded={mobileFiltersOpen}
          aria-label="Toggle filters"
          className={`sm:hidden shrink-0 h-[38px] px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
            mobileFiltersOpen
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters</span>
        </button>
      </div>

      {/* Tier 2: Storage Tabs (Enforce single-line horizontal scroll) */}
      {storageTabs && (
        <div className="w-full flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
          {storageTabs}
        </div>
      )}

      {/* Tier 3: Filter Ribbon (Always visible on sm+, toggled on mobile) */}
      <div className={`w-full ${mobileFiltersOpen ? 'block' : 'hidden sm:block'}`}>
        {filterRibbon}
      </div>

      {/* Optional Collapsible Slide-Down Legend Drawer */}
      {legendDrawer && <div className="w-full pt-1 border-t border-slate-100">{legendDrawer}</div>}
    </div>
  );
};
