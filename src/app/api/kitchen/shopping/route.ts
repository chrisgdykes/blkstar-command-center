import { guard } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { kitchenDb } from '@/lib/kitchenDb'
import { normName, normUnit, toBase } from '@/lib/kitchenUnits'
import type { KitchenIngredient } from '@/types/kitchen'

// Shopping list for a date range, generated from kitchen_meals, minus what's in kitchen_inventory.
// Each recipe is cooked in whole batches: batches = ceil(servings eaten / recipe.servings).
// Ingredient totals = batch ingredients x batches, merged by normalized name + unit.
// Pantry stock matches on kitchen_foods.match_key === item name, same unit (tsp/tbsp/cup interchange).

const PANTRY = /\b(salt|pepper|oregano|cumin|paprika|garlic powder|onion powder|cayenne|thyme|basil|bay leaf|coriander|turmeric|curry powder|chili powder|olive oil|cooking oil|vinegar|honey|sugar|water)\b/i
const AISLES: [string, RegExp][] = [
  ['Canned & jarred', /beans|salsa|pico|corn|tomatoes|tomato paste|paste|hummus|harissa|chipotle|adobo|sriracha|broth|stock/i],
  ['Grains & bakery', /rice|noodle|pita|cracker|granola|belvita|biscuit/i],
  ['Drinks & protein', /shake|whey|protein|celsius/i],
  ['Dairy & eggs', /cheese|yogurt|sour cream|butter|cottage|babybel|mayo|eggs?\b/i],
  ['Meat & seafood', /chicken|turkey|sausage|beef|pork|andouille/i],
  ['Produce', /lettuce|cilantro|parsley|onion|garlic|pepper\b|poblano|carrot|celery|banana|berries|strawberr|lime|lemon|tomato|potato|veggies|romaine|spinach|almond|raisin/i],
]
const aisleOf = (name: string) => AISLES.find(([, re]) => re.test(name))?.[0] ?? 'Other'

export async function GET(request: Request) {
  const denied = await guard()
  if (denied) return denied
  const sp = new URL(request.url).searchParams
  const start = sp.get('start'), end = sp.get('end')
  const ok = (d: string | null) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d)
  if (!ok(start) || !ok(end)) return NextResponse.json({ error: 'start & end (YYYY-MM-DD) required' }, { status: 400 })

  const sb = kitchenDb()
  const [mealsRes, invRes] = await Promise.all([
    sb.from('kitchen_meals').select('servings, recipe:kitchen_recipes(id,name,servings,ingredients)')
      .gte('plan_date', start!).lte('plan_date', end!),
    sb.from('kitchen_inventory').select('quantity, unit, food:kitchen_foods(match_key)'),
  ])
  if (mealsRes.error) return NextResponse.json({ error: mealsRes.error.message }, { status: 500 })
  if (invRes.error) return NextResponse.json({ error: invRes.error.message }, { status: 500 })

  // pantry stock: match_key -> base unit -> amount
  const stock = new Map<string, Map<string, number>>()
  for (const row of (invRes.data ?? []) as unknown as { quantity: number; unit: string; food: { match_key: string } | null }[]) {
    if (!row.food) continue
    const b = toBase(Number(row.quantity), row.unit)
    const byUnit = stock.get(row.food.match_key) ?? new Map<string, number>()
    byUnit.set(b.unit, (byUnit.get(b.unit) ?? 0) + b.amount)
    stock.set(row.food.match_key, byUnit)
  }

  type R = { id: string; name: string; servings: number; ingredients: KitchenIngredient[] }
  const byRecipe = new Map<string, { r: R; eaten: number }>()
  for (const m of (mealsRes.data ?? []) as unknown as { servings: number; recipe: R | null }[]) {
    if (!m.recipe) continue
    const cur = byRecipe.get(m.recipe.id) ?? { r: m.recipe, eaten: 0 }
    cur.eaten += Number(m.servings)
    byRecipe.set(m.recipe.id, cur)
  }

  const batches: { id: string; name: string; eaten: number; batchServings: number; batches: number }[] = []
  type Item = { key: string; name: string; amount: number | null; unit: string; volume: boolean; aisle: string; pantry: boolean; usedIn: string[]; have?: number; need?: number }
  const items = new Map<string, Item>()

  for (const { r, eaten } of byRecipe.values()) {
    const n = Math.max(1, Math.ceil(eaten / (r.servings || 1)))
    batches.push({ id: r.id, name: r.name, eaten, batchServings: r.servings, batches: n })
    for (const ing of r.ingredients) {
      if (!ing.amount && !ing.unit) continue // section header line
      if (/\(from above\)/i.test(ing.name)) continue // sub-recipe reference, components already counted
      const name = normName(ing.name)
      const rawUnit = normUnit(ing.unit)
      const amt = Number(ing.amount)
      const numeric = Number.isFinite(amt) && ing.amount !== '' && !/^(to taste|optional)$/.test(rawUnit)
      const base = numeric ? toBase(amt, rawUnit) : { amount: 0, unit: rawUnit, volume: false }
      const key = `${name}|${numeric ? base.unit : base.unit + '|flag'}`
      const it = items.get(key) ?? { key, name, amount: numeric ? 0 : null, unit: base.unit, volume: base.volume, aisle: aisleOf(name), pantry: PANTRY.test(name), usedIn: [] }
      if (numeric) it.amount = (it.amount ?? 0) + base.amount * n
      if (!it.usedIn.includes(r.name)) it.usedIn.push(r.name)
      items.set(key, it)
    }
  }

  // subtract pantry stock
  for (const it of items.values()) {
    if (it.amount == null) continue
    const have = stock.get(it.name)?.get(it.unit) ?? 0
    it.have = have
    it.need = Math.max(0, it.amount - have)
  }

  return NextResponse.json({
    start, end,
    batches: batches.sort((a, b) => a.name.localeCompare(b.name)),
    items: [...items.values()].sort((a, b) => a.name.localeCompare(b.name)),
  })
}
