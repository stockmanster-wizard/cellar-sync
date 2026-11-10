/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  Bottle,
  StorageUnit,
  WineStyle,
  WINE_STYLES,
  getBottleConsumption,
  formatSlotLabel,
  getBottleMaturity,
  getMatchingCellarStock,
  buildBuyMoreSearchUrl,
  normalizeWineStyle,
} from '../types/cellar';
import {
  Wine,
  RotateCcw,
  Sparkles,
  Compass,
  Clock,
  AlertTriangle,
  ExternalLink,
  MapPin,
  Search,
} from 'lucide-react';
import { WineLabelBadge } from './WineLabelBadge';
import { HalfStarRating } from './HalfStarRating';
import { CellarHeaderShell } from './cellar/CellarHeaderShell';
import {
  VarietalBadge,
  DrinkMeStatusBadge,
  FilterTrack,
  FilterDropdownPill,
} from './ui/WineCellarDesignSystem';
import { InsightCardContainer } from './ui/InsightCardContainer';
import { InsightCard } from './ui/InsightCard';

interface HistoryViewProps {
  consumedBottles: Bottle[];
  activeBottles: Bottle[];
  storageUnits?: StorageUnit[];
  onRestoreBottle: (bottleId: string) => void;
  onSelectBottle: (bottle: Bottle) => void;
  onInspectActiveBottle: (bottle: Bottle) => void;
  onOpenAddBottle: () => void;
}

function formatRelativeTimeAgo(isoDate?: string): string {
  if (!isoDate) return 'Recently';
  const time = new Date(isoDate).getTime();
  if (Number.isNaN(time)) return 'Recently';
  const diffDays = Math.max(0, Math.floor((Date.now() - time) / 86400000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths <= 1) return '1 mo ago';
  if (diffMonths < 12) return `${diffMonths} mos ago`;
  const diffYears = (diffDays / 365).toFixed(1).replace(/\.0$/, '');
  return `${diffYears} yrs ago`;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  consumedBottles,
  activeBottles,
  storageUnits,
  onRestoreBottle,
  onSelectBottle,
  onInspectActiveBottle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<'all' | '5' | '4+' | 'unrated'>('all');
  const [onlyDepleted, setOnlyDepleted] = useState(false);

  // Sort by consumption date descending (most recent first)
  const sortedConsumed = useMemo(() => {
    return [...consumedBottles].sort((a, b) => {
      const dateA = getBottleConsumption(a)?.date || a.consumedAt;
      const dateB = getBottleConsumption(b)?.date || b.consumedAt;
      const timeA = dateA ? new Date(dateA).getTime() : 0;
      const timeB = dateB ? new Date(dateB).getTime() : 0;
      return timeB - timeA;
    });
  }, [consumedBottles]);

  // =========================================================================
  // HEADER FILTER OPTIONS (Style, Rating, Depleted in Cellar)
  // =========================================================================

  const consumedStyles = useMemo(() => {
    const styleCountMap = new Map<WineStyle, number>();
    sortedConsumed.forEach((b) => {
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
      };
    });
  }, [sortedConsumed]);

  useEffect(() => {
    if (selectedStyle !== 'all' && !consumedStyles.some((s) => s.style === selectedStyle)) {
      setSelectedStyle('all');
    }
  }, [consumedStyles, selectedStyle]);

  const styleOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All', count: sortedConsumed.length },
      ...consumedStyles.map((s) => ({
        value: s.style,
        label: s.shortLabel || s.label,
        count: s.count,
        dotColor: s.dotColor,
      })),
    ];
  }, [sortedConsumed.length, consumedStyles]);

  const ratingCounts = useMemo(() => {
    let fiveStar = 0;
    let fourPlus = 0;
    let unrated = 0;
    sortedConsumed.forEach((b) => {
      const r = getBottleConsumption(b)?.rating ?? null;
      if (r === null || r <= 0) {
        unrated += 1;
      } else {
        if (r === 5) fiveStar += 1;
        if (r >= 4) fourPlus += 1;
      }
    });
    return { fiveStar, fourPlus, unrated };
  }, [sortedConsumed]);

  const ratingOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All', count: sortedConsumed.length },
      { value: '5', label: '5 Stars', count: ratingCounts.fiveStar },
      { value: '4+', label: '4+ Stars', count: ratingCounts.fourPlus },
      { value: 'unrated', label: 'Unrated', count: ratingCounts.unrated },
    ];
  }, [sortedConsumed.length, ratingCounts]);

  const depletedCount = useMemo(() => {
    return sortedConsumed.filter((b) => getMatchingCellarStock(b, activeBottles).length === 0).length;
  }, [sortedConsumed, activeBottles]);

  const styleCount =
    selectedStyle === 'all'
      ? sortedConsumed.length
      : consumedStyles.find((s) => s.style === selectedStyle)?.count || 0;

  const ratingCount =
    selectedRating === 'all'
      ? sortedConsumed.length
      : selectedRating === '5'
      ? ratingCounts.fiveStar
      : selectedRating === '4+'
      ? ratingCounts.fourPlus
      : ratingCounts.unrated;

  // =========================================================================
  // PALATE INTELLIGENCE ENGINE: THREE DECISION CARDS
  // =========================================================================

  // 1. RECENT PALATE SHIFT (Velocity & Exploration over trailing 30-60 days)
  const palateShiftInsight = useMemo(() => {
    if (sortedConsumed.length === 0) return null;

    const nowMs = Date.now();
    const recent30 = sortedConsumed.filter((b) => {
      const d = getBottleConsumption(b)?.date || b.consumedAt;
      if (!d) return false;
      return (nowMs - new Date(d).getTime()) / 86400000 <= 30;
    });
    const recent60 = sortedConsumed.filter((b) => {
      const d = getBottleConsumption(b)?.date || b.consumedAt;
      if (!d) return false;
      return (nowMs - new Date(d).getTime()) / 86400000 <= 60;
    });

    const cohort =
      recent30.length >= 2
        ? { list: recent30, windowLabel: 'past 30 days' }
        : recent60.length >= 2
        ? { list: recent60, windowLabel: 'past 60 days' }
        : { list: sortedConsumed, windowLabel: 'recent logs' };

    const styleMap = new Map<WineStyle, Bottle[]>();
    cohort.list.forEach((b) => {
      const normStyle = normalizeWineStyle(b.style);
      const arr = styleMap.get(normStyle) || [];
      arr.push(b);
      styleMap.set(normStyle, arr);
    });

    let dominantStyle: WineStyle = normalizeWineStyle(cohort.list[0].style);
    let dominantBottles: Bottle[] = cohort.list;
    let maxCount = 0;

    styleMap.forEach((arr, style) => {
      if (arr.length > maxCount) {
        maxCount = arr.length;
        dominantStyle = style;
        dominantBottles = arr;
      }
    });

    const pct = Math.round((maxCount / cohort.list.length) * 100);
    const regions = Array.from(
      new Set(
        dominantBottles
          .map((b) => b.region.split('/')[0].trim())
          .filter(Boolean)
      )
    ).slice(0, 2);

    const styleMeta = WINE_STYLES[dominantStyle] || WINE_STYLES['Medium-Bodied Red Wine'];

    return {
      style: dominantStyle,
      styleMeta,
      percentage: pct,
      count: maxCount,
      totalInCohort: cohort.list.length,
      windowLabel: cohort.windowLabel,
      regionHighlight: regions.length > 0 ? regions.join(' & ') : dominantBottles[0]?.country || 'Cellar Selection',
    };
  }, [sortedConsumed]);

  // 2. SLIPPED THROUGH THE CRACKS (The Revisit Engine: >= 4.0★ + in-stock in cellar, oldest uncorked first)
  const slippedThroughInsight = useMemo(() => {
    if (sortedConsumed.length === 0) return null;

    const getProducerSiblingStock = (target: Bottle) => {
      const targetProd = target.producer.toLowerCase().trim();
      const targetName = (target.wineName || '').toLowerCase().trim();
      return activeBottles.filter(
        (b) =>
          b.status !== 'consumed' &&
          b.producer.toLowerCase().trim() === targetProd &&
          (b.wineName || '').toLowerCase().trim() !== targetName
      );
    };

    const candidates = sortedConsumed
      .map((b) => {
        const evalData = getBottleConsumption(b);
        const rating = evalData?.rating ?? 0;
        const rawDate = evalData?.date || b.consumedAt;
        const timeMs = rawDate ? new Date(rawDate).getTime() : Date.now();
        const exactStock = getMatchingCellarStock(b, activeBottles);
        const siblingStock = exactStock.length === 0 ? getProducerSiblingStock(b) : [];
        const stock = exactStock.length > 0 ? exactStock : siblingStock;
        return {
          consumedBottle: b,
          rating,
          rawDate,
          timeMs,
          stock,
          isSiblingMatch: exactStock.length === 0 && siblingStock.length > 0,
        };
      })
      .filter((item) => item.rating >= 4.0 && item.stock.length > 0);

    if (candidates.length === 0) {
      // Fallback: any consumed bottle that still has matching or sibling stock in cellar
      const anyWithStock = sortedConsumed
        .map((b) => {
          const exactStock = getMatchingCellarStock(b, activeBottles);
          const siblingStock = exactStock.length === 0 ? getProducerSiblingStock(b) : [];
          const stock = exactStock.length > 0 ? exactStock : siblingStock;
          return {
            consumedBottle: b,
            rating: getBottleConsumption(b)?.rating ?? null,
            rawDate: getBottleConsumption(b)?.date || b.consumedAt,
            timeMs: new Date(getBottleConsumption(b)?.date || b.consumedAt || Date.now()).getTime(),
            stock,
            isSiblingMatch: exactStock.length === 0 && siblingStock.length > 0,
          };
        })
        .filter((item) => item.stock.length > 0);

      if (anyWithStock.length === 0) return null;
      anyWithStock.sort((a, b) => a.timeMs - b.timeMs);
      return anyWithStock[0];
    }

    // Prioritize exact cuvée matches first, then oldest uncorked, then highest rating
    candidates.sort(
      (a, b) =>
        Number(a.isSiblingMatch) - Number(b.isSiblingMatch) ||
        a.timeMs - b.timeMs ||
        (b.rating || 0) - (a.rating || 0)
    );
    return candidates[0];
  }, [sortedConsumed, activeBottles]);

  // 3. DEPLETION / LOW STOCK (1 bottle left in cellar or recently depleted favorite)
  const depletionInsight = useMemo(() => {
    if (sortedConsumed.length === 0) return null;

    const evaluated = sortedConsumed.map((targetBottle) => {
      const evalData = getBottleConsumption(targetBottle);
      const rating = evalData?.rating ?? 0;
      const exactMatches = activeBottles.filter(
        (b) =>
          b.producer.toLowerCase().trim() === targetBottle.producer.toLowerCase().trim() &&
          (b.wineName || '').toLowerCase().trim() === (targetBottle.wineName || '').toLowerCase().trim()
      );
      const siblingMatches = activeBottles.filter(
        (b) =>
          b.producer.toLowerCase().trim() === targetBottle.producer.toLowerCase().trim() &&
          (b.wineName || '').toLowerCase().trim() !== (targetBottle.wineName || '').toLowerCase().trim()
      );
      return {
        consumedBottle: targetBottle,
        rating,
        exactMatches,
        siblingMatches,
      };
    });

    // Prefer a high-rated bottle with exactly 1 bottle of this cuvée left in the cellar (avoiding duplicating Card 2 if possible)
    const oneLeftCandidates = evaluated.filter(
      (item) =>
        item.exactMatches.length === 1 &&
        (!slippedThroughInsight || item.consumedBottle.id !== slippedThroughInsight.consumedBottle.id)
    );

    if (oneLeftCandidates.length > 0) {
      oneLeftCandidates.sort((a, b) => b.rating - a.rating);
      return oneLeftCandidates[0];
    }

    // Otherwise any bottle with 1 of this cuvée left in the cellar
    const anyOneLeft = evaluated.filter((item) => item.exactMatches.length === 1);
    if (anyOneLeft.length > 0) {
      anyOneLeft.sort((a, b) => b.rating - a.rating);
      return anyOneLeft[0];
    }

    // Otherwise highest-rated depleted cuvée (0 exact matches left in cellar)
    const depleted = evaluated.filter((item) => item.exactMatches.length === 0);
    if (depleted.length > 0) {
      depleted.sort((a, b) => b.rating - a.rating);
      return depleted[0];
    }

    return evaluated[0];
  }, [sortedConsumed, activeBottles, slippedThroughInsight]);

  // Filtered archive list driven by CellarHeaderShell controls
  const visibleConsumed = useMemo(() => {
    let result = [...sortedConsumed];

    // Style filter
    if (selectedStyle !== 'all') {
      result = result.filter((b) => normalizeWineStyle(b.style) === selectedStyle);
    }

    // Rating filter
    if (selectedRating !== 'all') {
      result = result.filter((b) => {
        const r = getBottleConsumption(b)?.rating ?? null;
        if (selectedRating === '5') return r === 5;
        if (selectedRating === '4+') return r !== null && r >= 4;
        if (selectedRating === 'unrated') return r === null || r <= 0;
        return true;
      });
    }

    // Depleted in cellar filter
    if (onlyDepleted) {
      result = result.filter((b) => getMatchingCellarStock(b, activeBottles).length === 0);
    }

    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter((b) => {
        const evalData = getBottleConsumption(b);
        const prod = b.producer.toLowerCase();
        const name = (b.wineName || '').toLowerCase();
        const varietalStr = (b.varietal || '').toLowerCase();
        const tNotes = (evalData?.tastingNotes || b.tastingNotes || '').toLowerCase();
        const cNotes = (b.cellarNotes || '').toLowerCase();
        const reg = b.region.toLowerCase();
        const cnt = b.country.toLowerCase();
        const vin = String(b.vintage).toLowerCase();
        return (
          prod.includes(q) ||
          name.includes(q) ||
          varietalStr.includes(q) ||
          tNotes.includes(q) ||
          cNotes.includes(q) ||
          reg.includes(q) ||
          cnt.includes(q) ||
          vin.includes(q)
        );
      });
    }

    return result;
  }, [sortedConsumed, selectedStyle, selectedRating, onlyDepleted, searchQuery, activeBottles]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedStyle !== 'all' ||
    selectedRating !== 'all' ||
    onlyDepleted;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Top Header & Search Shell Parity */}
      <CellarHeaderShell
        searchInput={
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search consumed wines, producers, varietals, tasting notes..."
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
        filterRibbon={
          <FilterTrack>
            <FilterDropdownPill
              label="Style"
              value={selectedStyle}
              count={styleCount}
              options={styleOptions}
              onSelect={(val) => setSelectedStyle(val)}
            />
            <FilterDropdownPill
              label="Rating"
              value={selectedRating}
              count={ratingCount}
              options={ratingOptions}
              onSelect={(val) => setSelectedRating(val as 'all' | '5' | '4+' | 'unrated')}
            />
            <button
              type="button"
              onClick={() => setOnlyDepleted((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium leading-normal border shrink-0 whitespace-nowrap shadow-xs transition-colors cursor-pointer focus:outline-none ${
                onlyDepleted
                  ? 'bg-stone-900 text-white border-stone-900 hover:bg-stone-800'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  onlyDepleted ? 'bg-rose-400' : 'bg-rose-500'
                }`}
              />
              <span>Depleted in Cellar ({depletedCount})</span>
            </button>
          </FilterTrack>
        }
      />

      {/* Compact Insights Shelf (Responsive vertical stack on mobile, 3-column grid on md+) */}
      <InsightCardContainer>
        {/* CARD 1: RECENT PALATE SHIFT */}
        <InsightCard>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-rose-700" />
              <span>Recent Palate Shift</span>
            </span>
            {palateShiftInsight && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: palateShiftInsight.styleMeta.dotColor }}
              />
            )}
          </div>

          {palateShiftInsight ? (
            <div className="mt-2 space-y-1">
              <div className="text-base font-extrabold text-slate-900 tracking-tight truncate">
                {palateShiftInsight.style}
              </div>
              <div className="text-xs font-mono font-semibold text-slate-700 tabular-nums">
                {palateShiftInsight.percentage}% of bottles {palateShiftInsight.windowLabel}{' '}
                <span className="text-slate-400">
                  ({palateShiftInsight.count}/{palateShiftInsight.totalInCohort})
                </span>
              </div>
              <div className="text-xs font-medium text-emerald-800 flex items-center gap-1 pt-0.5 truncate">
                <span className="font-mono font-bold">↑</span>
                <span className="truncate">{palateShiftInsight.regionHighlight}</span>
              </div>
            </div>
          ) : (
            <div className="mt-2 space-y-1">
              <div className="text-sm font-bold text-slate-400">No recent trend yet</div>
              <p className="text-xs text-slate-400">
                Uncork bottles to surface velocity shifts across styles and regions.
              </p>
            </div>
          )}
        </InsightCard>

        {/* CARD 2: SLIPPED THROUGH THE CRACKS (REVISIT ENGINE) */}
        <InsightCard
          footer={
            slippedThroughInsight ? (
              <button
                type="button"
                onClick={() => onInspectActiveBottle(slippedThroughInsight.stock[0])}
                className="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-rose-300" />
                <span>View Cellar Slot</span>
              </button>
            ) : undefined
          }
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-700" />
              <span>Slipped Through the Cracks</span>
            </span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/70">
              Revisit Ready
            </span>
          </div>

          {slippedThroughInsight ? (
            <div className="mt-2 space-y-1">
              <h4 className="text-sm font-bold text-slate-900 leading-snug truncate">
                {slippedThroughInsight.consumedBottle.producer}
                {slippedThroughInsight.consumedBottle.wineName
                  ? ` · ${slippedThroughInsight.consumedBottle.wineName}`
                  : ''}{' '}
                · <span className="font-mono">{slippedThroughInsight.consumedBottle.vintage}</span>
              </h4>
              <div className="text-xs font-mono text-slate-700 flex items-center gap-1.5 tabular-nums">
                {slippedThroughInsight.rating ? (
                  <span className="font-bold text-amber-700">
                    Rated ★ {slippedThroughInsight.rating.toFixed(1)}
                  </span>
                ) : (
                  <span>Previously enjoyed</span>
                )}
                <span aria-hidden="true">·</span>
                <span>Uncorked {formatRelativeTimeAgo(slippedThroughInsight.rawDate)}</span>
              </div>
              <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1 pt-0.5 truncate font-mono">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                <span className="truncate">
                  {slippedThroughInsight.stock.length}{' '}
                  {slippedThroughInsight.isSiblingMatch
                    ? `${slippedThroughInsight.stock[0].wineName || slippedThroughInsight.stock[0].producer} `
                    : ''}
                  {slippedThroughInsight.stock.length === 1 ? 'bottle' : 'bottles'} in{' '}
                  {slippedThroughInsight.stock[0].slotId
                    ? formatSlotLabel(slippedThroughInsight.stock[0].slotId, storageUnits)
                    : 'Staging Shelf'}
                  {slippedThroughInsight.stock[0].vintage !==
                  slippedThroughInsight.consumedBottle.vintage
                    ? ` (${slippedThroughInsight.stock[0].vintage})`
                    : ''}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-2 space-y-1">
              <div className="text-sm font-bold text-slate-400">No unvisited matches in racks</div>
              <p className="text-xs text-slate-400">
                When a 4.0★+ bottle you drank still has stock resting in the cellar, it appears here.
              </p>
            </div>
          )}
        </InsightCard>

        {/* CARD 3: DEPLETION / LOW STOCK */}
        <InsightCard
          footer={
            depletionInsight ? (
              <div className="flex items-center gap-2">
                <a
                  href={buildBuyMoreSearchUrl(depletionInsight.consumedBottle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1.5 px-3 rounded-xl bg-amber-100/80 hover:bg-amber-200/80 text-amber-950 border border-amber-300/80 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Find to Buy More</span>
                  <ExternalLink className="w-3.5 h-3.5 text-amber-800" />
                </a>
                {depletionInsight.exactMatches.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onInspectActiveBottle(depletionInsight.exactMatches[0])}
                    className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                    title="Inspect remaining bottle in cellar"
                  >
                    View Slot
                  </button>
                )}
              </div>
            ) : undefined
          }
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Depletion / Low Stock</span>
            </span>
            {depletionInsight && (
              <>
                {depletionInsight.exactMatches.length === 0 ? (
                  <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-mono font-bold">
                    Depleted
                  </span>
                ) : depletionInsight.exactMatches.length === 1 ? (
                  <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-mono font-bold">
                    1 Left in Cellar
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-mono font-bold">
                    Stocked ({depletionInsight.exactMatches.length})
                  </span>
                )}
              </>
            )}
          </div>

          {depletionInsight ? (
            <div className="mt-2 space-y-1">
              <h4 className="text-sm font-bold text-slate-900 leading-snug truncate">
                {depletionInsight.consumedBottle.producer}
                {depletionInsight.consumedBottle.wineName
                  ? ` · ${depletionInsight.consumedBottle.wineName}`
                  : ''}
              </h4>
              <div>
                {depletionInsight.exactMatches.length === 0 ? (
                  <>
                    <p className="text-xs font-semibold text-rose-900">
                      0 bottles of this cuvée remaining in cellar
                    </p>
                    {depletionInsight.siblingMatches.length > 0 && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        ({depletionInsight.siblingMatches.length} other{' '}
                        {depletionInsight.consumedBottle.producer} bottles in stock)
                      </p>
                    )}
                  </>
                ) : depletionInsight.exactMatches.length === 1 ? (
                  <p className="text-xs font-semibold text-amber-900">
                    Only 1 bottle left in cellar
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-slate-700">
                    {depletionInsight.exactMatches.length} bottles remaining in cellar
                  </p>
                )}
              </div>
              <div className="truncate pt-0.5">
                <span className="text-xs text-slate-500">
                  Most recently uncorked:{' '}
                  <strong className="text-slate-800 font-semibold">
                    {depletionInsight.consumedBottle.vintage}{' '}
                    {depletionInsight.consumedBottle.wineName ||
                      depletionInsight.consumedBottle.producer}
                  </strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-2 space-y-1">
              <div className="text-sm font-bold text-slate-400">Stock levels healthy</div>
              <p className="text-xs text-slate-400">
                Alerts you when a favorite producer drops to its final bottle or runs out.
              </p>
            </div>
          )}
        </InsightCard>
      </InsightCardContainer>

      {/* Consumed Bottle List */}
      {visibleConsumed.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 mx-auto flex items-center justify-center text-rose-800 mb-3">
            <Wine className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {hasActiveFilters ? 'No consumed bottles match your filters' : 'No consumed bottles yet'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'Try clearing your search query or resetting the style, rating, or depletion filters above.'
              : 'When you uncork a bottle, tap its slot on the cellar map and select “Mark as Consumed” to log your tasting evaluation here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleConsumed.map((bottle) => {
            const evaluation = getBottleConsumption(bottle);
            const rawDate = evaluation?.date || bottle.consumedAt;
            const formattedDate = rawDate
              ? new Date(rawDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Recently';

            const personalNotes = evaluation?.tastingNotes?.trim() || bottle.consumption?.tastingNotes?.trim() || '';
            const userRating = evaluation?.rating ?? bottle.consumption?.rating ?? null;
            const maturity = getBottleMaturity(bottle);
            const matchingStock = getMatchingCellarStock(bottle, activeBottles);
            const slotLabel =
              matchingStock.length > 0
                ? matchingStock[0].slotId
                  ? formatSlotLabel(matchingStock[0].slotId, storageUnits)
                  : 'Staging Shelf'
                : '';

            return (
              <div
                key={bottle.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between transition-all"
              >
                {/* Left & Center Column */}
                <div
                  onClick={() => onSelectBottle(bottle)}
                  className="flex gap-3.5 items-start flex-1 min-w-0 cursor-pointer w-full"
                >
                  <WineLabelBadge bottle={bottle} size="sm" />

                  <div className="flex-1 min-w-0">
                    {/* Line 1: Vintage + VarietalBadge + DrinkMeStatusBadge */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-slate-700 tabular-nums">
                        {bottle.vintage === 'NV' ? 'NV' : bottle.vintage}
                      </span>
                      <VarietalBadge
                        varietal={bottle.varietal || 'Blend'}
                        styleKey={bottle.style}
                      />
                      {maturity && (
                        <DrinkMeStatusBadge
                          isDrinkWindow={maturity.status === 'peak'}
                          label={maturity.label}
                          badgeClass={maturity.badgeClass}
                          title={`Evaluated at uncorking year (${maturity.referenceYear})`}
                        />
                      )}
                    </div>

                    {/* Line 2: Producer name & Wine Name / Cuvée */}
                    <div className="flex flex-wrap items-baseline gap-1.5 min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate leading-snug">
                        {bottle.producer}
                      </h4>
                      {bottle.wineName && (
                        <span className="text-xs text-slate-600 font-medium truncate">
                          {bottle.wineName}
                        </span>
                      )}
                    </div>

                    {/* Line 3: Origin & Uncorked Date */}
                    <div className="text-xs text-slate-500 mt-0.5">
                      Uncorked {formattedDate} · {bottle.region}, {bottle.country}
                    </div>

                    {/* Line 4: Personal Tasting Review */}
                    {personalNotes && (
                      <blockquote className="italic text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2 mt-1.5">
                        &ldquo;{personalNotes}&rdquo;
                      </blockquote>
                    )}

                    {/* Line 5: Cellar Stock Bridge */}
                    <div
                      className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {matchingStock.length > 0 ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span>
                              {matchingStock.length} in cellar ({slotLabel})
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => onInspectActiveBottle(matchingStock[0])}
                            className="text-xs font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
                          >
                            View Slot
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                            <span>0 in cellar</span>
                          </span>
                          <a
                            href={buildBuyMoreSearchUrl(bottle)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl px-2.5 py-1 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <span>Find to Buy More</span>
                            <ExternalLink className="w-3 h-3 text-amber-700" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Star Rating & Undo Drink Action */}
                <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2.5 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-2.5 sm:pt-0">
                  {userRating !== null && userRating > 0 ? (
                    <HalfStarRating value={userRating} readOnly size="sm" />
                  ) : (
                    <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded-md bg-slate-100">
                      Unrated
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => onRestoreBottle(bottle.id)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs min-h-[34px] cursor-pointer"
                    title={
                      bottle.previousSlotId
                        ? `Restore to ${formatSlotLabel(bottle.previousSlotId, storageUnits)} if free, else Staging Shelf`
                        : 'Restore bottle back to Staging Shelf'
                    }
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Undo Drink</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
