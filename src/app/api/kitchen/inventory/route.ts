import { guard } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { kitchenDb } from '@/lib/kitchenDb'
import { normName, normUnit } from '@/lib/kitchenUnits'

export async function GET() {
  const denied = await guard()
  if (denied) return denied
  const { data, error } = await kitchenDb()
    .from('kitchen_inventory').select('*, food:kitchen_foods(*)').order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inventory: data })
}

// Add stock. Body: { food_id } or { name, ... } (creates the food if no match), plus quantity, unit, location?, expires_on?
export async function POST(request: Request) {
  const denied = await guard()
  if (denied) return denied
  const b = await request.json().catch(() => null)
  const qty = Number(b?.quantity)
  if (!b || !Number.isFinite(qty) || qty <= 0 || !b.unit) {
    return NextResponse.json({ error: 'quantity (>0) and unit required' }, { status: 400 })
  }
  const sb = kitchenDb()
  const unit = normUnit(b.unit)
  const location = ['pantry', 'fridge', 'freezer'].includes(b.location) ? b.location : 'pantry'

  let foodId: string | undefined = b.food_id
  if (!foodId) {
    if (!b.name) return NextResponse.json({ error: 'food_id or name required' }, { status: 400 })
    const key = normName(b.name)
    const found = await sb.from('kitchen_foods').select('id').eq('match_key', key).limit(1).maybeSingle()
    if (found.error) return NextResponse.json({ error: found.error.message }, { status: 500 })
    if (found.data) foodId = found.data.id
    else {
      const created = await sb.from('kitchen_foods')
        .insert({ name: b.name.trim(), match_key: key, default_unit: unit }).select('id').single()
      if (created.error) return NextResponse.json({ error: created.error.message }, { status: 500 })
      foodId = created.data.id
    }
  }

  // merge into an existing row for the same food + unit + location
  const existing = await sb.from('kitchen_inventory').select('id, quantity')
    .eq('food_id', foodId!).eq('unit', unit).eq('location', location).limit(1).maybeSingle()
  if (existing.data) {
    const { error } = await sb.from('kitchen_inventory')
      .update({ quantity: Number(existing.data.quantity) + qty, updated_at: new Date().toISOString(), expires_on: b.expires_on || null })
      .eq('id', existing.data.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await sb.from('kitchen_inventory')
      .insert({ food_id: foodId, quantity: qty, unit, location, expires_on: b.expires_on || null })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

// Set an exact quantity. Body: { id, quantity }. quantity <= 0 removes the row.
export async function PATCH(request: Request) {
  const denied = await guard()
  if (denied) return denied
  const b = await request.json().catch(() => null)
  const qty = Number(b?.quantity)
  if (!b?.id || !Number.isFinite(qty)) return NextResponse.json({ error: 'id and quantity required' }, { status: 400 })
  const sb = kitchenDb()
  const { error } = qty <= 0
    ? await sb.from('kitchen_inventory').delete().eq('id', b.id)
    : await sb.from('kitchen_inventory').update({ quantity: qty, updated_at: new Date().toISOString() }).eq('id', b.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
