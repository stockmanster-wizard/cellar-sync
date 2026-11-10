/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StorageUnit, Bottle, isSlotInUnit } from '../../types/cellar';

export interface StorageTabItem {
  id: string; // 'all' | unit.id | 'staging'
  label: string;
  count: number;
  capacity?: number;
}

interface StorageSegmentedTabsProps {
  storageUnits?: StorageUnit[];
  bottles?: Bottle[];
  selectedId: string;
  onSelect: (id: string) => void;
  showCapacity?: boolean; // If true, formats as `Rack A (32/48)`. If false, `Rack A (32)`.
  customItems?: StorageTabItem[];
}

export const StorageSegmentedTabs: React.FC<StorageSegmentedTabsProps> = ({
  storageUnits = [],
  bottles = [],
  selectedId,
  onSelect,
  showCapacity = false,
  customItems,
}) => {
  // If custom items are provided, use them; otherwise dynamically generate from units + bottles
  const items: StorageTabItem[] = React.useMemo(() => {
    if (customItems) return customItems;

    const activeRacks = storageUnits.filter((u) => !u.is_staging);
    const stagingBottles = bottles.filter(
      (b) => (b.status === 'staging' || b.slotId?.startsWith('S-')) && b.status !== 'consumed'
    );
    const activeBottles = bottles.filter(
      (b) => b.status === 'in-cellar' || b.status === 'staging'
    );

    const result: StorageTabItem[] = [
      {
        id: 'all',
        label: `All Storage (${activeBottles.length})`,
        count: activeBottles.length,
      },
    ];

    activeRacks.forEach((rack) => {
      const occupied = activeBottles.filter(
        (b) => isSlotInUnit(b.slotId, rack) && b.status === 'in-cellar'
      ).length;
      const capacity = rack.columns * rack.rows;
      result.push({
        id: rack.id,
        label: showCapacity
          ? `${rack.name} (${occupied}/${capacity})`
          : `${rack.name} (${occupied})`,
        count: occupied,
        capacity,
      });
    });

    result.push({
      id: 'staging',
      label: `Staging Bin (${stagingBottles.length})`,
      count: stagingBottles.length,
    });

    return result;
  }, [customItems, storageUnits, bottles, showCapacity]);

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
      {items.map((tab) => {
        const isActive = selectedId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`flex-shrink-0 whitespace-nowrap px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm cursor-pointer transition-colors ${
              isActive
                ? 'font-semibold bg-slate-900 text-white shadow-xs'
                : 'font-medium bg-slate-100 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
