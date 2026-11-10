import { WineStyle } from "./models";

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
