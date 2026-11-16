'use client'

import { useEffect, useState, useCallback } from 'react'
import type { KitchenDayResponse, KitchenMeal } from '@/types/kitchen'

const SLOT_LABEL: Record<string, string> = {
  preworkout: 'Pre-Workout', breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner',
}

function localISO(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function shift(iso: string, days: number) {
  const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + days); return localISO(d)
}
function fmtTime(t: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
const r = (n: number) => Math.round(n)

function Bar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0
  return (
    <div className="flex-1 min-w-0">
      <div className="flex justify-between text-[10px] mb-1">
        <span className="font-bold text-text-muted uppercase tracking-wider">{label}</span>
        <span className="text-text font-semibold">{r(value)}<span className="text-text-muted"> / {r(target)}</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-card-alt overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function MealCard({ meal, open, onToggle }: { meal: KitchenMeal; open: boolean; onToggle: () => void }) {
  const rec = meal.recipe
  if (!rec) return null
  const s = meal.servings
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <button onClick={onToggle} className="w-full text-left p-4 flex items-center gap-3 hover:bg-card-alt transition-colors">
        <span className="text-2xl">{rec.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--la-nutrition)' }}>
            {SLOT_LABEL[meal.slot]} · {fmtTime(meal.meal_time)}
          </div>
          <div className="text-sm font-semibold text-text truncate">{rec.name}</div>
          <div className="text-[11px] text-text-muted">
            {s !== 1 ? `${s} servings · ` : ''}{r(rec.kcal * s)} kcal · {r(rec.protein * s)}P · {r(rec.carbs * s)}C · {r(rec.fat * s)}F
          </div>
        </div>
        <span className="text-text-muted text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-border p-4 grid grid-cols-1 xl:grid-cols-2 gap-4 text-xs">
          <div>
            <h3 className="font-bold text-text-muted uppercase tracking-wider text-[10px] mb-1.5">
              Ingredients <span className="normal-case font-normal">(full batch · makes {rec.servings})</span>
            </h3>
            <ul className="space-y-1">
              {rec.ingredients.map((ing, i) =>
                !ing.amount && !ing.unit ? (
                  <li key={i} className="pt-1.5 text-[10px] font-bold text-text-secondary">{ing.name.replace(/——/g, '').trim()}</li>
                ) : (
                  <li key={i} className="text-text-secondary">
                    <span className="text-text font-medium">{ing.amount} {ing.unit}</span> {ing.name}
                  </li>
                ))}
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-text-muted uppercase tracking-wider text-[10px] mb-1.5">
              Directions
              {(rec.prep_min != null || rec.cook_min != null) && (
                <span className="normal-case font-normal"> · prep {rec.prep_min ?? 0}m · cook {rec.cook_min ?? 0}m</span>
              )}
            </h3>
            <ol className="space-y-1.5 list-decimal list-inside text-text-secondary">
              {rec.steps.map((st, i) => <li key={i} className="leading-snug">{st}</li>)}
            </ol>
            {rec.meal_prep && (
              <>
                <h3 className="font-bold text-text-muted uppercase tracking-wider text-[10px] mt-3 mb-1.5">Meal prep</h3>
                <p className="whitespace-pre-line text-text-secondary leading-snug">{rec.meal_prep}</p>
              </>
            )}
            {rec.tips && (
              <>
                <h3 className="font-bold text-text-muted uppercase tracking-wider text-[10px] mt-3 mb-1.5">Tips</h3>
                <p className="whitespace-pre-line text-text-secondary leading-snug">{rec.tips}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function KitchenDay({ onBack }: { onBack: () => void }) {
  const [date, setDate] = useState(() => localISO(new Date()))
  const [data, setData] = useState<KitchenDayResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  const load = useCallback((d: string) => {
    setError(null)
    fetch(`/api/kitchen/day?date=${d}`)
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || 'Failed to load')
        setData(body)
      })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => { load(date); setOpen(null) }, [date, load])

  const meals = (data?.meals ?? []).filter((m) => m.recipe)
  const tot = meals.reduce(
    (a, m) => ({
      kcal: a.kcal + m.recipe!.kcal * m.servings, p: a.p + m.recipe!.protein * m.servings,
      c: a.c + m.recipe!.carbs * m.servings, f: a.f + m.recipe!.fat * m.servings,
    }), { kcal: 0, p: 0, c: 0, f: 0 })
  const day = data?.day
  const dates = data?.dates ?? []
  const prev = [...dates].reverse().find((d) => d < date)
  const next = dates.find((d) => d > date)
  const nice = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="h-full overflow-y-auto py-3">
      <div className="max-w-4xl mx-auto flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-accent hover:text-accent-dark text-sm font-medium">← Home</button>
          <h2 className="text-lg font-bold text-text flex-1">Kitchen OS <span className="text-text-muted font-normal text-sm">· Day</span></h2>
          <button onClick={() => setDate(shift(date, -1))} className="px-2 py-1 rounded border border-border text-text-secondary hover:border-accent">‹</button>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)}
            className="bg-card border border-border rounded px-2 py-1 text-xs text-text" />
          <button onClick={() => setDate(shift(date, 1))} className="px-2 py-1 rounded border border-border text-text-secondary hover:border-accent">›</button>
          <button onClick={() => setDate(localISO(new Date()))} className="text-xs text-accent font-semibold">Today</button>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-text">{nice}</span>
          {day && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ background: 'color-mix(in srgb, var(--la-nutrition) 15%, transparent)', color: 'var(--la-nutrition)' }}>
              {day.day_type} day
            </span>
          )}
        </div>

        {error && <div className="bg-card border border-border rounded-xl p-4 text-sm text-text-secondary">Couldn&apos;t load meals: {error}</div>}

        {data && !day && (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <div className="text-3xl mb-2">🍽️</div>
            <div className="text-sm font-semibold text-text mb-1">Nothing planned for this day</div>
            <div className="text-xs text-text-muted mb-4">Plan meals in the LUCAS macro planner.</div>
            <div className="flex justify-center gap-3 text-xs">
              {prev && <button onClick={() => setDate(prev)} className="text-accent font-semibold">← Last planned: {prev}</button>}
              {next && <button onClick={() => setDate(next)} className="text-accent font-semibold">Next planned: {next} →</button>}
            </div>
          </div>
        )}

        {day && (
          <>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Day total</h3>
                <span className="text-sm text-text font-semibold">{r(tot.kcal)} <span className="text-text-muted font-normal">/ {r(day.target_kcal)} kcal</span></span>
              </div>
              <div className="flex gap-4">
                <Bar label="Protein" value={tot.p} target={day.target_protein} color="#2FA88A" />
                <Bar label="Carbs" value={tot.c} target={day.target_carbs} color="#E0713C" />
                <Bar label="Fat" value={tot.f} target={day.target_fat} color="#9575D6" />
              </div>
            </div>
            {meals.map((m) => (
              <MealCard key={m.id} meal={m} open={open === m.id} onToggle={() => setOpen(open === m.id ? null : m.id)} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
