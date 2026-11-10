import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

export interface RackCapacityHeaderProps {
  rackId: string;
  rackName: string;
  occupiedSlots: number;
  totalSlots: number;
  onManageRacks?: () => void;
}

export const RackCapacityHeader: React.FC<RackCapacityHeaderProps> = ({
  rackId,
  rackName,
  occupiedSlots,
  totalSlots,
  onManageRacks,
}) => {
  const percentage = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Rack Avatar Badge */}
        <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold flex items-center justify-center text-sm shrink-0">
          {rackId}
        </div>

        {/* Two-Row Information Stack */}
        <div className="flex flex-col min-w-0 flex-1 pr-2">
          {/* Row 1: Title (Full Width) */}
          <h2 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white truncate">
            {rackName}
          </h2>

          {/* Row 2: Metrics + Progress Bar aligned together */}
          <div className="flex items-center gap-1.5 sm:gap-2 mt-1 text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
              {occupiedSlots}/{totalSlots}
            </span>
            <span>slots</span>
            <span className="text-neutral-300 dark:text-neutral-600">·</span>
            <span className="tabular-nums font-medium whitespace-nowrap">
              {totalSlots - occupiedSlots} open
            </span>

            {/* Inline mini progress bar on mobile */}
            <div className="flex items-center gap-1.5 ml-auto sm:hidden shrink-0">
              <div className="w-8 sm:w-20 h-1.5 sm:h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden shrink-0">
                <div
                  className="bg-slate-800 dark:bg-slate-200 h-full rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold tabular-nums text-neutral-700 dark:text-neutral-300 shrink-0">
                {percentage}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Action & Tablet Progress */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Tablet/Desktop Progress Cluster */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-20 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="bg-slate-800 dark:bg-slate-200 h-full rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-xs font-semibold tabular-nums text-neutral-700 dark:text-neutral-300 w-8 text-right">
            {percentage}%
          </span>
        </div>

        {/* Manage Racks Button */}
        {onManageRacks && (
          <button
            type="button"
            onClick={onManageRacks}
            aria-label="Manage Racks"
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-neutral-500" />
            <span className="hidden sm:inline">Manage Racks</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default RackCapacityHeader;
