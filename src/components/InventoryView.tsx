/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Bottle,
  WineStyle,
  WINE_STYLES,
  formatSlotLabel,
  normalizeWineStyle,
  getBottleMaturity,
  DrinkingWindowMaturityStatus,
  StorageUnit,
  isSlotInUnit,
} from '../types/cellar';
import { Search, Wine, Check, Plus, ArrowUpDown, ChevronDown } from 'lucide-react';
import { WineLabelBadge } from './WineLabelBadge';
import { CellarHeaderShell } from './cellar/CellarHeaderShell';
import { StorageSegmentedTabs } from './cellar/StorageSegmentedTabs';
import {
  VarietalBadge,
  FilterTrack,
  FilterDropdownPill,
  DrinkMeStatusBadge,
  PrimaryDrinkButton,
  SlotCoordinatesLabel,
} from './ui/WineCellarDesignSystem';

interface InventoryViewProps {
  bottles: Bottle[];
  storageUnits?: StorageUnit[];
  onSelectBottle: (bottle: Bottle) => void;
  onQuickConsume: (bottle: Bottle) => void;
  onOpenAddBottle: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  bottles,
  storageUnits = [],
  onSelectBottle,
  onQuickConsume,
  onOpenAddBottle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('all');
  const [selectedVarietal, setSelectedVarietal] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedMaturity, setSelectedMaturity] = useState<'all' | DrinkingWindowMaturityStatus>('all');
  const [sortBy, setSortBy] = useState<'slot' | 'vintage-desc' | 'vintage-asc' | 'producer'>('slot');

  const activeBottles = useMemo(() => {
    return bottles.filter((b) => b.status === 'in-cellar' || b.status === 'staging');
  }, [bottles]);

  // Dynamically compute styles that exist in the active cellar inventory (Wine Folly 9 styles)
  const inventoryStyles = useMemo(() => {
    const styleCountMap = new Map<WineStyle, number>();
    activeBottles.forEach((b) => {
      const normalized = normalizeWineStyle(b.style);
      styleCountMap.set(normalized, (styleCountMap.get(normalized) || 0) + 1);
    });

    return Array.from(styleCountMap.entries()).map(([style, count]) => {
      const meta = WINE_STYLES[style] || WINE_STYLES['Medium-Bodied Red Wine'];
      return {
        style,
        count,
        label: meta.label,
        shortLabel: meta.shortLabel,
        dotColor: meta.dotColor,
        sublabel: meta.sublabel,
      };
    });
  }, [activeBottles]);

  // Dynamically compute varietals that exist in the active cellar inventory
  const inventoryVarietals = useMemo(() => {
    const varietalMap = new Map<string, number>();
    activeBottles.forEach((b) => {
      const v = b.varietal || 'Blend';
      varietalMap.set(v, (varietalMap.get(v) || 0) + 1);
    });

    return Array.from(varietalMap.entries())
      .map(([varietal, count]) => ({ varietal, count }))
      .sort((a, b) => b.count - a.count || a.varietal.localeCompare(b.varietal));
  }, [activeBottles]);

  // Compute maturity counts across active cellar bottles
  const maturityCounts = useMemo(() => {
    const counts = { peak: 0, young: 0, 'past-peak': 0 };
    activeBottles.forEach((b) => {
      const mat = getBottleMaturity(b);
      if (mat) {
        counts[mat.status] += 1;
      }
    });
    return counts;
  }, [activeBottles]);

  // Options for the 3 unified FilterDropdownPill components
  const windowOptions = useMemo(() => {
    const opts = [
      { value: 'all', label: 'All', count: activeBottles.length },
      { value: 'peak', label: 'Drink Me!', count: maturityCounts.peak },
      { value: 'young', label: 'Hold / Young', count: maturityCounts.young },
    ];
    if (maturityCounts['past-peak'] > 0) {
      opts.push({ value: 'past-peak', label: 'Past Peak', count: maturityCounts['past-peak'] });
    }
    return opts;
  }, [activeBottles.length, maturityCounts]);

  const wineFollyStyles = useMemo(() => {
    return [
      { value: 'all', label: 'All', count: activeBottles.length },
      ...inventoryStyles.map((s) => ({
        value: s.style,
        label: s.shortLabel || s.label,
        count: s.count,
        dotColor: s.dotColor,
      })),
    ];
  }, [activeBottles.length, inventoryStyles]);

  const uniqueVarietalsInCellar = useMemo(() => {
    return [
      { value: 'all', label: 'All', count: activeBottles.length },
      ...inventoryVarietals.map((iv) => ({
        value: iv.varietal,
        label: iv.varietal,
        count: iv.count,
      })),
    ];
  }, [activeBottles.length, inventoryVarietals]);

  const windowCount = selectedMaturity === 'all' ? activeBottles.length : maturityCounts[selectedMaturity] || 0;
  const styleCount =
    selectedStyle === 'all'
      ? activeBottles.length
      : inventoryStyles.find((s) => s.style === selectedStyle)?.count || 0;
  const varietalCount =
    selectedVarietal === 'all'
      ? activeBottles.length
      : inventoryVarietals.find((v) => v.varietal === selectedVarietal)?.count || 0;

  // If filtered style is removed from inventory, auto reset to 'all'
  useEffect(() => {
    if (selectedStyle !== 'all' && !inventoryStyles.some((s) => s.style === selectedStyle)) {
      setSelectedStyle('all');
    }
  }, [inventoryStyles, selectedStyle]);

  // If filtered varietal is removed from inventory, auto reset to 'all'
  useEffect(() => {
    if (selectedVarietal !== 'all' && !inventoryVarietals.some((v) => v.varietal === selectedVarietal)) {
      setSelectedVarietal('all');
    }
  }, [inventoryVarietals, selectedVarietal]);

  const filteredBottles = useMemo(() => {
    let result = [...activeBottles];

    // Style filter (using normalized Wine Folly style)
    if (selectedStyle !== 'all') {
      result = result.filter((b) => normalizeWineStyle(b.style) === selectedStyle);
    }

    // Varietal filter
    if (selectedVarietal !== 'all') {
      result = result.filter((b) => (b.varietal || 'Blend') === selectedVarietal);
    }

    // Maturity filter
    if (selectedMaturity !== 'all') {
      result = result.filter((b) => getBottleMaturity(b)?.status === selectedMaturity);
    }

    // Zone filter
    if (selectedZone !== 'all') {
      if (selectedZone === 'staging') {
        result = result.filter((b) => b.status === 'staging' || b.slotId?.startsWith('S-'));
      } else if (storageUnits && storageUnits.length > 0) {
        const matchedUnit = storageUnits.find((u) => u.id === selectedZone);
        if (matchedUnit) {
          result = result.filter((b) => isSlotInUnit(b.slotId, matchedUnit));
        } else if (selectedZone === 'A') {
          result = result.filter((b) => b.slotId?.startsWith('A-'));
        } else if (selectedZone === 'B') {
          result = result.filter((b) => b.slotId?.startsWith('B-'));
        }
      } else if (selectedZone === 'A') {
        result = result.filter((b) => b.slotId?.startsWith('A-'));
      } else if (selectedZone === 'B') {
        result = result.filter((b) => b.slotId?.startsWith('B-'));
      }
    }

    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter((b) => {
        const prod = b.producer.toLowerCase();
        const name = (b.wineName || '').toLowerCase();
        const varietalStr = (b.varietal || '').toLowerCase();
        const reg = b.region.toLowerCase();
        const cnt = b.country.toLowerCase();
        const sty = b.style.toLowerCase();
        const vin = String(b.vintage);
        const slot = (b.slotId || '').toLowerCase();
        const cNotes = (b.cellarNotes || '').toLowerCase();
        return (
          prod.includes(q) ||
          name.includes(q) ||
          varietalStr.includes(q) ||
          reg.includes(q) ||
          cnt.includes(q) ||
          sty.includes(q) ||
          vin.includes(q) ||
          slot.includes(q) ||
          cNotes.includes(q)
        );
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'slot') {
        const slotA = a.slotId || 'ZZZ';
        const slotB = b.slotId || 'ZZZ';
        return slotA.localeCompare(slotB);
      }
      if (sortBy === 'vintage-desc') {
        const vA = a.vintage === 'NV' ? 0 : Number(a.vintage);
        const vB = b.vintage === 'NV' ? 0 : Number(b.vintage);
        return vB - vA;
      }
      if (sortBy === 'vintage-asc') {
        const vA = a.vintage === 'NV' ? 9999 : Number(a.vintage);
        const vB = b.vintage === 'NV' ? 9999 : Number(b.vintage);
        return vA - vB;
      }
      if (sortBy === 'producer') {
        return a.producer.localeCompare(b.producer);
      }
      return 0;
    });

    return result;
  }, [activeBottles, selectedStyle, selectedVarietal, selectedMaturity, selectedZone, searchQuery, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedStyle !== 'all' ||
    selectedVarietal !== 'all' ||
    selectedZone !== 'all' ||
    selectedMaturity !== 'all' ||
    sortBy !== 'slot';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStyle('all');
    setSelectedVarietal('all');
    setSelectedZone('all');
    setSelectedMaturity('all');
    setSortBy('slot');
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* 3-Tier Standardized Inventory Header */}
      <CellarHeaderShell
        searchInput={
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wine, producer, varietal, region..."
              className="w-full pl-9 pr-8 py-1.5 sm:py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 placeholder:text-slate-400 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 text-xs font-mono rounded-md cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        }
        storageTabs={
          <StorageSegmentedTabs
            storageUnits={storageUnits}
            bottles={bottles}
            selectedId={selectedZone}
            onSelect={(id) => setSelectedZone(id)}
            showCapacity={false}
          />
        }
        filterRibbon={
          <FilterTrack>
            <FilterDropdownPill
              label="Window"
              value={selectedMaturity}
              count={windowCount}
              options={windowOptions}
              onSelect={(val) => setSelectedMaturity(val as 'all' | DrinkingWindowMaturityStatus)}
            />
            <FilterDropdownPill
              label="Style"
              value={selectedStyle}
              count={styleCount}
              options={wineFollyStyles}
              onSelect={(val) => setSelectedStyle(val)}
            />
            <FilterDropdownPill
              label="Varietal"
              value={selectedVarietal}
              count={varietalCount}
              options={uniqueVarietalsInCellar}
              onSelect={(val) => setSelectedVarietal(val)}
            />
          </FilterTrack>
        }
      />

      {/* Bottles Inventory List */}
      {filteredBottles.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-slate-400 mb-3">
            <Wine className="w-6 h-6 text-rose-300" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No bottles match your filters</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery ||
            selectedStyle !== 'all' ||
            selectedVarietal !== 'all' ||
            selectedZone !== 'all' ||
            selectedMaturity !== 'all'
              ? 'Try clearing the search query or reset the style, varietal, maturity, and zone filters.'
              : 'Your cellar is currently empty. Tap Add Bottle to scan your first wine label!'}
          </p>
          <div className="mt-4">
            <button
              onClick={onOpenAddBottle}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs min-h-[44px]"
            >
              <Plus className="w-4 h-4 text-rose-300" />
              <span>Add Bottle</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="text-xs text-slate-500 px-1 font-mono">
            Showing <span className="font-bold text-slate-800">{filteredBottles.length}</span> bottles
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredBottles.map((bottle) => {
              const maturity = getBottleMaturity(bottle);

              return (
                <div
                  key={bottle.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs p-4 flex gap-3.5 items-center justify-between group transition-all"
                >
                  {/* Left: Thumbnail & Details */}
                  <div
                    onClick={() => onSelectBottle(bottle)}
                    className="flex gap-3 items-center flex-1 min-w-0 cursor-pointer"
                  >
                    <WineLabelBadge bottle={bottle} size="sm" />

                    <div className="flex-1 min-w-0">
                      {/* Standardized Single Flex Header Row: Vintage + VarietalBadge */}
                      <div className="flex items-center gap-2 mb-1 min-w-0">
                        <span className="text-sm font-semibold text-stone-700 shrink-0 tabular-nums">
                          {bottle.vintage === 'NV' ? 'NV' : bottle.vintage}
                        </span>
                        <VarietalBadge
                          varietal={bottle.varietal || 'Blend'}
                          styleKey={bottle.style}
                        />
                      </div>

                      <h4 className="text-sm font-bold text-stone-900 truncate leading-snug">
                        {bottle.producer}
                      </h4>
                      {bottle.wineName && (
                        <p className="text-xs text-stone-600 truncate">{bottle.wineName}</p>
                      )}

                      {/* Top micro-row: Coordinates */}
                      <SlotCoordinatesLabel
                        slotId={bottle.slotId}
                        storageUnits={storageUnits}
                        className="mt-1"
                      />

                      {/* Bottom micro-row: Drinking Window & Status Pill */}
                      {(bottle.drinkingWindow || maturity) && (
                        <div className="flex items-center gap-2 text-xs text-stone-600 mt-0.5">
                          {bottle.drinkingWindow && (
                            <span className="tabular-nums">
                              {bottle.drinkingWindow.replace(/\s*[-–]\s*/, ' – ')}
                            </span>
                          )}
                          {maturity && (
                            <DrinkMeStatusBadge
                              isDrinkWindow={maturity.status === 'peak'}
                              label={maturity.label}
                              badgeClass={maturity.badgeClass}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Quick Action Drink Button */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    <PrimaryDrinkButton
                      variant="compact"
                      onClick={() => onQuickConsume(bottle)}
                      title="Uncork & log consumption"
                      aria-label={`Mark ${bottle.producer} as consumed`}
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Drink</span>
                    </PrimaryDrinkButton>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

