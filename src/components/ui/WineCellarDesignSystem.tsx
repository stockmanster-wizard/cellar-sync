/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import {
  WineStyle,
  WINE_STYLES,
  normalizeWineStyle,
  SlotId,
  StorageUnit,
  parseSlotCoordinates,
  getUnitSlotPrefix,
} from '../../types/cellar';

// ============================================================================
// 1. VARIETAL BADGE
// ============================================================================

export type WineStyleShortKey =
  | 'sparkling'
  | 'light-white'
  | 'full-white'
  | 'aromatic-white'
  | 'rose'
  | 'light-red'
  | 'medium-red'
  | 'full-red'
  | 'dessert';

export interface WineStyleTheme {
  key: WineStyleShortKey;
  canonicalStyle: WineStyle;
  label: string;
  dotColor: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  className: string;
}

const STYLE_KEY_MAP: Record<WineStyleShortKey, Omit<WineStyleTheme, 'dotColor' | 'label'>> = {
  sparkling: {
    key: 'sparkling',
    canonicalStyle: 'Sparkling Wine',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-950',
    borderClass: 'border-amber-300',
    className: 'bg-amber-50 text-amber-950 border-amber-300',
  },
  'light-white': {
    key: 'light-white',
    canonicalStyle: 'Light-Bodied White Wine',
    bgClass: 'bg-lime-50',
    textClass: 'text-lime-950',
    borderClass: 'border-lime-300',
    className: 'bg-lime-50 text-lime-950 border-lime-300',
  },
  'full-white': {
    key: 'full-white',
    canonicalStyle: 'Full-Bodied White Wine',
    bgClass: 'bg-yellow-50',
    textClass: 'text-yellow-950',
    borderClass: 'border-yellow-300',
    className: 'bg-yellow-50 text-yellow-950 border-yellow-300',
  },
  'aromatic-white': {
    key: 'aromatic-white',
    canonicalStyle: 'Aromatic (Sweet) White Wine',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-950',
    borderClass: 'border-emerald-300',
    className: 'bg-emerald-50 text-emerald-950 border-emerald-300',
  },
  rose: {
    key: 'rose',
    canonicalStyle: 'Rosé Wine',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-950',
    borderClass: 'border-rose-300',
    className: 'bg-rose-50 text-rose-950 border-rose-300',
  },
  'light-red': {
    key: 'light-red',
    canonicalStyle: 'Light-Bodied Red Wine',
    bgClass: 'bg-red-50',
    textClass: 'text-red-950',
    borderClass: 'border-red-300',
    className: 'bg-red-50 text-red-950 border-red-300',
  },
  'medium-red': {
    key: 'medium-red',
    canonicalStyle: 'Medium-Bodied Red Wine',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-950',
    borderClass: 'border-rose-300',
    className: 'bg-rose-50 text-rose-950 border-rose-300',
  },
  'full-red': {
    key: 'full-red',
    canonicalStyle: 'Full-Bodied Red Wine',
    bgClass: 'bg-stone-50',
    textClass: 'text-stone-950',
    borderClass: 'border-stone-300',
    className: 'bg-stone-50 text-stone-950 border-stone-300',
  },
  dessert: {
    key: 'dessert',
    canonicalStyle: 'Dessert Wine',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-950',
    borderClass: 'border-purple-300',
    className: 'bg-purple-50 text-purple-950 border-purple-300',
  },
};

const CANONICAL_TO_SHORT_KEY: Record<WineStyle, WineStyleShortKey> = {
  'Sparkling Wine': 'sparkling',
  'Light-Bodied White Wine': 'light-white',
  'Full-Bodied White Wine': 'full-white',
  'Aromatic (Sweet) White Wine': 'aromatic-white',
  'Rosé Wine': 'rose',
  'Light-Bodied Red Wine': 'light-red',
  'Medium-Bodied Red Wine': 'medium-red',
  'Full-Bodied Red Wine': 'full-red',
  'Dessert Wine': 'dessert',
};

export function getWineStyleTheme(styleKey?: WineStyle | WineStyleShortKey | string): WineStyleTheme {
  const raw = (styleKey || '').trim().toLowerCase();
  let shortKey: WineStyleShortKey;

  if (raw in STYLE_KEY_MAP) {
    shortKey = raw as WineStyleShortKey;
  } else {
    const normalized = normalizeWineStyle(styleKey);
    shortKey = CANONICAL_TO_SHORT_KEY[normalized] || 'medium-red';
  }

  const base = STYLE_KEY_MAP[shortKey];
  const styleMeta = WINE_STYLES[base.canonicalStyle] || WINE_STYLES['Medium-Bodied Red Wine'];

  return {
    ...base,
    label: styleMeta.label,
    dotColor: styleMeta.dotColor,
  };
}

export interface VarietalBadgeProps {
  varietal?: string;
  styleKey?: WineStyle | WineStyleShortKey | string;
  className?: string;
  truncate?: boolean;
  size?: 'xs' | 'sm';
}

export const VarietalBadge: React.FC<VarietalBadgeProps> = ({
  varietal,
  styleKey,
  className = '',
  truncate = false,
}) => {
  const theme = getWineStyleTheme(styleKey);
  const displayVarietal = (varietal || '').trim() || theme.label.replace(' Wine', '');

  return (
    <span
      title={`${displayVarietal} (${theme.label})`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium leading-normal whitespace-nowrap ${
        truncate ? 'min-w-0 max-w-full' : 'flex-shrink-0 max-w-none'
      } ${theme.className} ${className}`}
    >
      <span
        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 shadow-2xs"
        style={{ backgroundColor: theme.dotColor }}
        aria-hidden="true"
      />
      <span className={truncate ? 'truncate leading-normal' : 'leading-normal'}>
        {displayVarietal}
      </span>
    </span>
  );
};

// ============================================================================
// 2. FILTER TRACK & FILTER DROPDOWN PILL
// ============================================================================

export interface FilterTrackProps {
  children: React.ReactNode;
  className?: string;
}

export const FilterTrack: React.FC<FilterTrackProps> = ({ children, className = '' }) => {
  return (
    <div
      ref={(el) => {
        if (el && el.scrollLeft !== 0 && !el.dataset.initialized) {
          el.scrollLeft = 0;
          el.dataset.initialized = 'true';
        }
      }}
      className={`-mx-4 px-4 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full py-1 justify-start ${className}`}
    >
      {children}
    </div>
  );
};

export interface FilterDropdownOption {
  value: string;
  label: string;
  count?: number;
  dotColor?: string;
}

export interface FilterDropdownPillProps {
  label: string;
  value: string;
  count?: number;
  isActive?: boolean;
  onClick?: () => void;
  options?: FilterDropdownOption[];
  onSelect?: (value: string) => void;
}

export const FilterDropdownPill: React.FC<FilterDropdownPillProps> = ({
  label,
  value,
  count,
  isActive: isActiveProp,
  onClick,
  options = [],
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = isActiveProp ?? (value !== 'all' && value !== 'All');
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : value === 'all' ? 'All' : value;
  const displayCount = selectedOption?.count ?? count;

  useEffect(() => {
    if (!isOpen || options.length === 0) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const menuWidth = Math.max(rect.width, 220);
      const left = Math.min(rect.left, Math.max(8, viewportWidth - menuWidth - 8));
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        left,
        minWidth: menuWidth,
        maxWidth: Math.min(300, viewportWidth - 16),
        zIndex: 9999,
      });
    };

    updatePosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = (e: Event) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, options.length]);

  const baseClasses =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium leading-normal border shrink-0 whitespace-nowrap shadow-xs transition-colors cursor-pointer focus:outline-none';
  const stateClasses = isActive
    ? 'bg-stone-900 text-white border-stone-900 hover:bg-stone-800'
    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (onClick) onClick();
          if (options.length > 0) {
            setIsOpen((prev) => !prev);
          }
        }}
        className={`${baseClasses} ${stateClasses}`}
      >
        {selectedOption?.dotColor && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: selectedOption.dotColor }}
          />
        )}
        <span>
          {label}: {displayLabel}
          {displayCount !== undefined ? ` (${displayCount})` : ''}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${
            isActive ? 'text-stone-300' : 'text-stone-400'
          } ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen &&
        options.length > 0 &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="bg-white border border-stone-200 rounded-xl shadow-lg py-1 max-h-72 overflow-y-auto"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (onSelect) onSelect(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-xs text-left transition-colors ${
                    isSelected
                      ? 'bg-stone-100 font-semibold text-stone-900'
                      : 'text-stone-700 hover:bg-stone-50 font-medium'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {opt.dotColor ? (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: opt.dotColor }}
                      />
                    ) : null}
                    <span className="truncate">
                      {opt.label}
                      {opt.count !== undefined ? ` (${opt.count})` : ''}
                    </span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-stone-900 shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
};

// ============================================================================
// 3. DRINK ME STATUS BADGE
// ============================================================================

export interface DrinkMeStatusBadgeProps {
  isDrinkWindow: boolean;
  label?: string;
  badgeClass?: string;
  title?: string;
  className?: string;
}

export const DrinkMeStatusBadge: React.FC<DrinkMeStatusBadgeProps> = ({
  isDrinkWindow,
  label,
  badgeClass,
  title,
  className = '',
}) => {
  if (isDrinkWindow) {
    return (
      <span
        title={title}
        className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 ${className}`}
      >
        Drink Me!
      </span>
    );
  }

  if (label) {
    return (
      <span
        title={title}
        className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
          badgeClass || 'bg-slate-100 text-slate-700 border-slate-200'
        } ${className}`}
      >
        {label}
      </span>
    );
  }

  return null;
};

// ============================================================================
// 4. ACTION BUTTONS (PrimaryDrinkButton, SecondaryActionButton)
// ============================================================================

export interface PrimaryDrinkButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'full' | 'compact';
}

export const PrimaryDrinkButton: React.FC<PrimaryDrinkButtonProps> = ({
  variant = 'full',
  className = '',
  children,
  ...props
}) => {
  const variantClasses =
    variant === 'compact'
      ? 'bg-rose-900 text-white hover:bg-rose-950 font-semibold text-xs px-3 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1 min-h-[44px] cursor-pointer'
      : 'w-full py-3.5 bg-rose-900 hover:bg-rose-950 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer';

  return (
    <button type="button" className={`${variantClasses} ${className}`} {...props}>
      {children}
    </button>
  );
};

export interface SecondaryActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const SecondaryActionButton: React.FC<SecondaryActionButtonProps> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <button
      type="button"
      className={`flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// ============================================================================
// 5. SLOT COORDINATES LABEL
// ============================================================================

export interface SlotCoordinatesLabelProps {
  rack?: string | number;
  row?: string | number;
  col?: string | number;
  slotId?: SlotId;
  storageUnits?: StorageUnit[];
  className?: string;
}

export const SlotCoordinatesLabel: React.FC<SlotCoordinatesLabelProps> = ({
  rack,
  row,
  col,
  slotId,
  storageUnits,
  className = '',
}) => {
  let content = 'STAGING';

  if (rack !== undefined && row !== undefined && col !== undefined) {
    const rackClean = String(rack).replace(/^rack\s+/i, '');
    content = `RACK ${rackClean} · ROW ${row}, COL ${col}`;
  } else if (slotId) {
    if (slotId.startsWith('S-')) {
      const num = parseInt(slotId.replace('S-', ''), 10);
      content = `STAGING BIN · #${num}`;
    } else {
      const parsed = parseSlotCoordinates(slotId);
      if (parsed) {
        let rackLabel = parsed.unitPrefix;
        if (storageUnits) {
          const match = storageUnits.find(
            (u) => u.id === parsed.unitPrefix || getUnitSlotPrefix(u) === parsed.unitPrefix
          );
          if (match) {
            rackLabel = match.name.replace(/^rack\s+/i, '');
          }
        }
        content = `RACK ${rackLabel} · ROW ${parsed.row}, COL ${parsed.col}`;
      } else {
        content = slotId;
      }
    }
  }

  return (
    <div className={`text-[11px] font-semibold uppercase tracking-wider text-stone-400 ${className}`}>
      {content}
    </div>
  );
};
