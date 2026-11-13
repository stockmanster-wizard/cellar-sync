/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function generateSommelierTastingNotes(varietal: string, style: string, region: string, wineName: string = ''): string {
  const v = (varietal || '').toLowerCase();
  const s = (style || '').toLowerCase();
  const r = (region || '').toLowerCase();
  const w = (wineName || '').toLowerCase();

  if (v.includes('sangiovese') || r.includes('chianti') || r.includes('brunello') || r.includes('tuscany') || w.includes('chianti')) {
    return 'Bright black cherry, dried violet petals, leather, and refined tobacco leaf with crisp sangiovese acidity and chalky mineral tannins.';
  }
  if (v.includes('nebbiolo') || r.includes('barolo') || r.includes('barbaresco')) {
    return 'Tar, dried roses, red plum, licorice, and truffles with formidable tannins and soaring, elegant acidity.';
  }
  if (v.includes('cabernet sauvignon') || v.includes('bordeaux blend') || r.includes('pauillac') || r.includes('margaux') || r.includes('napa')) {
    return 'Rich blackberry, cassis, graphite, pencil shavings, cedar, and structured, age-worthy tannins with a long, powerful finish.';
  }
  if (v.includes('pinot noir') || r.includes('burgundy') || r.includes('willamette') || r.includes('oregon')) {
    return 'Fresh cranberry, wild strawberry, forest floor, damp cedar, and subtle spice. Silky tannins with vibrant cool-climate energy.';
  }
  if (v.includes('gsm') || v.includes('syrah') || v.includes('grenache') || r.includes('rhône') || r.includes('châteauneuf')) {
    return 'Ripe dark plums, garrigue herbs, lavender, cracked black peppercorn, and licorice over a velvety, structured body.';
  }
  if (v.includes('tempranillo') || r.includes('rioja') || r.includes('ribera')) {
    return 'Ripe dark cherry, dried fig, vanilla, dill, and leather, framed by integrated oak and polished, savory tannins.';
  }
  if (v.includes('chardonnay') || r.includes('meursault') || r.includes('chablis') || r.includes('burgundy')) {
    if (r.includes('chablis')) {
      return 'Crisp green apple, crushed flint, oyster shell, and laser-focused lemon zest with piercing mineral tension.';
    }
    return 'Toasted brioche, hazelnut, Meyer lemon curd, and crushed limestone with rich creaminess balanced by electric tension.';
  }
  if (v.includes('sauvignon blanc') || r.includes('sancerre') || r.includes('pouilly')) {
    return 'Pungent lemongrass, crisp green pear, wet slate, and chalky minerality with vibrant, thirst-quenching acidity.';
  }
  if (v.includes('riesling') || r.includes('mosel') || r.includes('alsace')) {
    return 'Lime blossom, white peach, crushed petroleum slate, and zesty citrus with dynamic interplay of off-dry sweetness and razor-sharp acidity.';
  }
  if (s.includes('sparkling') || s.includes('champagne') || s.includes('cava') || s.includes('prosecco')) {
    return 'Fine persistent bubbles, crisp green apple, toasted almond, white flowers, and chalky brioche with refreshing, uplifting effervescence.';
  }
  if (s.includes('dessert') || s.includes('port') || s.includes('sauternes')) {
    return 'Luxurious dried apricot, honeyed orange peel, candied ginger, and toasted walnuts with unctuous texture and balanced freshness.';
  }

  return `Expressive aromas of ${varietal || 'ripe fruit'} and regional terroir (${region || 'classic origin'}), featuring balanced acidity and a structured, lingering finish.`;
}
