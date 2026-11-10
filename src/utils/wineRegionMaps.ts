/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RegionPinSpec {
  keywords: string[];
  x: number;
  y: number;
  label: string;
}

export interface CountryMapSpec {
  id: string;
  name: string;
  aliases: string[];
  /** SVG path strings in a 100x100 viewBox */
  paths: string[];
  defaultPin: { x: number; y: number };
  regions: RegionPinSpec[];
}

export interface ResolvedWineMap {
  countryId: string;
  countryName: string;
  paths: string[];
  pin: { x: number; y: number };
  isFallbackGlobe?: boolean;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Matches a keyword or alias strictly on word boundaries so short aliases like "it" or "at"
 * never match inside unrelated words like "United States".
 */
export function matchesPhrase(haystack: string, phrase: string): boolean {
  if (!haystack || !phrase) return false;
  const h = haystack.toLowerCase().trim();
  const p = phrase.toLowerCase().trim();
  if (!h || !p) return false;
  if (h === p) return true;
  const pattern = new RegExp(`(^|[^a-z0-9\\u00C0-\\u017F])${escapeRegExp(p)}($|[^a-z0-9\\u00C0-\\u017F])`, 'i');
  return pattern.test(h);
}

/**
 * Dedicated US State Wine Silhouettes (Washington, Oregon, California, New York).
 * Checked first for US wines or when the region explicitly names one of these states/AVAs.
 */
const US_STATE_WINE_ATLAS: CountryMapSpec[] = [
  {
    id: 'us_washington',
    name: 'Washington State, USA',
    aliases: ['washington', 'washington state', 'wa'],
    paths: [
      // Washington State outline: Olympic Peninsula, Puget Sound indentation, 49th parallel, eastern border, and Columbia River southern border
      'M 26 20 L 88 20 L 88 80 L 70 82 L 54 85 L 40 86 L 28 78 L 22 72 L 14 68 L 12 46 L 10 30 L 22 32 L 24 44 L 32 42 L 32 28 Z',
    ],
    defaultPin: { x: 60, y: 64 }, // Columbia Valley default
    regions: [
      {
        keywords: ['columbia gorge', 'white salmon', 'underwood', 'lyle', 'syncline', 'byle'],
        x: 42,
        y: 84,
        label: 'Columbia Gorge',
      },
      {
        keywords: ['walla walla', 'milton-freewater', 'rocks district'],
        x: 78,
        y: 78,
        label: 'Walla Walla Valley',
      },
      {
        keywords: [
          'red mountain',
          'yakima',
          'horse heaven',
          'rattlesnake hills',
          'snipes mountain',
          'wahluke slope',
          'prosser',
          'benton city',
        ],
        x: 58,
        y: 73,
        label: 'Yakima / Red Mountain',
      },
      {
        keywords: ['columbia valley', 'ancient lakes', 'lake chelan', 'chelan', 'royal slope', 'quincy'],
        x: 62,
        y: 56,
        label: 'Columbia Valley',
      },
      {
        keywords: ['puget sound', 'woodinville', 'seattle', 'bainbridge'],
        x: 32,
        y: 38,
        label: 'Puget Sound',
      },
    ],
  },
  {
    id: 'us_oregon',
    name: 'Oregon, USA',
    aliases: ['oregon', 'or'],
    paths: [
      // Oregon State outline: Pacific coast, Columbia River northern border, Snake River canyon eastern border, 42nd parallel southern border
      'M 18 16 L 34 22 L 54 20 L 80 18 L 88 32 L 84 48 L 88 60 L 88 84 L 12 84 L 10 68 L 14 44 Z',
    ],
    defaultPin: { x: 26, y: 34 }, // Willamette Valley default
    regions: [
      {
        keywords: [
          'willamette',
          'dundee',
          'ribbon ridge',
          'chehalem',
          'eola-amity',
          'yamhill',
          'mcminnville',
          'van duzer',
          'tualatin',
        ],
        x: 26,
        y: 34,
        label: 'Willamette Valley',
      },
      {
        keywords: ['hood river', 'the dalles', 'columbia gorge'],
        x: 42,
        y: 20,
        label: 'Columbia Gorge',
      },
      {
        keywords: ['rogue valley', 'umpqua', 'applegate', 'southern oregon', 'ashland'],
        x: 24,
        y: 76,
        label: 'Southern Oregon',
      },
    ],
  },
  {
    id: 'us_california',
    name: 'California, USA',
    aliases: ['california', 'calif', 'ca'],
    paths: [
      // California State outline: North Coast, Lake Tahoe bend, Sierra angle, Southern border, SF Bay & Central/South Coast
      'M 18 10 L 46 10 L 46 34 L 78 68 L 86 82 L 80 90 L 62 90 L 52 80 L 38 74 L 30 60 L 22 44 L 26 40 L 20 38 L 14 24 Z',
    ],
    defaultPin: { x: 24, y: 35 }, // Napa / Sonoma default
    regions: [
      {
        keywords: [
          'napa',
          'sonoma',
          'russian river',
          'carneros',
          'oakville',
          'rutherford',
          'stags leap',
          'calistoga',
          'st. helena',
          'howell mountain',
          'mount veeder',
          'diamond mountain',
          'alexander valley',
          'dry creek',
          'healdsburg',
          'knights valley',
          'mendocino',
          'anderson valley',
          'north coast',
        ],
        x: 24,
        y: 35,
        label: 'Napa / Sonoma',
      },
      {
        keywords: ['santa cruz', 'livermore', 'lodi', 'sierra foothills', 'amador', 'el dorado', 'calaveras'],
        x: 35,
        y: 44,
        label: 'Central / Foothills',
      },
      {
        keywords: [
          'paso robles',
          'central coast',
          'monterey',
          'santa lucia',
          'carmel',
          'chalone',
          'edna valley',
          'arroyo grande',
          'san luis obispo',
          'york mountain',
        ],
        x: 33,
        y: 61,
        label: 'Central Coast / Paso Robles',
      },
      {
        keywords: [
          'santa barbara',
          'sta. rita',
          'santa rita',
          'santa ynez',
          'santa maria',
          'happy canyon',
          'ballard canyon',
          'los olivos',
        ],
        x: 42,
        y: 74,
        label: 'Santa Barbara',
      },
      {
        keywords: ['temecula', 'south coast', 'malibu', 'cucamonga'],
        x: 64,
        y: 85,
        label: 'South Coast',
      },
    ],
  },
  {
    id: 'us_new_york',
    name: 'New York, USA',
    aliases: ['new york', 'ny'],
    paths: [
      // New York State + Long Island outline
      'M 48 16 L 68 16 L 74 34 L 74 68 L 78 78 L 92 82 L 90 87 L 74 84 L 66 72 L 54 66 L 14 66 L 14 52 L 24 44 L 40 42 L 42 28 Z',
    ],
    defaultPin: { x: 42, y: 53 }, // Finger Lakes default
    regions: [
      {
        keywords: ['finger lakes', 'seneca', 'cayuga', 'keuka', 'canandaigua'],
        x: 42,
        y: 53,
        label: 'Finger Lakes',
      },
      {
        keywords: ['long island', 'north fork', 'hamptons', 'peconic'],
        x: 84,
        y: 84,
        label: 'Long Island',
      },
      {
        keywords: ['hudson', 'hudson river'],
        x: 71,
        y: 64,
        label: 'Hudson Valley',
      },
    ],
  },
];

const WINE_COUNTRY_ATLAS: CountryMapSpec[] = [
  {
    id: 'usa',
    name: 'United States',
    aliases: ['usa', 'u.s.a', 'u.s', 'us', 'united states', 'united states of america', 'america'],
    paths: [
      // Contiguous USA silhouette
      'M 12 22 L 42 25 L 66 24 L 78 30 L 92 22 L 90 36 L 84 48 L 86 64 L 82 78 L 76 76 L 68 68 L 56 72 L 48 82 L 38 72 L 22 68 L 12 56 L 9 38 Z',
    ],
    defaultPin: { x: 13, y: 46 },
    regions: [
      { keywords: ['virginia', 'monticello', 'shenandoah'], x: 81, y: 47, label: 'Virginia' },
      { keywords: ['texas', 'hill country', 'high plains'], x: 48, y: 72, label: 'Texas' },
      { keywords: ['michigan', 'leelanau', 'old mission', 'lake michigan'], x: 65, y: 34, label: 'Michigan' },
      { keywords: ['idaho', 'snake river'], x: 22, y: 33, label: 'Idaho' },
      { keywords: ['colorado', 'grand valley'], x: 35, y: 48, label: 'Colorado' },
      { keywords: ['arizona', 'willcox', 'verde valley'], x: 24, y: 62, label: 'Arizona' },
    ],
  },
  {
    id: 'italy',
    name: 'Italy',
    aliases: ['italy', 'italia'],
    paths: [
      // Mainland Italian peninsula + boot
      'M 22 18 L 35 12 L 50 13 L 62 18 L 58 27 L 52 30 L 58 42 L 66 53 L 82 67 L 88 73 L 83 77 L 76 72 L 73 77 L 68 86 L 62 84 L 64 75 L 55 64 L 44 53 L 36 40 L 29 31 L 20 26 Z',
      // Sicily
      'M 49 88 L 62 87 L 60 95 L 48 92 Z',
      // Sardinia
      'M 23 55 L 30 55 L 29 69 L 22 68 Z',
    ],
    defaultPin: { x: 44, y: 42 }, // Tuscany default
    regions: [
      { keywords: ['tuscany', 'toscana', 'montalcino', 'chianti', 'bolgheri', 'montepulciano', 'siena'], x: 44, y: 42, label: 'Tuscany' },
      { keywords: ['piedmont', 'piemonte', 'barolo', 'barbaresco', 'asti', 'alba', 'langhe'], x: 27, y: 24, label: 'Piedmont' },
      { keywords: ['veneto', 'valpolicella', 'amarone', 'prosecco', 'soave', 'verona'], x: 49, y: 22, label: 'Veneto' },
      { keywords: ['sicily', 'sicilia', 'etna', 'marsala'], x: 56, y: 90, label: 'Sicily' },
      { keywords: ['puglia', 'apulia', 'salento', 'primitivo', 'manduria'], x: 78, y: 69, label: 'Puglia' },
      { keywords: ['abruzzo'], x: 57, y: 51, label: 'Abruzzo' },
      { keywords: ['friuli', 'collio', 'grave'], x: 57, y: 18, label: 'Friuli' },
      { keywords: ['trentino', 'alto adige', 'dolomiti'], x: 44, y: 16, label: 'Alto Adige' },
      { keywords: ['lombardy', 'lombardia', 'franciacorta', 'valtellina'], x: 37, y: 21, label: 'Lombardy' },
      { keywords: ['campania', 'taurasi', 'irpinia', 'amalfi'], x: 61, y: 63, label: 'Campania' },
      { keywords: ['umbria', 'orvieto', 'montefalco'], x: 50, y: 46, label: 'Umbria' },
      { keywords: ['marche', 'verdicchio'], x: 54, y: 42, label: 'Marche' },
      { keywords: ['sardinia', 'sardegna'], x: 26, y: 62, label: 'Sardinia' },
    ],
  },
  {
    id: 'france',
    name: 'France',
    aliases: ['france'],
    paths: [
      // Classic hexagonal mainland France
      'M 48 12 L 66 17 L 84 30 L 76 52 L 84 73 L 70 84 L 54 80 L 42 86 L 26 78 L 32 54 L 16 38 L 32 26 Z',
      // Corsica
      'M 86 82 L 90 82 L 89 92 L 85 91 Z',
    ],
    defaultPin: { x: 34, y: 66 }, // Bordeaux default
    regions: [
      { keywords: ['bordeaux', 'médoc', 'medoc', 'pauillac', 'margaux', 'saint-émilion', 'st-emilion', 'pomerol', 'sauternes', 'graves', 'pessac'], x: 34, y: 66, label: 'Bordeaux' },
      { keywords: ['burgundy', 'bourgogne', 'chablis', 'meursault', 'beaune', 'côte d', 'cote d', 'nuits', 'chambertin', 'montrachet', 'puligny', 'vosne'], x: 67, y: 46, label: 'Burgundy' },
      { keywords: ['beaujolais', 'morgon', 'fleurie', 'moulin-à-vent'], x: 66, y: 55, label: 'Beaujolais' },
      { keywords: ['champagne', 'reims', 'épernay', 'epernay'], x: 61, y: 26, label: 'Champagne' },
      { keywords: ['rhône', 'rhone', 'châteauneuf', 'chateauneuf', 'hermitage', 'côte-rôtie', 'cote-rotie', 'gigondas', 'condrieu'], x: 68, y: 69, label: 'Rhône' },
      { keywords: ['provence', 'bandol', 'cassis'], x: 74, y: 79, label: 'Provence' },
      { keywords: ['loire', 'sancerre', 'pouilly-fumé', 'vouvray', 'chinon', 'muscadet', 'anjou', 'saumur'], x: 46, y: 43, label: 'Loire' },
      { keywords: ['alsace', 'colmar', 'strasbourg'], x: 80, y: 33, label: 'Alsace' },
      { keywords: ['languedoc', 'roussillon', 'corbières', 'minervois'], x: 54, y: 80, label: 'Languedoc' },
      { keywords: ['jura', 'arbois', 'savoie'], x: 74, y: 51, label: 'Jura' },
      { keywords: ['cahors', 'gascony', 'madiran'], x: 43, y: 73, label: 'Southwest' },
    ],
  },
  {
    id: 'spain',
    name: 'Spain',
    aliases: ['spain', 'españa', 'espana'],
    paths: [
      'M 18 20 L 52 18 L 88 24 L 84 44 L 70 62 L 58 78 L 36 82 L 26 70 L 28 38 L 16 32 Z',
    ],
    defaultPin: { x: 56, y: 26 },
    regions: [
      { keywords: ['rioja', 'haro', 'logroño'], x: 56, y: 26, label: 'Rioja' },
      { keywords: ['ribera del duero', 'rueda', 'toro', 'castilla y león'], x: 46, y: 36, label: 'Ribera del Duero' },
      { keywords: ['priorat', 'penedès', 'penedes', 'cava', 'catalonia', 'catalunya', 'montsant'], x: 78, y: 33, label: 'Priorat / Catalunya' },
      { keywords: ['rías baixas', 'rias baixas', 'galicia', 'bierzo', 'valdeorras'], x: 23, y: 25, label: 'Galicia' },
      { keywords: ['jerez', 'sherry', 'andalucía', 'andalucia', 'manzanilla'], x: 35, y: 77, label: 'Jerez' },
      { keywords: ['la mancha', 'valdepeñas', 'jumilla'], x: 56, y: 58, label: 'La Mancha' },
    ],
  },
  {
    id: 'portugal',
    name: 'Portugal',
    aliases: ['portugal'],
    paths: [
      'M 38 14 L 64 14 L 68 30 L 60 52 L 64 70 L 58 88 L 36 88 L 34 62 L 40 42 Z',
    ],
    defaultPin: { x: 52, y: 28 },
    regions: [
      { keywords: ['douro', 'porto', 'vila nova'], x: 52, y: 28, label: 'Douro' },
      { keywords: ['vinho verde', 'minho'], x: 46, y: 20, label: 'Vinho Verde' },
      { keywords: ['dão', 'dao', 'bairrada'], x: 48, y: 42, label: 'Dão' },
      { keywords: ['alentejo'], x: 52, y: 68, label: 'Alentejo' },
      { keywords: ['lisboa', 'setúbal', 'colares'], x: 38, y: 60, label: 'Lisboa' },
    ],
  },
  {
    id: 'germany',
    name: 'Germany',
    aliases: ['germany', 'deutschland'],
    paths: [
      'M 36 12 L 58 14 L 74 26 L 78 48 L 66 58 L 72 78 L 62 88 L 34 86 L 24 68 L 22 44 L 30 26 Z',
    ],
    defaultPin: { x: 27, y: 62 },
    regions: [
      { keywords: ['mosel', 'saar', 'ruwer', 'bernkastel', 'piesport'], x: 27, y: 62, label: 'Mosel' },
      { keywords: ['rheingau', 'rudesheim', 'johannisberg'], x: 35, y: 60, label: 'Rheingau' },
      { keywords: ['rheinhessen', 'nahe'], x: 34, y: 65, label: 'Rheinhessen' },
      { keywords: ['pfalz', 'palatinate'], x: 34, y: 72, label: 'Pfalz' },
      { keywords: ['baden', 'kaiserstuhl'], x: 35, y: 81, label: 'Baden' },
      { keywords: ['franken', 'württemberg'], x: 48, y: 66, label: 'Franken' },
    ],
  },
  {
    id: 'new_zealand',
    name: 'New Zealand',
    aliases: ['new zealand', 'nz'],
    paths: [
      'M 56 12 L 66 24 L 74 34 L 62 48 L 52 44 L 54 28 Z',
      'M 48 52 L 58 56 L 44 78 L 30 88 L 24 80 L 38 62 Z',
    ],
    defaultPin: { x: 52, y: 56 },
    regions: [
      { keywords: ['marlborough', 'blenheim', 'cloudy bay', 'wairau', 'awatere'], x: 52, y: 56, label: 'Marlborough' },
      { keywords: ['central otago', 'otago', 'bannockburn', 'gibbston'], x: 32, y: 81, label: 'Central Otago' },
      { keywords: ['hawke', 'gimblett', 'napier'], x: 66, y: 38, label: "Hawke's Bay" },
      { keywords: ['martinborough', 'wairarapa'], x: 58, y: 46, label: 'Martinborough' },
      { keywords: ['waipara', 'canterbury'], x: 46, y: 67, label: 'Waipara' },
    ],
  },
  {
    id: 'australia',
    name: 'Australia',
    aliases: ['australia', 'aus'],
    paths: [
      'M 36 22 L 56 18 L 74 22 L 88 42 L 84 66 L 70 76 L 56 68 L 40 66 L 16 70 L 14 44 L 24 30 Z',
      'M 68 83 L 75 83 L 73 90 L 68 89 Z',
    ],
    defaultPin: { x: 58, y: 66 },
    regions: [
      { keywords: ['barossa', 'eden valley', 'clare valley', 'mclaren vale', 'adelaide', 'coonawarra', 'south australia'], x: 58, y: 66, label: 'South Australia' },
      { keywords: ['yarra', 'mornington', 'victoria', 'heathcote', 'beechworth'], x: 69, y: 73, label: 'Victoria' },
      { keywords: ['margaret river', 'western australia', 'great southern'], x: 17, y: 66, label: 'Margaret River' },
      { keywords: ['hunter valley', 'new south wales', 'mudgee'], x: 82, y: 58, label: 'Hunter Valley' },
      { keywords: ['tasmania', 'tamar'], x: 71, y: 86, label: 'Tasmania' },
    ],
  },
  {
    id: 'argentina',
    name: 'Argentina',
    aliases: ['argentina'],
    paths: [
      'M 38 12 L 58 14 L 68 28 L 62 46 L 56 64 L 48 88 L 38 90 L 36 52 L 34 28 Z',
    ],
    defaultPin: { x: 39, y: 46 },
    regions: [
      { keywords: ['mendoza', 'uco', 'luján', 'lujan', 'maipú', 'maipu', 'gualtallary'], x: 39, y: 46, label: 'Mendoza' },
      { keywords: ['salta', 'cafayate', 'calchaquí'], x: 43, y: 19, label: 'Salta' },
      { keywords: ['san juan'], x: 39, y: 38, label: 'San Juan' },
      { keywords: ['patagonia', 'río negro', 'rio negro', 'neuquén'], x: 43, y: 66, label: 'Patagonia' },
    ],
  },
  {
    id: 'chile',
    name: 'Chile',
    aliases: ['chile'],
    paths: [
      'M 48 10 L 56 12 L 54 38 L 52 64 L 48 90 L 40 88 L 42 60 L 45 34 Z',
    ],
    defaultPin: { x: 48, y: 46 },
    regions: [
      { keywords: ['maipo', 'puente alto', 'pirque'], x: 48, y: 46, label: 'Maipo Valley' },
      { keywords: ['colchagua', 'rapel', 'cachapoal', 'apalta', 'curicó'], x: 47, y: 52, label: 'Colchagua' },
      { keywords: ['casablanca', 'san antonio', 'leyda', 'aconcagua'], x: 47, y: 41, label: 'Casablanca' },
      { keywords: ['maule', 'itata', 'bío-bío', 'bio-bio'], x: 46, y: 60, label: 'Maule' },
    ],
  },
  {
    id: 'south_africa',
    name: 'South Africa',
    aliases: ['south africa', 'rsa'],
    paths: [
      'M 22 44 L 46 28 L 78 24 L 86 44 L 74 68 L 52 80 L 24 82 L 18 64 Z',
    ],
    defaultPin: { x: 27, y: 78 },
    regions: [
      { keywords: ['stellenbosch', 'franschhoek', 'paarl', 'constantia', 'western cape'], x: 27, y: 78, label: 'Stellenbosch' },
      { keywords: ['swartland', 'darling'], x: 24, y: 71, label: 'Swartland' },
      { keywords: ['walker bay', 'hemel-en-aarde', 'elgin'], x: 33, y: 80, label: 'Walker Bay' },
    ],
  },
  {
    id: 'austria',
    name: 'Austria',
    aliases: ['austria', 'österreich', 'osterreich'],
    paths: [
      'M 14 56 L 36 52 L 54 34 L 84 32 L 88 52 L 74 68 L 46 66 L 16 64 Z',
    ],
    defaultPin: { x: 72, y: 39 },
    regions: [
      { keywords: ['wachau', 'kamptal', 'kremstal', 'niederösterreich', 'wagram'], x: 72, y: 39, label: 'Wachau' },
      { keywords: ['burgenland', 'neusiedlersee', 'leithaberg'], x: 84, y: 52, label: 'Burgenland' },
      { keywords: ['steiermark', 'styria'], x: 68, y: 62, label: 'Steiermark' },
    ],
  },
  {
    id: 'greece',
    name: 'Greece',
    aliases: ['greece', 'hellas'],
    paths: [
      'M 28 18 L 68 16 L 62 32 L 48 48 L 58 62 L 44 76 L 30 66 L 26 42 Z',
      'M 46 86 L 76 86 L 75 91 L 46 91 Z',
    ],
    defaultPin: { x: 45, y: 62 },
    regions: [
      { keywords: ['santorini', 'cyclades'], x: 64, y: 75, label: 'Santorini' },
      { keywords: ['naoussa', 'macedonia', 'amyndeon'], x: 42, y: 24, label: 'Naoussa' },
      { keywords: ['nemea', 'peloponnese'], x: 43, y: 64, label: 'Nemea' },
      { keywords: ['crete'], x: 60, y: 88, label: 'Crete' },
    ],
  },
];

function isUSCountry(countryNorm: string): boolean {
  if (!countryNorm) return false;
  const usaSpec = WINE_COUNTRY_ATLAS.find((c) => c.id === 'usa');
  return Boolean(usaSpec && usaSpec.aliases.some((alias) => matchesPhrase(countryNorm, alias)));
}

/**
 * Resolves the country or US state silhouette paths and region pin coordinates from a bottle's
 * country and region strings using strict word-boundary matching.
 */
export function resolveWineMap(country?: string, region?: string): ResolvedWineMap {
  const cNorm = (country || '').trim().toLowerCase();
  const rNorm = (region || '').trim().toLowerCase();
  const combined = `${rNorm} ${cNorm}`.trim();

  // 1. Check US State Wine Atlas first if country is USA/empty or if region/country names a US state (WA, OR, CA, NY)
  if (!cNorm || isUSCountry(cNorm) || US_STATE_WINE_ATLAS.some((s) => s.aliases.some((a) => matchesPhrase(cNorm, a)))) {
    // First look for an explicit state alias match (e.g. "Washington", "Oregon", "California", "New York")
    let matchedState = US_STATE_WINE_ATLAS.find((stateSpec) =>
      stateSpec.aliases.some((alias) => matchesPhrase(rNorm, alias) || matchesPhrase(cNorm, alias))
    );

    // Or match by specific AVA / sub-region keyword (e.g. "Napa Valley", "Willamette Valley", "Walla Walla")
    if (!matchedState && combined) {
      matchedState = US_STATE_WINE_ATLAS.find((stateSpec) =>
        stateSpec.regions.some((reg) => reg.keywords.some((kw) => matchesPhrase(combined, kw)))
      );
    }

    if (matchedState) {
      const matchedRegion = matchedState.regions.find((reg) =>
        reg.keywords.some((kw) => matchesPhrase(combined, kw))
      );
      return {
        countryId: matchedState.id,
        countryName: matchedState.name,
        paths: matchedState.paths,
        pin: matchedRegion ? { x: matchedRegion.x, y: matchedRegion.y } : matchedState.defaultPin,
      };
    }
  }

  // 2. Strict whole-word match on Country Atlas
  let matchedCountry = WINE_COUNTRY_ATLAS.find((spec) =>
    spec.aliases.some((alias) => matchesPhrase(cNorm, alias))
  );

  // 3. If country wasn't matched directly, infer from region keywords using word-boundary matching
  if (!matchedCountry && combined) {
    matchedCountry = WINE_COUNTRY_ATLAS.find((spec) =>
      spec.regions.some((reg) => reg.keywords.some((kw) => matchesPhrase(combined, kw)))
    );
  }

  if (matchedCountry) {
    const matchedRegion = matchedCountry.regions.find((reg) =>
      reg.keywords.some((kw) => matchesPhrase(combined, kw))
    );
    return {
      countryId: matchedCountry.id,
      countryName: matchedCountry.name,
      paths: matchedCountry.paths,
      pin: matchedRegion ? { x: matchedRegion.x, y: matchedRegion.y } : matchedCountry.defaultPin,
    };
  }

  // 4. Graceful Terroir Meridian fallback when country is unknown
  return {
    countryId: 'terroir_globe',
    countryName: country || 'Estate',
    paths: [
      'M 50 14 A 36 36 0 1 0 50 86 A 36 36 0 1 0 50 14 Z',
      'M 16 50 L 84 50',
      'M 50 14 C 36 32 36 68 50 86 C 64 68 64 32 50 14 Z',
    ],
    pin: { x: 54, y: 42 },
    isFallbackGlobe: true,
  };
}

/**
 * Formats the Top Appellation Crown ("REGION · COUNTRY") cleanly without redundancy.
 * When compact=true (for the medium header card), keeps the primary sub-region + country concise.
 */
export function formatAppellationCrown(
  region?: string,
  country?: string,
  compact: boolean = false
): string {
  const rawRegion = (region || '').trim();
  const rawCountry = (country || '').trim();

  if (!rawRegion && !rawCountry) {
    return 'ESTATE CELLAR';
  }

  const cleanRegion = compact && rawRegion.includes(',')
    ? rawRegion.split(',')[0].trim()
    : rawRegion;

  if (cleanRegion && rawCountry) {
    if (cleanRegion.toLowerCase().includes(rawCountry.toLowerCase())) {
      return cleanRegion.toUpperCase();
    }
    return `${cleanRegion} · ${rawCountry}`.toUpperCase();
  }

  return (cleanRegion || rawCountry).toUpperCase();
}
