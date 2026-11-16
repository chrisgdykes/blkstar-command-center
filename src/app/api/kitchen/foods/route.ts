import { guard } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { kitchenDb } from '@/lib/kitchenDb'
import { normName, normUnit } from '@/lib/kitchenUnits'

export async function GET(request: Request) {
  const denied = await guard()
  if (denied) return denied
  const q = new URL(request.url).searchParams.get('q')?.trim()
  let query = kitchenDb().from('kitchen_foods').select('*').order('name').limit(50)
  if (q) query = query.or(`name.ilike.%${q.replace(/[%,()]/g, '')}%,brand.ilike.%${q.replace(/[%,()]/g, '')}%,match_key.ilike.%${q.replace(/[%,()]/g, '')}%`)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ foods: data })
}

export async function POST(request: Request) {
  const denied = await guard()
  if (denied) return denied
  const b = await request.json().catch(() => null)
  if (!b?.name || typeof b.name !== 'string') return NextResponse.json({ error: 'name required' }, { status: 400 })
  const num = (v: unknown) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v))
  const row = {
    name: b.name.trim(),
    brand: b.brand?.trim() || null,
    match_key: normName(b.matchKey || b.name),
    barcode: b.barcode?.trim() || null,
    source: ['manual', 'usda', 'off', 'label'].includes(b.source) ? b.source : 'manual',
    serving_label: b.serving_label?.trim() || null,
    kcal: num(b.kcal), protein: num(b.protein), carbs: num(b.carbs), fat: num(b.fat),
    default_unit: b.default_unit ? normUnit(b.default_unit) : null,
    store: b.store?.trim() || null,
    notes: b.notes?.trim() || null,
  }
  const sb = kitchenDb()
  if (row.barcode) {
    const dup = await sb.from('kitchen_foods').select('*').eq('barcode', row.barcode).maybeSingle()
    if (dup.data) return NextResponse.json({ food: dup.data, existing: true })
  }
  const { data, error } = await sb.from('kitchen_foods').insert(row).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ food: data })
}
