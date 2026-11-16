import { guard } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Kitchen OS: one planned day (meals joined with recipes) + list of all planned dates.
// Server-side only (service role) — kitchen tables have RLS on with no public policies.
export async function GET(request: Request) {
  const denied = await guard()
  if (denied) return denied
  const date = new URL(request.url).searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date=YYYY-MM-DD required' }, { status: 400 })
  }
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const [dayRes, mealsRes, datesRes] = await Promise.all([
    sb.from('kitchen_days').select('*').eq('plan_date', date).maybeSingle(),
    sb.from('kitchen_meals').select('*, recipe:kitchen_recipes(*)').eq('plan_date', date).order('meal_time'),
    sb.from('kitchen_days').select('plan_date').order('plan_date'),
  ])
  const err = dayRes.error || mealsRes.error || datesRes.error
  if (err) return NextResponse.json({ error: err.message }, { status: 500 })

  return NextResponse.json({
    date,
    day: dayRes.data,
    meals: mealsRes.data ?? [],
    dates: (datesRes.data ?? []).map((d: { plan_date: string }) => d.plan_date),
  })
}
