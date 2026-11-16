// Shared ingredient/unit normalization for the shopping list and pantry matching.
export const normName = (s: string) =>
  s.replace(/\(.*?\)/g, '').split(',')[0].replace(/\s+/g, ' ').trim().toLowerCase()
    .replace(/^(fresh|chopped fresh|chopped)\s+/, '')

export const normUnit = (u: string) =>
  (u || '').trim().toLowerCase().replace(/^cloves$/, 'clove').replace(/^cups$/, 'cup').replace(/^ribs$/, 'rib')
    .replace(/^(pounds?|lbs)$/, 'lb').replace(/^(ounces?)$/, 'oz').replace(/^(cans)$/, 'can')

const TSP: Record<string, number> = { tsp: 1, tbsp: 3, cup: 48 }

// tsp/tbsp/cup collapse to tsp so "2 tbsp" + "1 tsp" can be added and compared.
export function toBase(amount: number, unit: string): { amount: number; unit: string; volume: boolean } {
  const u = normUnit(unit)
  return u in TSP ? { amount: amount * TSP[u], unit: 'tsp', volume: true } : { amount, unit: u, volume: false }
}
