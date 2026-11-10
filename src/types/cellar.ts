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

export interface StyleMeta {
  label: string;
  shortLabel: string;
  sublabel: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  accentBorder: string;
  description: string;
}

/**
 * Wine Folly 9 Styles Color Palette & Metadata
 */
export const WINE_STYLES: Record<WineStyle, StyleMeta> = {
  'Sparkling Wine': {
    label: 'Sparkling Wine',
    shortLabel: 'Sparkling',
    sublabel: 'Champagne, Cava, Franciacorta, Prosecco',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    dotColor: '#ca8a04', // Pale effervescent champagne gold
    accentBorder: 'border-amber-300',
    description: 'High acid, celebratory fizz from crisp brut to rich vintage cuvées.',
  },
  'Light-Bodied White Wine': {
    label: 'Light-Bodied White Wine',
    shortLabel: 'Light White',
    sublabel: 'Sauvignon Blanc, Pinot Grigio, Albariño',
    badgeBg: 'bg-lime-100',
    badgeText: 'text-lime-900',
    dotColor: '#65a30d', // Pale yellow-green / lime straw
    accentBorder: 'border-lime-300',
    description: 'Crisp, thirst-quenching dry whites with bright citrus and mineral focus.',
  },
  'Full-Bodied White Wine': {
    label: 'Full-Bodied White Wine',
    shortLabel: 'Full White',
    sublabel: 'Oaked Chardonnay, Viognier, Meursault',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    dotColor: '#d97706', // Rich buttercup yellow-gold
    accentBorder: 'border-amber-300',
    description: 'Rich, creamy texture often from oak aging with orchard fruit and vanilla.',
  },
  'Aromatic (Sweet) White Wine': {
    label: 'Aromatic (Sweet) White Wine',
    shortLabel: 'Aromatic White',
    sublabel: 'Riesling, Moscato, Gewürztraminer, Torrontés',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-900',
    dotColor: '#f59e0b', // Warm honey / apricot gold
    accentBorder: 'border-orange-300',
    description: 'Explosive floral, peach, and lychee perfumes with balanced sweetness.',
  },
  'Rosé Wine': {
    label: 'Rosé Wine',
    shortLabel: 'Rosé',
    sublabel: 'Provence Rosé, Pinot Noir Rosé, Garnacha Rosado',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-900',
    dotColor: '#e11d48', // Coral blush / salmon pink
    accentBorder: 'border-rose-300',
    description: 'Bright red summer fruit, crisp refreshing acidity, and delicate salmon hues.',
  },
  'Light-Bodied Red Wine': {
    label: 'Light-Bodied Red Wine',
    shortLabel: 'Light Red',
    sublabel: 'Pinot Noir, Gamay / Beaujolais, Schiava',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-900',
    dotColor: '#dc2626', // Translucent ruby / bright cherry
    accentBorder: 'border-red-300',
    description: 'Pale, translucent ruby with delicate tannins, red cherry, and floral finesse.',
  },
  'Medium-Bodied Red Wine': {
    label: 'Medium-Bodied Red Wine',
    shortLabel: 'Medium Red',
    sublabel: 'Sangiovese, Chianti, GSM, Merlot, Zinfandel, Barbera',
    badgeBg: 'bg-rose-950',
    badgeText: 'text-rose-100',
    dotColor: '#881337', // Deep Tuscan garnet / ruby-purple
    accentBorder: 'border-rose-800',
    description: 'Versatile food wines with balanced acidity, red-black fruit, and savory herbs.',
  },
  'Full-Bodied Red Wine': {
    label: 'Full-Bodied Red Wine',
    shortLabel: 'Full Red',
    sublabel: 'Cabernet Sauvignon, Syrah, Nebbiolo / Barolo, Malbec',
    badgeBg: 'bg-purple-950',
    badgeText: 'text-purple-100',
    dotColor: '#3b0764', // Deep opaque inky blackberry / dark plum
    accentBorder: 'border-purple-800',
    description: 'Bold, structured powerhouse with deep color, dark berry fruit, and firm tannins.',
  },
  'Dessert Wine': {
    label: 'Dessert Wine',
    shortLabel: 'Dessert',
    sublabel: 'Port, Sauternes, Sherry, Madeira, Late Harvest',
    badgeBg: 'bg-amber-950',
    badgeText: 'text-amber-100',
    dotColor: '#78350f', // Tawny amber / dark caramel mahogany
    accentBorder: 'border-amber-800',
    description: 'Rich, sweet, and fortified nectars with dried fruit, toffee, and spice.',
  },
};

/**
 * Normalizes any legacy or custom string style into one of Wine Folly's 9 canonical styles
 */
export function normalizeWineStyle(rawStyle?: string): WineStyle {
  if (!rawStyle) return 'Medium-Bodied Red Wine';

  const s = rawStyle.toLowerCase();

  if (s.includes('sparkling') || s.includes('champagne') || s.includes('cava') || s.includes('prosecco')) {
    return 'Sparkling Wine';
  }
  if (
    s.includes('crisp') ||
    s.includes('sauvignon') ||
    s.includes('pinot grigio') ||
    s.includes('albarino') ||
    s.includes('albariño') ||
    s.includes('melon') ||
    s.includes('muscadet') ||
    s.includes('sancerre') ||
    s.includes('pouilly-fumé') ||
    s.includes('pouilly-fume') ||
    s.includes('light-bodied white')
  ) {
    return 'Light-Bodied White Wine';
  }
  if (
    s.includes('chardonnay') ||
    s.includes('meursault') ||
    s.includes('viognier') ||
    s.includes('condrieu') ||
    s.includes('full-bodied white') ||
    s.includes('oaked')
  ) {
    return 'Full-Bodied White Wine';
  }
  if (
    s.includes('aromatic') ||
    s.includes('riesling') ||
    s.includes('sweet white') ||
    s.includes('moscato') ||
    s.includes('gewürz') ||
    s.includes('gewurz') ||
    s.includes('chenin') ||
    s.includes('vouvray') ||
    s.includes('savennières') ||
    s.includes('savennieres')
  ) {
    return 'Aromatic (Sweet) White Wine';
  }
  if (s.includes('rosé') || s.includes('rose') || s.includes('rosado')) {
    return 'Rosé Wine';
  }
  if (s.includes('pinot noir') || s.includes('gamay') || s.includes('beaujolais') || s.includes('light-bodied red')) {
    return 'Light-Bodied Red Wine';
  }
  if (
    s.includes('chianti') ||
    s.includes('sangiovese') ||
    s.includes('gsm') ||
    s.includes('rhone') ||
    s.includes('rhône') ||
    s.includes('merlot') ||
    s.includes('grenache') ||
    s.includes('zinfandel') ||
    s.includes('medium-bodied red')
  ) {
    return 'Medium-Bodied Red Wine';
  }
  if (
    s.includes('cabernet') ||
    s.includes('bordeaux') ||
    s.includes('syrah') ||
    s.includes('shiraz') ||
    s.includes('malbec') ||
    s.includes('barolo') ||
    s.includes('nebbiolo') ||
    s.includes('full-bodied red')
  ) {
    return 'Full-Bodied Red Wine';
  }
  if (s.includes('dessert') || s.includes('port') || s.includes('sauternes') || s.includes('sherry') || s.includes('ice wine')) {
    return 'Dessert Wine';
  }

  // Fallback to closest match or Medium Red
  return 'Medium-Bodied Red Wine';
}

export function getUnitSlotPrefix(unit: StorageUnit): string {
  if (unit.id === 'rack-a' || unit.name.toLowerCase() === 'rack a') return 'A';
  if (unit.id === 'rack-b' || unit.name.toLowerCase() === 'rack b') return 'B';
  if (unit.is_staging) return 'S';
  return unit.id;
}

export function isSlotInUnit(slotId: SlotId | undefined, unit: StorageUnit): boolean {
  if (!slotId) return false;
  if (unit.is_staging) {
    return slotId.startsWith('S-');
  }
  const prefix = getUnitSlotPrefix(unit);
  return slotId.startsWith(`${prefix}-`);
}

export function parseSlotCoordinates(slotId?: SlotId): { unitPrefix: string; row: number; col: number; isStaging: boolean } | null {
  if (!slotId) return null;
  if (slotId.startsWith('S-')) {
    const num = parseInt(slotId.replace('S-', ''), 10) || 1;
    return { unitPrefix: 'S', row: 1, col: num, isStaging: true };
  }
  const parts = slotId.split('-');
  if (parts.length >= 3) {
    const unitPrefix = parts.slice(0, parts.length - 2).join('-');
    const row = parseInt(parts[parts.length - 2].replace('R', ''), 10) || 1;
    const col = parseInt(parts[parts.length - 1].replace('C', ''), 10) || 1;
    return { unitPrefix, row, col, isStaging: false };
  }
  return null;
}

export function getZoneFromSlotId(slotId?: SlotId, units?: StorageUnit[]): string | null {
  if (!slotId) return null;
  if (slotId.startsWith('S-')) return 'Staging Shelf';
  if (slotId.startsWith('A-')) return 'Rack A';
  if (slotId.startsWith('B-')) return 'Rack B';
  if (units) {
    const match = units.find((u) => isSlotInUnit(slotId, u));
    if (match) return match.name;
  }
  const parsed = parseSlotCoordinates(slotId);
  return parsed ? parsed.unitPrefix : null;
}

export function formatSlotLabel(slotId?: SlotId, units?: StorageUnit[]): string {
  if (!slotId) return 'Unassigned';
  if (slotId.startsWith('S-')) {
    const num = parseInt(slotId.replace('S-', ''), 10);
    return `Staging Bin · #${num}`;
  }
  const parsed = parseSlotCoordinates(slotId);
  if (parsed) {
    let unitName = parsed.unitPrefix;
    if (parsed.unitPrefix === 'A') unitName = 'Rack A';
    else if (parsed.unitPrefix === 'B') unitName = 'Rack B';
    else if (units) {
      const match = units.find((u) => u.id === parsed.unitPrefix || getUnitSlotPrefix(u) === parsed.unitPrefix);
      if (match) unitName = match.name;
    }
    return `${unitName} · Row ${parsed.row}, Col ${parsed.col}`;
  }
  return slotId;
}

export function generateUnitSlots(unit: StorageUnit): SlotId[] {
  if (unit.is_staging) {
    return generateAllStagingSlots();
  }
  const prefix = getUnitSlotPrefix(unit);
  const slots: SlotId[] = [];
  for (let r = 1; r <= unit.rows; r++) {
    for (let c = 1; c <= unit.columns; c++) {
      const rowStr = r < 10 ? `0${r}` : `${r}`;
      const colStr = c < 10 ? `0${c}` : `${c}`;
      slots.push(`${prefix}-R${rowStr}-C${colStr}`);
    }
  }
  return slots;
}

export function generateAllRackSlots(prefix: string): SlotId[] {
  const slots: SlotId[] = [];
  for (let r = 1; r <= 12; r++) {
    for (let c = 1; c <= 4; c++) {
      const rowStr = r < 10 ? `0${r}` : `${r}`;
      const colStr = c < 10 ? `0${c}` : `${c}`;
      slots.push(`${prefix}-R${rowStr}-C${colStr}`);
    }
  }
  return slots;
}

export function generateAllStagingSlots(): SlotId[] {
  const slots: SlotId[] = [];
  for (let s = 1; s <= 12; s++) {
    const slotStr = s < 10 ? `0${s}` : `${s}`;
    slots.push(`S-${slotStr}`);
  }
  return slots;
}

export const POPULAR_VARIETALS = [
  'Cabernet Sauvignon',
  'Pinot Noir',
  'Chardonnay',
  'Nebbiolo',
  'Sangiovese',
  'Syrah / Shiraz',
  'Sauvignon Blanc',
  'Tempranillo',
  'Cabernet Franc',
  'GSM Blend',
  'Bordeaux Blend',
  'Corvina Blend',
  'Bordeaux Blanc',
  'Champagne Blend',
  'Red Blend',
  'White Blend',
  'Merlot',
  'Malbec',
  'Barbera',
  'Gamay',
  'Riesling',
  'Grenache / Garnacha',
  'Zinfandel',
  'Pinot Grigio / Gris',
  'Chenin Blanc',
  'Viognier',
  'Glera (Prosecco)',
] as const;

export interface VarietalContext {
  region?: string;
  country?: string;
  wineName?: string;
  producer?: string;
  style?: WineStyle | string;
}

/**
 * Old World Appellation Varietal Resolution Rules
 * Protected European geographical indications map directly to legally mandated grape varieties.
 */
export interface OldWorldAppellationRule {
  appellation: string;
  keywords: string[];
  mandatedVarietal: string;
  defaultStyle: WineStyle;
}

export const OLD_WORLD_APPELLATION_RULES: OldWorldAppellationRule[] = [
  {
    appellation: 'Muscadet / Muscadet Sèvre et Maine',
    keywords: ['muscadet', 'sèvre et maine', 'sevre et maine'],
    mandatedVarietal: 'Melon de Bourgogne',
    defaultStyle: 'Light-Bodied White Wine',
  },
  {
    appellation: 'Chablis',
    keywords: ['chablis'],
    mandatedVarietal: 'Chardonnay',
    defaultStyle: 'Light-Bodied White Wine',
  },
  {
    appellation: 'Sancerre / Pouilly-Fumé',
    keywords: ['sancerre', 'pouilly-fumé', 'pouilly-fume'],
    mandatedVarietal: 'Sauvignon Blanc',
    defaultStyle: 'Light-Bodied White Wine',
  },
  {
    appellation: 'Vouvray / Savennières',
    keywords: ['vouvray', 'savennières', 'savennieres'],
    mandatedVarietal: 'Chenin Blanc',
    defaultStyle: 'Light-Bodied White Wine',
  },
  {
    appellation: 'Condrieu',
    keywords: ['condrieu', 'château-grillet', 'chateau-grillet'],
    mandatedVarietal: 'Viognier',
    defaultStyle: 'Full-Bodied White Wine',
  },
  {
    appellation: 'Beaujolais / Morgon / Fleurie / Moulin-à-Vent',
    keywords: ['beaujolais', 'morgon', 'fleurie', 'moulin-à-vent', 'moulin-a-vent', 'brouilly', 'saint-amour', 'juliénas', 'julienas', 'chénas', 'chenas', 'chiroubles', 'régnié', 'regnie'],
    mandatedVarietal: 'Gamay',
    defaultStyle: 'Light-Bodied Red Wine',
  },
  {
    appellation: 'Chianti / Chianti Classico / Brunello di Montalcino',
    keywords: ['chianti', 'montalcino'],
    mandatedVarietal: 'Sangiovese',
    defaultStyle: 'Medium-Bodied Red Wine',
  },
  {
    appellation: 'Barolo / Barbaresco / Langhe Nebbiolo',
    keywords: ['barolo', 'barbaresco', 'langhe nebbiolo', 'roero', 'gattinara'],
    mandatedVarietal: 'Nebbiolo',
    defaultStyle: 'Full-Bodied Red Wine',
  },
  {
    appellation: 'Rioja',
    keywords: ['rioja'],
    mandatedVarietal: 'Tempranillo',
    defaultStyle: 'Full-Bodied Red Wine',
  },
  {
    appellation: 'Northern Rhône (Hermitage, Côte-Rôtie, Cornas, Saint-Joseph)',
    keywords: ['côte-rôtie', 'cote-rotie', 'hermitage', 'saint-joseph', 'st-joseph', 'cornas', 'crozes-hermitage'],
    mandatedVarietal: 'Syrah',
    defaultStyle: 'Full-Bodied Red Wine',
  },
];

/**
 * Normalizes wine varietals according to strict sommelier appellation rules.
 * 1. Explicit printed grapes take priority (unless a protected appellation forbids it, e.g. Chardonnay in Muscadet).
 * 2. Protected European Old World appellations default strictly to their defining grape variety:
 *    - Muscadet / Muscadet Sèvre et Maine -> Melon de Bourgogne (NEVER defaults to Chardonnay)
 *    - Chablis -> Chardonnay
 *    - Sancerre / Pouilly-Fumé -> Sauvignon Blanc
 *    - Vouvray / Savennières -> Chenin Blanc
 *    - Beaujolais / Morgon / Fleurie / Moulin-à-Vent -> Gamay
 *    - Chianti / Chianti Classico / Brunello di Montalcino -> Sangiovese
 *    - Barolo / Barbaresco / Langhe Nebbiolo -> Nebbiolo
 *    - Rioja -> Tempranillo (or Tempranillo Blend)
 *    - Northern Rhône (Hermitage, Côte-Rôtie, Cornas, Saint-Joseph) -> Syrah
 *    - Condrieu -> Viognier
 * 3. Never outputs the standalone, unqualified word "Blend" (uses "GSM Blend", "Bordeaux Blend", "Corvina Blend", "Red Blend", etc.).
 */
export function normalizeVarietal(val?: string | null, context?: VarietalContext): string {
  const combinedContext = [
    context?.region || '',
    context?.wineName || '',
    context?.producer || '',
    val || '',
  ].join(' ').toLowerCase();

  const isWhiteOrSparkling =
    (context?.style && (context.style.includes('White') || context.style.includes('Sparkling') || context.style.includes('Dessert'))) ||
    combinedContext.includes('blanc') ||
    combinedContext.includes('white') ||
    combinedContext.includes('chablis') ||
    combinedContext.includes('champagne') ||
    combinedContext.includes('sauternes') ||
    combinedContext.includes('muscadet') ||
    combinedContext.includes('sancerre') ||
    combinedContext.includes('vouvray') ||
    combinedContext.includes('condrieu');

  const trimmed = (val || '').trim();
  const lower = trimmed.toLowerCase();

  // 1. Explicit single grape check (take priority if clearly stated, with legal protection guards)
  if (lower.includes('melon de bourgogne') || lower === 'melon' || lower.includes('melon grape')) return 'Melon de Bourgogne';
  if (lower.includes('pinot noir') || lower.includes('spätburgunder')) return 'Pinot Noir';
  if (lower.includes('cabernet sauvignon')) return 'Cabernet Sauvignon';
  if (lower.includes('cabernet franc')) return 'Cabernet Franc';
  if (lower.includes('chardonnay')) {
    // STRICT: Muscadet can only be Melon de Bourgogne under French AOC law. Never allow Chardonnay on Muscadet labels!
    if (combinedContext.includes('muscadet') || combinedContext.includes('sèvre et maine') || combinedContext.includes('sevre et maine')) {
      return 'Melon de Bourgogne';
    }
    return 'Chardonnay';
  }
  if (lower.includes('sauvignon blanc') || lower.includes('fumé blanc') || lower.includes('fume blanc')) return 'Sauvignon Blanc';
  if (lower.includes('nebbiolo') || lower.includes('spanna') || lower.includes('chiavennasca')) return 'Nebbiolo';
  if (lower.includes('sangiovese') || lower.includes('brunello') || lower.includes('prugnolo')) return 'Sangiovese';
  if (lower.includes('syrah') || lower.includes('shiraz')) return 'Syrah / Shiraz';
  if (lower.includes('tempranillo') || lower.includes('tinta de toro') || lower.includes('tinto fino')) return 'Tempranillo';
  if (lower.includes('malbec') || lower.includes('côt') || lower.includes('cot')) return 'Malbec';
  if (lower.includes('barbera')) return 'Barbera';
  if (lower.includes('merlot')) return 'Merlot';
  if (lower.includes('gamay')) return 'Gamay';
  if (lower.includes('riesling')) return 'Riesling';
  if (lower.includes('grenache') || lower.includes('garnacha')) {
    if (lower.includes('syrah') || lower.includes('mourvèdre') || lower.includes('mourvedre') || lower.includes('gsm')) return 'GSM Blend';
    return 'Grenache / Garnacha';
  }
  if (lower.includes('zinfandel') || lower.includes('primitivo')) return 'Zinfandel';
  if (lower.includes('pinot grigio') || lower.includes('pinot gris')) return 'Pinot Grigio / Gris';
  if (lower.includes('chenin blanc')) return 'Chenin Blanc';
  if (lower.includes('viognier')) return 'Viognier';
  if (lower.includes('glera') || lower.includes('prosecco')) return 'Glera (Prosecco)';
  if (lower.includes('corvina') || lower.includes('rondinella')) return 'Corvina Blend';

  // 2. OLD WORLD APPELLATION VARIETAL RESOLUTION (STRICT)
  // Protected European geographical indications map directly to legally mandated dominant grape variety:

  // Muscadet / Muscadet Sèvre et Maine -> Melon de Bourgogne
  if (
    combinedContext.includes('muscadet') ||
    combinedContext.includes('sèvre et maine') ||
    combinedContext.includes('sevre et maine')
  ) {
    return 'Melon de Bourgogne';
  }

  // Chablis -> Chardonnay
  if (combinedContext.includes('chablis')) {
    return 'Chardonnay';
  }

  // Sancerre / Pouilly-Fumé -> Sauvignon Blanc
  if (
    combinedContext.includes('sancerre') ||
    combinedContext.includes('pouilly-fumé') ||
    combinedContext.includes('pouilly-fume')
  ) {
    if (context?.style && (context.style.includes('Red') || context.style.includes('Rosé') || context.style.includes('Rose'))) {
      return 'Pinot Noir';
    }
    return 'Sauvignon Blanc';
  }

  // Vouvray / Savennières -> Chenin Blanc
  if (
    combinedContext.includes('vouvray') ||
    combinedContext.includes('savennières') ||
    combinedContext.includes('savennieres')
  ) {
    return 'Chenin Blanc';
  }

  // Condrieu -> Viognier
  if (
    combinedContext.includes('condrieu') ||
    combinedContext.includes('château-grillet') ||
    combinedContext.includes('chateau-grillet')
  ) {
    return 'Viognier';
  }

  // Beaujolais / Morgon / Fleurie / Moulin-à-Vent -> Gamay
  if (
    combinedContext.includes('beaujolais') ||
    combinedContext.includes('morgon') ||
    combinedContext.includes('fleurie') ||
    combinedContext.includes('moulin-à-vent') ||
    combinedContext.includes('moulin-a-vent') ||
    combinedContext.includes('brouilly') ||
    combinedContext.includes('saint-amour') ||
    combinedContext.includes('juliénas') ||
    combinedContext.includes('julienas') ||
    combinedContext.includes('chénas') ||
    combinedContext.includes('chenas') ||
    combinedContext.includes('chiroubles') ||
    combinedContext.includes('régnié') ||
    combinedContext.includes('regnie')
  ) {
    return 'Gamay';
  }

  // Chianti / Chianti Classico / Brunello di Montalcino -> Sangiovese
  if (
    combinedContext.includes('chianti') ||
    combinedContext.includes('montalcino') ||
    (combinedContext.includes('montepulciano') && combinedContext.includes('nobile'))
  ) {
    return 'Sangiovese';
  }

  // Barolo / Barbaresco / Langhe Nebbiolo -> Nebbiolo
  if (
    combinedContext.includes('barolo') ||
    combinedContext.includes('barbaresco') ||
    combinedContext.includes('langhe nebbiolo') ||
    combinedContext.includes('roero') ||
    combinedContext.includes('gattinara')
  ) {
    return 'Nebbiolo';
  }

  // Rioja -> Tempranillo (or Tempranillo Blend)
  if (combinedContext.includes('rioja')) {
    if (isWhiteOrSparkling) return 'Viura';
    return lower.includes('blend') ? 'Tempranillo Blend' : 'Tempranillo';
  }

  // Northern Rhône (Hermitage, Côte-Rôtie, Cornas, Saint-Joseph) -> Syrah
  if (
    combinedContext.includes('côte-rôtie') ||
    combinedContext.includes('cote-rotie') ||
    combinedContext.includes('hermitage') ||
    combinedContext.includes('saint-joseph') ||
    combinedContext.includes('st-joseph') ||
    combinedContext.includes('cornas') ||
    combinedContext.includes('crozes-hermitage')
  ) {
    if (isWhiteOrSparkling) return 'Marsanne / Roussanne';
    return 'Syrah';
  }

  // Southern Rhône & Châteauneuf-du-Pape -> GSM Blend
  if (
    combinedContext.includes('châteauneuf') ||
    combinedContext.includes('chateauneuf') ||
    combinedContext.includes('gigondas') ||
    combinedContext.includes('vacqueyras') ||
    combinedContext.includes('côtes du rhône') ||
    combinedContext.includes('cotes du rhone') ||
    combinedContext.includes('southern rhône') ||
    combinedContext.includes('southern rhone') ||
    lower.includes('gsm')
  ) {
    return 'GSM Blend';
  }

  // Bordeaux Left/Right bank assemblages -> Bordeaux Blend (or Bordeaux Blanc)
  if (
    combinedContext.includes('bordeaux') ||
    combinedContext.includes('pauillac') ||
    combinedContext.includes('margaux') ||
    combinedContext.includes('saint-julien') ||
    combinedContext.includes('st-julien') ||
    combinedContext.includes('saint-estèphe') ||
    combinedContext.includes('st-estephe') ||
    combinedContext.includes('saint-émilion') ||
    combinedContext.includes('saint-emilion') ||
    combinedContext.includes('pomerol') ||
    combinedContext.includes('médoc') ||
    combinedContext.includes('medoc') ||
    combinedContext.includes('pessac-léognan') ||
    combinedContext.includes('pessac-leognan') ||
    combinedContext.includes('graves')
  ) {
    return isWhiteOrSparkling ? 'Bordeaux Blanc' : 'Bordeaux Blend';
  }

  // Valpolicella, Amarone, Ripasso -> Corvina Blend
  if (
    combinedContext.includes('valpolicella') ||
    combinedContext.includes('amarone') ||
    combinedContext.includes('ripasso')
  ) {
    return 'Corvina Blend';
  }

  // Red Burgundy vs White Burgundy
  if (
    combinedContext.includes('meursault') ||
    combinedContext.includes('montrachet') ||
    combinedContext.includes('puligny') ||
    combinedContext.includes('chassagne') ||
    combinedContext.includes('mâcon') ||
    combinedContext.includes('macon') ||
    combinedContext.includes('pouilly-fuissé')
  ) {
    return 'Chardonnay';
  }
  if (
    combinedContext.includes('burgundy') ||
    combinedContext.includes('bourgogne') ||
    combinedContext.includes('côte de nuits') ||
    combinedContext.includes('cote de nuits') ||
    combinedContext.includes('côte de beaune') ||
    combinedContext.includes('cote de beaune') ||
    combinedContext.includes('gevrey-chambertin') ||
    combinedContext.includes('vosne-romanée') ||
    combinedContext.includes('vosne-romanee') ||
    combinedContext.includes('nuits-saint-georges') ||
    combinedContext.includes('pommard') ||
    combinedContext.includes('volnay')
  ) {
    return isWhiteOrSparkling ? 'Chardonnay' : 'Pinot Noir';
  }

  // Ribera del Duero & Toro -> Tempranillo
  if (combinedContext.includes('ribera del duero') || combinedContext.includes('toro')) {
    return 'Tempranillo';
  }

  // Priorat / Montsant -> Garnacha / Cariñena
  if (combinedContext.includes('priorat') || combinedContext.includes('montsant')) {
    return 'Garnacha / Cariñena';
  }

  // Champagne / Franciacorta -> Champagne Blend
  if (combinedContext.includes('champagne') || combinedContext.includes('franciacorta')) {
    if (combinedContext.includes('blanc de blancs')) return 'Chardonnay';
    if (combinedContext.includes('blanc de noirs')) return 'Pinot Noir';
    return 'Champagne Blend';
  }

  // Sauternes -> Sémillon / Sauvignon Blanc
  if (combinedContext.includes('sauternes') || combinedContext.includes('barsac')) {
    return 'Sémillon / Sauvignon Blanc';
  }

  // 3. Recognized Assemblages & Strict Banning of standalone "Blend"
  if (lower.includes('bordeaux')) return isWhiteOrSparkling ? 'Bordeaux Blanc' : 'Bordeaux Blend';
  if (lower.includes('gsm') || (lower.includes('grenache') && lower.includes('syrah'))) return 'GSM Blend';
  if (lower.includes('corvina')) return 'Corvina Blend';
  if (lower.includes('champagne')) return 'Champagne Blend';
  if (lower.includes('super tuscan')) return 'Super Tuscan Blend';
  if (lower.includes('meritage')) return 'Bordeaux Blend';

  // If the string itself has explicit multiple grapes with slashes or ampersands (e.g. "Sangiovese / Canaiolo")
  if (trimmed && (trimmed.includes('/') || trimmed.includes('&') || trimmed.includes(','))) {
    return trimmed;
  }

  // Never return standalone "Blend"
  if (!trimmed || lower === 'blend' || lower === 'red blend' || lower === 'white blend') {
    return isWhiteOrSparkling ? 'White Blend' : 'Red Blend';
  }

  // Return formatted trimmed value if valid specific name
  return trimmed;
}

/**
 * Drinking Window Maturity Badge Status & Metadata
 */
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

