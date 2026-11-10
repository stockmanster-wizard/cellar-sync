import React from 'react';
import { Bottle, WINE_STYLES } from '../../types/cellar';

export interface WineEstateCardProps {
  producer: string;
  cuvee?: string;
  vintage: string | number;
  appellation: string;
  region: string;
  country: string;
  varietal: string;
  style: string;
  abv: string | number;
  worldType: 'old-world' | 'new-world';
  varietalColor: string;
  bottlingNote?: string;
  size?: 'sm' | 'lg';
  className?: string;
}

const OLD_WORLD_COUNTRIES = [
  'france',
  'italy',
  'spain',
  'germany',
  'portugal',
  'austria',
  'greece',
  'hungary',
  'switzerland',
  'georgia',
  'lebanon',
  'croatia',
  'slovenia',
];

const OLD_WORLD_REGIONS = [
  'bordeaux',
  'burgundy',
  'bourgogne',
  'champagne',
  'rhône',
  'rhone',
  'loire',
  'alsace',
  'languedoc',
  'provence',
  'beaujolais',
  'chablis',
  'sancerre',
  'tuscany',
  'toscana',
  'piedmont',
  'piemonte',
  'veneto',
  'sicily',
  'sicilia',
  'barolo',
  'barbaresco',
  'chianti',
  'montalcino',
  'rioja',
  'ribera del duero',
  'priorat',
  'jerez',
  'mosel',
  'rheingau',
  'pfalz',
  'douro',
  'dão',
  'alentejo',
  'wachau',
  'tokaj',
];

export function isOldWorldWine(country?: string, region?: string): boolean {
  const c = (country || '').toLowerCase();
  const r = (region || '').toLowerCase();
  if (OLD_WORLD_COUNTRIES.some((ow) => c.includes(ow))) return true;
  if (OLD_WORLD_REGIONS.some((ow) => r.includes(ow))) return true;
  return false;
}

export function buildWineEstateCardProps(
  bottle: Pick<
    Bottle,
    | 'producer'
    | 'wineName'
    | 'varietal'
    | 'vintage'
    | 'style'
    | 'country'
    | 'region'
    | 'alcoholPercent'
  >,
  size: 'sm' | 'lg' = 'lg'
): WineEstateCardProps {
  const styleMeta = WINE_STYLES[bottle.style] || WINE_STYLES['Medium-Bodied Red Wine'];
  const oldWorld = isOldWorldWine(bottle.country, bottle.region);
  const cleanProducer = (bottle.producer || '').replace(/\s+\d{4}$/, '').trim() || 'Estate Producer';
  const cleanCuvee = (bottle.wineName || '').replace(/\s+\d{4}$/, '').trim();
  const displayVintage =
    bottle.vintage && String(bottle.vintage).toUpperCase() !== 'NV'
      ? bottle.vintage
      : 'NV';

  const displayRegion = (bottle.region || 'Estate').trim();
  const displayCountry = (bottle.country || (oldWorld ? 'France' : 'USA')).trim();

  const rawAbv = bottle.alcoholPercent ? String(bottle.alcoholPercent).replace(/%/g, '').trim() : '13.5';

  return {
    producer: cleanProducer,
    cuvee: cleanCuvee && cleanCuvee.toLowerCase() !== cleanProducer.toLowerCase() ? cleanCuvee : undefined,
    vintage: displayVintage,
    appellation: displayRegion,
    region: displayRegion,
    country: displayCountry,
    varietal: bottle.varietal || styleMeta.shortLabel,
    style: bottle.style || 'Medium-Bodied Red Wine',
    abv: rawAbv || '13.5',
    worldType: oldWorld ? 'old-world' : 'new-world',
    varietalColor: styleMeta.dotColor || '#7B1E26',
    bottlingNote: oldWorld ? 'MIS EN BOUTEILLE AU DOMAINE' : 'ESTATE BOTTLED',
    size,
  };
}

export const WineEstateCard: React.FC<WineEstateCardProps> = ({
  producer,
  cuvee,
  vintage,
  appellation,
  region,
  country,
  varietal,
  style,
  abv,
  worldType,
  varietalColor,
  bottlingNote,
  size = 'lg',
  className = '',
}) => {
  const isSmall = size === 'sm';
  const cleanAbv = String(abv || '13.5').replace(/%/g, '').trim();
  const territoryName = (appellation || region || 'Estate').trim();
  const countryName = (country || '').trim();
  const displayVintage = vintage && String(vintage).toUpperCase() !== 'NV' ? String(vintage) : 'NV';

  // 1A. SMALL THUMBNAIL MODE — OLD WORLD
  if (worldType === 'old-world' && isSmall) {
    return (
      <div
        className={`relative aspect-[2/3] w-full rounded-2xl overflow-hidden select-none bg-[#FAF6EE] dark:bg-[#1E1C18] border border-[#E5DEC9] dark:border-[#3D372B] p-1.5 flex flex-col justify-between text-center ${className}`}
      >
        <div className="w-full h-full border border-[#E5DEC9] dark:border-[#3D372B] rounded-xl py-1.5 flex flex-col justify-between items-center">
          {/* Region (2-line wrap allowed, noAOC eyebrow) */}
          <div className="w-full">
            <p className="text-[9px] font-semibold tracking-wide text-emerald-800 dark:text-emerald-400 uppercase text-center leading-tight line-clamp-2 px-1">
              {countryName ? `${territoryName} / ${countryName}` : territoryName}
            </p>
          </div>

          {/* Center: Producer, Cuvée & Vintage */}
          <div className="w-full flex flex-col items-center justify-center my-auto">
            <h4 className="font-serif font-bold text-[11px] leading-tight uppercase tracking-wider text-neutral-900 dark:text-white text-center line-clamp-2 mt-1 px-1">
              {producer}
            </h4>
            {cuvee && (
              <p className="font-serif italic text-[10px] text-neutral-600 dark:text-neutral-300 text-center truncate px-1 w-full mt-0.5">
                {cuvee}
              </p>
            )}
            <span className="text-[9px] font-serif text-neutral-500 text-center mt-0.5">
              {displayVintage}
            </span>
          </div>

          {/* Footer: Clean single-line baseline without horizontal rule */}
          <div className="w-full">
            <p className="text-[8px] text-neutral-500 text-center truncate px-1">
              {varietal} · {cleanAbv}%
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 1B. SMALL THUMBNAIL MODE — NEW WORLD
  if (worldType === 'new-world' && isSmall) {
    return (
      <div
        style={{ '--varietal-color': varietalColor } as React.CSSProperties}
        className={`relative aspect-[2/3] w-full rounded-2xl overflow-hidden select-none bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between text-left ${className}`}
      >
        {/* Top Accent Bar + Region / AVA */}
        <div className="w-full">
          <div className="h-1.5 w-full bg-[var(--varietal-color)]" />
          <p className="text-[8px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 line-clamp-1 px-1.5 pt-1">
            {countryName ? `${territoryName} / ${countryName}` : territoryName}
          </p>
        </div>

        {/* Center: Producer & Cuvée */}
        <div className="w-full my-auto">
          <h4 className="font-sans font-black text-[12px] leading-tight tracking-tight uppercase text-neutral-900 dark:text-white line-clamp-2 px-1.5 mt-1">
            {producer}
          </h4>
          {cuvee && (
            <p className="font-serif italic text-[10px] text-neutral-600 dark:text-neutral-300 truncate px-1.5 mt-0.5">
              {cuvee}
            </p>
          )}
        </div>

        {/* Footer: Justified row */}
        <div className="w-full flex items-center justify-between gap-1 px-1.5 pb-1.5">
          <span className="text-[8px] font-semibold text-neutral-700 dark:text-neutral-300 truncate">
            {varietal}
          </span>
          <span className="text-[8px] text-neutral-500 shrink-0">
            {cleanAbv}% ABV
          </span>
        </div>
      </div>
    );
  }

  // 2A. LARGE MODAL / DETAIL CARD — OLD WORLD
  if (worldType === 'old-world') {
    const resolvedStamp = bottlingNote || 'MIS EN BOUTEILLE AU DOMAINE';
    return (
      <div
        className={`relative aspect-[2/3] w-full rounded-2xl overflow-hidden select-none bg-[#FAF6EE] dark:bg-[#1E1C18] border border-[#E5DEC9] dark:border-[#3D372B] p-3 flex flex-col justify-between ${className}`}
      >
        {/* Outer double border frame */}
        <div className="w-full h-full border border-[#E5DEC9] dark:border-[#3D372B] rounded-xl p-5 flex flex-col justify-between items-center text-center">
          {/* Top Banner & Appellation Block */}
          <div className="w-full flex flex-col items-center">
            <span className="text-xs tracking-widest text-neutral-500 uppercase text-center">
              APPELLATION D&apos;ORIGINE CONTRÔLÉE
            </span>
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300 tracking-wide uppercase text-center line-clamp-2 mt-1.5">
              {countryName ? `${territoryName} · ${countryName}` : territoryName}
            </p>
            <div className="w-16 h-px bg-neutral-300 dark:bg-neutral-700 mx-auto my-2" />
          </div>

          {/* Producer & Cuvée Block */}
          <div className="w-full flex flex-col items-center justify-center my-auto px-2">
            <h2 className="font-serif text-2xl font-bold uppercase tracking-wider text-neutral-900 dark:text-white text-center">
              {producer}
            </h2>
            {cuvee && (
              <p className="font-serif italic text-base text-neutral-700 dark:text-neutral-300 text-center mt-1 line-clamp-2">
                {cuvee}
              </p>
            )}
            <p className="text-sm font-serif tracking-widest text-neutral-500 text-center mt-1 uppercase">
              {displayVintage}
            </p>
          </div>

          {/* Varietal Block & Bottom Stamp */}
          <div className="w-full flex flex-col items-center gap-3">
            <div className="w-full pt-3 border-t border-[#E5DEC9] dark:border-[#3D372B] flex items-center justify-center gap-4">
              <span className="font-medium text-sm text-neutral-800 dark:text-neutral-200">
                {varietal}
              </span>
              <span className="text-neutral-300 dark:text-neutral-600">·</span>
              <span className="italic font-serif text-sm text-neutral-600 dark:text-neutral-400">
                {style}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <span className="text-xs font-serif tracking-wider text-neutral-600 dark:text-neutral-400">
                {cleanAbv}% ALC./VOL.
              </span>
              <div className="border border-[#C5B896] rounded-full px-3 py-1 text-[11px] font-serif uppercase tracking-wider text-[#8C6D3B] dark:text-[#C5B896]">
                {resolvedStamp}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2B. LARGE MODAL / DETAIL CARD — NEW WORLD
  const resolvedNewWorldNote = bottlingNote || 'ESTATE BOTTLED';
  return (
    <div
      className={`relative aspect-[2/3] w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm select-none flex flex-col justify-between ${className}`}
    >
      {/* Top Foil Bar: 4px gradient accent bar */}
      <div
        className="h-1 w-full shrink-0"
        style={{
          backgroundImage: `linear-gradient(90deg, ${varietalColor}, ${varietalColor}CC, ${varietalColor})`,
        }}
      />

      <div className="flex-1 w-full p-6 flex flex-col justify-between">
        {/* Header Block */}
        <div className="w-full">
          <p className="text-xs font-bold tracking-wider uppercase text-neutral-800 dark:text-neutral-200 line-clamp-2">
            {countryName ? `${territoryName} · ${countryName}` : territoryName}
          </p>
          <div className="flex items-baseline justify-between gap-2 mt-2">
            <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              ESTATE VINEYARDS
            </span>
            <span className="text-sm font-sans font-bold text-neutral-900 dark:text-white uppercase shrink-0">
              {displayVintage === 'NV' ? 'NV HARVEST' : `${displayVintage} HARVEST`}
            </span>
          </div>
        </div>

        {/* Hairline Divider */}
        <div className="border-b border-neutral-100 dark:border-neutral-800 my-4" />

        {/* Producer & Cuvée Block */}
        <div className="w-full my-auto">
          <h2 className="font-sans text-3xl font-black uppercase tracking-tight text-neutral-900 dark:text-white leading-none">
            {producer}
          </h2>
          {cuvee && (
            <p className="font-serif italic text-lg text-neutral-700 dark:text-neutral-300 mt-2 line-clamp-2">
              {cuvee}
            </p>
          )}
        </div>

        {/* Hairline Divider */}
        <div className="border-b border-neutral-100 dark:border-neutral-800 my-4" />

        {/* Varietal & Style Row + Footer Row */}
        <div className="w-full flex flex-col gap-4">
          <div className="flex items-center w-full">
            <span
              className="w-3 h-3 rounded-full mr-2 shrink-0"
              style={{ backgroundColor: varietalColor }}
            />
            <span className="font-bold text-sm tracking-wide uppercase text-neutral-900 dark:text-white truncate">
              {varietal}
            </span>
            <span className="text-sm text-neutral-500 ml-auto shrink-0 pl-2">
              {style}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
              {cleanAbv}% ABV
            </span>
            <span className="text-xs font-bold tracking-widest text-neutral-800 dark:text-neutral-200 uppercase inline-flex items-center gap-1.5">
              <svg
                className="w-2.5 h-2.5 text-neutral-400 shrink-0"
                viewBox="0 0 12 12"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M6 0L11.5 6L6 12L0.5 6L6 0Z" />
              </svg>
              {resolvedNewWorldNote}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WineEstateCard;
