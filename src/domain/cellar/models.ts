/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Wine Folly: The 9 Primary Styles of Wine
 * Reference: https://winefolly.com/deep-dive/everything-you-need-to-know-about-wine-in-9-bottles/
 */
export type WineStyle =
  | 'Sparkling Wine'
  | 'Light-Bodied White Wine'
  | 'Full-Bodied White Wine'
  | 'Aromatic (Sweet) White Wine'
  | 'Rosé Wine'
  | 'Light-Bodied Red Wine'
  | 'Medium-Bodied Red Wine'
  | 'Full-Bodied Red Wine'
  | 'Dessert Wine';

/**
 * Canonical Sommelier Tasting & Flight Progression:
 * 1. Sparkling Wine (Aperitif / Effervescence)
 * 2. Light-Bodied White Wine (Crisp / Dry)
 * 3. Full-Bodied White Wine (Rich / Oaked)
 * 4. Aromatic (Sweet) White Wine (Floral / Off-dry)
 * 5. Rosé Wine (Macerated / Fresh)
 * 6. Light-Bodied Red Wine (Low Tannin / High Acid)
 * 7. Medium-Bodied Red Wine (Food-Friendly / Balanced)
 * 8. Full-Bodied Red Wine (Rich / High Tannin)
 * 9. Dessert Wine (Fortified / Sweet Nectar)
 */
export const SOMMELIER_WINE_STYLE_ORDER: WineStyle[] = [
  'Sparkling Wine',
  'Light-Bodied White Wine',
  'Full-Bodied White Wine',
  'Aromatic (Sweet) White Wine',
  'Rosé Wine',
  'Light-Bodied Red Wine',
  'Medium-Bodied Red Wine',
  'Full-Bodied Red Wine',
  'Dessert Wine',
];

/**
 * Standard Vintage Options: Current year down to 1950, plus Non-Vintage ('NV')
 */
export const CURRENT_VINTAGE_YEAR = 2026;
export const MIN_STANDARD_VINTAGE_YEAR = 1950;
export const STANDARD_VINTAGES: (number | 'NV')[] = [
  'NV',
  ...Array.from(
    { length: CURRENT_VINTAGE_YEAR - MIN_STANDARD_VINTAGE_YEAR + 1 },
    (_, i) => CURRENT_VINTAGE_YEAR - i
  ),
];

export type RackZone = string;

export interface StorageUnit {
  id: string;
  user_id?: string;
  name: string;
  columns: number; // 1-8
  rows: number; // 1-25
  is_staging: boolean;
  sort_order: number;
}

export const DEFAULT_STORAGE_UNITS: StorageUnit[] = [
  {
    id: 'rack-a',
    name: 'Rack A',
    columns: 4,
    rows: 12,
    is_staging: false,
    sort_order: 1,
  },
  {
    id: 'rack-b',
    name: 'Rack B',
    columns: 4,
    rows: 12,
    is_staging: false,
    sort_order: 2,
  },
  {
    id: 'staging-shelf',
    name: 'Staging Shelf',
    columns: 4,
    rows: 3,
    is_staging: true,
    sort_order: 3,
  },
];

export type SlotId = string;

export interface ReferenceProfile {
  source: string; // e.g., "Producer / Importer", "Gemini AI"
  notes: string;  // "Aromas of green apple, crushed granite..."
}

export interface BottleConsumption {
  date: string;          // ISO Date String
  rating: number | null; // 0.5 to 5.0 (half-star increments), or null if skipped
  tastingNotes: string;  // User's personal sensory impressions
}

export interface Bottle {
  id: string;
  user_id?: string;
  producer: string;
  wineName?: string;
  varietal?: string; // e.g. "Pinot Noir", "Malbec", "Barbera", "Cabernet Sauvignon", or "Blend"
  vintage: number | 'NV';
  style: WineStyle;
  country: string;
  region: string;
  alcoholPercent?: number;
  slotId?: SlotId; // Undefined if bottle has been consumed
  previousSlotId?: SlotId; // Remembers vacated slot when consumed for smart Undo restoration
  visualMode?: 'photo' | 'card';
  imageUrl?: string;
  imageStoragePath?: string;
  status: 'in-cellar' | 'staging' | 'consumed';
  addedAt: string; // ISO 8601 string
  updatedAt?: string; // ISO 8601 string
  consumedAt?: string; // ISO 8601 string
  tastingNotes?: string; // Legacy field preserved for backward compatibility
  rating?: number; // Legacy field preserved for backward compatibility (0.5 to 5.0)
  drinkingWindow?: string; // e.g. "2024 - 2030"

  // Reference Metadata (Scraped / AI Extracted / Read-Only in Drawer)
  referenceProfile?: ReferenceProfile;

  // Pre-Consumption User Data (Cellar Tracking)
  cellarNotes?: string; // e.g. "Hold until 2028", "Gift from Jason"

  // Post-Consumption User Evaluation
  consumption?: BottleConsumption;
}

export type WineBottlePayload = Omit<Bottle, 'id' | 'addedAt' | 'status'> & {
  slotId?: SlotId;
  visualMode: 'photo' | 'card';
  imageUrl?: string;
  imageStoragePath?: string;
};

/**
 * Returns the structured ReferenceProfile for a bottle, seamlessly falling back
 * to legacy tastingNotes for stored bottles.
 */

export interface ParsedWineDraft {
  producer: string;
  wineName?: string;
  varietal?: string;
  vintage: string;
  style: WineStyle;
  country: string;
  region: string;
  alcoholPercent?: number;
  tastingNotes?: string;
  drinkingWindow?: string;
  imageUrl?: string;
}

export type BottleDraft = ParsedWineDraft;
