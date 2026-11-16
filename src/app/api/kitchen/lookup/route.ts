import { guard } from '@/lib/auth'
import { NextResponse } from 'next/server'

// Product lookup for the Pantry form.
//   ?barcode=0123456789012  -> Open Food Facts product by barcode
//   ?q=text                 -> Open Food Facts (branded products) + USDA FoodData Central (generic/branded)
// Nothing is saved here; the client pre-fills the form and the user confirms.

export interface Candidate {
  source: 'off' | 'usda'
  name: string
  brand: string | null
  barcode: string | null
  serving_label: string | null
  basis: 'serving' | '100g'
  kcal: number | null; protein: number | null; carbs: number | null; fat: number | null
}

const UA = { 'User-Agent': 'BLKSTAR-Command-Center/1.0 (personal kitchen app)' }
const r1 = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 10) / 10 : null)
const num = (v: unknown) => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null)

type OffProduct = {
  code?: string; product_name?: string; brands?: string; serving_size?: string
  nutriments?: Record<string, number>
}
function fromOff(p: OffProduct): Candidate | null {
  if (!p.product_name) return null
  const n = p.nutriments ?? {}
  const perServing = n['energy-kcal_serving'] != null
  const k = perServing ? '_serving' : '_100g'
  return {
    source: 'off',
    name: p.product_name.trim(),
    brand: p.brands?.split(',')[0]?.trim() || null,
    barcode: p.code ?? null,
    serving_label: perServing ? (p.serving_size || '1 serving') : '100 g',
    basis: perServing ? 'serving' : '100g',
    kcal: r1(n['energy-kcal' + k]), protein: r1(n['proteins' + k]), carbs: r1(n['carbohydrates' + k]), fat: r1(n['fat' + k]),
  }
}

const OFF_FIELDS = 'code,product_name,brands,serving_size,nutriments'

async function offBarcode(code: string): Promise<Candidate[]> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`, { headers: UA, signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`Open Food Facts ${res.status}`)
  const j = await res.json()
  const c = j.status === 1 && j.product ? fromOff({ ...j.product, code }) : null
  return c ? [c] : []
}

async function offSearch(q: string): Promise<Candidate[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=8&fields=${OFF_FIELDS}`
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`Open Food Facts ${res.status}`)
  const j = await res.json()
  return ((j.products ?? []) as OffProduct[]).map(fromOff).filter((c): c is Candidate => !!c && c.kcal != null)
}

type UsdaFood = {
  description?: string; brandName?: string; brandOwner?: string; gtinUpc?: string
  servingSize?: number; servingSizeUnit?: string; householdServingFullText?: string
  foodNutrients?: { nutrientNumber?: string; nutrientId?: number; value?: number }[]
}
async function usdaSearch(q: string): Promise<Candidate[]> {
  const key = process.env.USDA_API_KEY || 'DEMO_KEY'
  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&pageSize=8&api_key=${key}`, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`USDA ${res.status}${res.status === 429 ? ' (rate limit — add USDA_API_KEY to .env.local)' : ''}`)
  const j = await res.json()
  return ((j.foods ?? []) as UsdaFood[]).map((f): Candidate | null => {
    if (!f.description) return null
    const val = (nums: string[]) => f.foodNutrients?.find((x) => nums.includes(String(x.nutrientNumber)))?.value
    const kcal = val(['208']), protein = val(['203']), carbs = val(['205']), fat = val(['204'])
    if (kcal == null) return null
    // USDA search values are per 100 g (or per 100 ml). Scale to the labeled serving when it is given in grams.
    const grams = f.servingSizeUnit?.toLowerCase() === 'g' ? num(f.servingSize) : null
    const s = grams ? grams / 100 : 1
    return {
      source: 'usda',
      name: f.description.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()),
      brand: f.brandName || f.brandOwner || null,
      barcode: f.gtinUpc ?? null,
      serving_label: grams ? `${f.householdServingFullText ? f.householdServingFullText + ', ' : ''}${grams} g` : '100 g',
      basis: grams ? 'serving' : '100g',
      kcal: r1(kcal * s), protein: r1((protein ?? 0) * s), carbs: r1((carbs ?? 0) * s), fat: r1((fat ?? 0) * s),
    }
  }).filter((c): c is Candidate => !!c)
}

export async function GET(request: Request) {
  const denied = await guard()
  if (denied) return denied
  const sp = new URL(request.url).searchParams
  const barcode = sp.get('barcode')?.replace(/\D/g, '')
  const q = sp.get('q')?.trim()
  if (!barcode && !q) return NextResponse.json({ error: 'barcode or q required' }, { status: 400 })

  const jobs: [string, Promise<Candidate[]>][] = barcode
    ? [['Open Food Facts', offBarcode(barcode)]]
    : [['Open Food Facts', offSearch(q!)], ['USDA', usdaSearch(q!)]]
  const settled = await Promise.allSettled(jobs.map(([, p]) => p))
  const results: Candidate[] = []
  const errors: string[] = []
  settled.forEach((s, i) => {
    if (s.status === 'fulfilled') results.push(...s.value)
    else errors.push(`${jobs[i][0]}: ${(s.reason as Error).message}`)
  })
  return NextResponse.json({ results, errors })
}
