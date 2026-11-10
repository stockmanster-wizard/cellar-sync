/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CellarHeaderShellProps {
  searchInput: React.ReactNode;
  storageTabs?: React.ReactNode;
  filterRibbon: React.ReactNode;
  legendDrawer?: React.ReactNode;
  className?: string;
}

/**
 * Standardized 3-tier header shell shared between Cellar Map, Inventory, and History views.
 * Tier 1: Dedicated Search Input (Full Width w-full)
 * Tier 2: Storage Zone Segmented Control (Scrollable no-scrollbar, optional)
 * Tier 3: Contextual Filter / Action Ribbon
 */
export const CellarHeaderShell: React.FC<CellarHeaderShellProps> = ({
  searchInput,
  storageTabs,
  filterRibbon,
  legendDrawer,
  className = '',
}) => {
  return (
    <div className={`w-full flex flex-col gap-2 sm:gap-3 p-2.5 sm:p-4 bg-white rounded-2xl border border-slate-100 shadow-sm ${className}`}>
      {/* Tier 1: Search */}
      <div className="w-full">{searchInput}</div>

      {/* Tier 2: Storage Tabs (Enforce single-line horizontal scroll) */}
      {storageTabs && (
        <div className="w-full flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
          {storageTabs}
        </div>
      )}

      {/* Tier 3: Filter Ribbon (CRITICAL: Must NOT flex-wrap) */}
      <div className="w-full">
        {filterRibbon}
      </div>

      {/* Optional Collapsible Slide-Down Legend Drawer */}
      {legendDrawer && <div className="w-full pt-1 border-t border-slate-100">{legendDrawer}</div>}
    </div>
  );
};
