import { WineStyle, Bottle, ReferenceProfile, BottleConsumption, SlotId } from "./models";

export function getBottleReferenceProfile(bottle: Bottle): ReferenceProfile | null {
  if (bottle.referenceProfile && bottle.referenceProfile.notes.trim() !== '') {
    return bottle.referenceProfile;
  }
  if (bottle.status !== 'consumed' && bottle.tastingNotes && bottle.tastingNotes.trim() !== '') {
    return {
      source: 'Producer / AI Reference',
      notes: bottle.tastingNotes.trim(),
    };
  }
  return null;
}

/**
 * Returns the structured BottleConsumption evaluation for a consumed bottle,
 * seamlessly falling back to legacy consumedAt/rating/tastingNotes fields.
 */
export function getBottleConsumption(bottle: Bottle): BottleConsumption | null {
  if (bottle.consumption) {
    return bottle.consumption;
  }
  if (bottle.status === 'consumed') {
    return {
      date: bottle.consumedAt || bottle.addedAt,
      rating: typeof bottle.rating === 'number' && bottle.rating > 0 ? bottle.rating : null,
      tastingNotes: bottle.tastingNotes || '',
    };
  }
  return null;
}


export type DrinkingWindowMaturityStatus = 'young' | 'peak' | 'past-peak';

export interface DrinkingWindowMaturityInfo {
  status: DrinkingWindowMaturityStatus;
  label: 'Young' | 'Drink Me!' | 'Past Peak';
  windowStart: number;
  windowEnd: number;
  referenceYear: number;
  isConsumedEval: boolean;
  badgeClass: string;
}

/**
 * Parses a drinking window string (e.g., "2023 - 2032", "Drink Now - 2027", "2028")
 * and evaluates maturity against a referenceYear.
 */
export function evaluateDrinkingWindow(
  drinkingWindow?: string,
  referenceYear: number = new Date().getFullYear(),
  isConsumedEval: boolean = false
): DrinkingWindowMaturityInfo | null {
  if (!drinkingWindow || !drinkingWindow.trim()) return null;

  const currentYear = new Date().getFullYear();
  const years = drinkingWindow.match(/\b(19\d{2}|20\d{2})\b/g)?.map(Number) || [];
  const hasDrinkNow = /now|ready/i.test(drinkingWindow);

  let windowStart: number;
  let windowEnd: number;

  if (years.length >= 2) {
    windowStart = Math.min(years[0], years[1]);
    windowEnd = Math.max(years[0], years[1]);
  } else if (years.length === 1) {
    if (hasDrinkNow) {
      windowStart = Math.min(referenceYear, currentYear, years[0]);
      windowEnd = years[0];
    } else {
      windowStart = years[0];
      windowEnd = years[0];
    }
  } else if (hasDrinkNow) {
    windowStart = referenceYear;
    windowEnd = referenceYear + 3;
  } else {
    return null;
  }

  if (referenceYear < windowStart) {
    return {
      status: 'young',
      label: 'Young',
      windowStart,
      windowEnd,
      referenceYear,
      isConsumedEval,
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    };
  }

  if (referenceYear >= windowStart && referenceYear <= windowEnd) {
    return {
      status: 'peak',
      label: 'Drink Me!',
      windowStart,
      windowEnd,
      referenceYear,
      isConsumedEval,
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
  }

  return {
    status: 'past-peak',
    label: 'Past Peak',
    windowStart,
    windowEnd,
    referenceYear,
    isConsumedEval,
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
  };
}

/**
 * Evaluates a bottle's maturity badge:
 * - Active stored bottles compare against the current year (e.g., 2026).
 * - Consumed bottles compare against the year they were uncorked.
 */
export function getBottleMaturity(
  bottle: Bottle,
  currentYear: number = new Date().getFullYear()
): DrinkingWindowMaturityInfo | null {
  const isConsumed = bottle.status === 'consumed';
  let refYear = currentYear;

  if (isConsumed) {
    const evalData = getBottleConsumption(bottle);
    const rawDate = evalData?.date || bottle.consumedAt;
    if (rawDate) {
      const parsedYear = new Date(rawDate).getFullYear();
      if (!Number.isNaN(parsedYear) && parsedYear >= 1950 && parsedYear <= 2100) {
        refYear = parsedYear;
      }
    }
  }

  return evaluateDrinkingWindow(bottle.drinkingWindow, refYear, isConsumed);
}

/**
 * Normalizes a string for cross-vintage producer + wineName matching.
 */
function normalizeMatchToken(str?: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Matches a bottle against active cellar stock (in-cellar or staging) by
 * Producer + Wine Name across any vintage (with fallback to Producer + Varietal
 * if neither bottle specifies a wineName).
 */
export function getMatchingCellarStock(target: Bottle, activeBottles: Bottle[]): Bottle[] {
  const targetProd = normalizeMatchToken(target.producer);
  const targetName = normalizeMatchToken(target.wineName);
  const targetVarietal = normalizeMatchToken(target.varietal);

  if (!targetProd) return [];

  return activeBottles
    .filter((b) => {
      if (b.status === 'consumed') return false;
      const candProd = normalizeMatchToken(b.producer);
      if (candProd !== targetProd) return false;

      const candName = normalizeMatchToken(b.wineName);
      if (targetName && candName) {
        return candName === targetName || candName.includes(targetName) || targetName.includes(candName);
      }
      if (!targetName && !candName) {
        return normalizeMatchToken(b.varietal) === targetVarietal;
      }
      return false;
    })
    .sort((a, b) => {
      const vA = a.vintage === 'NV' ? 9999 : Number(a.vintage);
      const vB = b.vintage === 'NV' ? 9999 : Number(b.vintage);
      if (vA !== vB) return vA - vB;
      return (a.slotId || '').localeCompare(b.slotId || '');
    });
}

/**
 * Builds an external purchase search URL for restocking a low-stock or depleted bottle.
 */
export function buildBuyMoreSearchUrl(bottle: Bottle): string {
  const parts = [
    bottle.producer,
    bottle.wineName || bottle.varietal || '',
    bottle.vintage !== 'NV' ? String(bottle.vintage) : '',
    'wine buy',
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  return `https://www.google.com/search?q=${encodeURIComponent(parts.join(' '))}`;
}

