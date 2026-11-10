import { WineStyle } from "./models";

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
    s.includes('sauvignon blanc') ||
    s.includes('fumé blanc') ||
    s.includes('fumé') ||
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

