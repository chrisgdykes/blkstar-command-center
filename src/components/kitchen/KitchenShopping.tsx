'use client'

import { useEffect, useState, useCallback } from 'react'
import { fmtAmount } from '@/lib/fractions'
import KitchenPantry from './KitchenPantry'

interface Item { key: string; name: string; amount: number | null; unit: string; volume?: boolean; aisle: string; pantry: boolean; usedIn: string[]; have?: number; need?: number }
interface Batch { id: string; name: string; eaten: number; batchServings: number; batches: number }
interface ShoppingResponse { start: string; end: string; batches: Batch[]; items: Item[] }

const p2 = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
function mondayOf(d: Date) { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }
function addDays(isoDate: string, n: number) { const d = new Date(isoDate + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d) }
const pretty = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
// amount stored in tsp -> "1½ cup", "2 tbsp + 1 tsp", "¾ tsp"
function fmtVol(tsp: number): string {
  if (tsp >= 12) return `${fmtAmount(Math.round((tsp / 48) * 8) / 8)} cup`
  const tbsp = Math.floor(tsp / 3 + 1e-9)
  const rest = Math.round((tsp - tbsp * 3) * 8) / 8
  if (tbsp && rest) return `${tbsp} tbsp + ${fmtAmount(rest)} tsp`
  if (tbsp) return `${tbsp} tbsp`
  return `${fmtAmount(rest)} tsp`
}
const qty = (it: Item, n: number) => (it.volume ? fmtVol(n) : `${fmtAmount(n)} ${it.unit}`.trim())
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const AISLE_ORDER = ['Produce', 'Meat & seafood', 'Dairy & eggs', 'Canned & jarred', 'Grains & bakery', 'Drinks & protein', 'Other']

export default function KitchenShopping({ onBack }: { onBack: () => void }) {
  const [start, setStart] = useState(() => iso(mondayOf(new Date())))
  const [data, setData] = useState<ShoppingResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [showPantry, setShowPantry] = useState(false)
  const [tab, setTab] = useState<'list' | 'pantry'>('list')
  const [refresh, setRefresh] = useState(0)
  const end = addDays(start, 6)
  const storeKey = `kitchen-shopping:${start}`

  const load = useCallback(() => {
    setError(null); setData(null)
    fetch(`/api/kitchen/shopping?start=${start}&end=${addDays(start, 6)}`)
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b.error || 'Failed'); setData(b) })
      .catch((e) => setError(e.message))
  }, [start, refresh])

  useEffect(() => {
    load()
    try { setChecked(JSON.parse(localStorage.getItem(storeKey) || '{}')) } catch { setChecked({}) }
  }, [load, storeKey])

  const toggle = (key: string) => {
    const next = { ...checked, [key]: !checked[key] }
    setChecked(next)
    try { localStorage.setItem(storeKey, JSON.stringify(next)) } catch {}
  }

  const covered = (i: Item) => i.amount != null && (i.need ?? i.amount) <= 0
  const buy = (data?.items ?? []).filter((i) => !i.pantry)
  const pantry = (data?.items ?? []).filter((i) => i.pantry)
  const left = buy.filter((i) => !checked[i.key] && !covered(i)).length
  const groups = AISLE_ORDER.map((a) => [a, buy.filter((i) => i.aisle === a)] as const).filter(([, l]) => l.length)

  const Row = ({ it }: { it: Item }) => (
    <li>
      <label className="flex items-start gap-2.5 py-1 cursor-pointer">
        <input type="checkbox" checked={!!checked[it.key] || covered(it)} disabled={covered(it)} onChange={() => toggle(it.key)} className="mt-1 accent-[var(--accent)]" />
        <span className={`flex-1 text-sm ${checked[it.key] || covered(it) ? 'line-through text-text-muted' : 'text-text'}`}>
          <span className="font-medium">
            {it.amount == null ? it.unit : qty(it, covered(it) || !it.have ? it.amount : (it.need ?? it.amount))}
          </span>{' '}{cap(it.name)}
          <span className="block text-[10px] text-text-muted no-underline">
            {it.amount != null && it.have ? (covered(it) ? `In pantry (${qty(it, it.have)}) · ` : `Have ${qty(it, it.have)} of ${qty(it, it.amount)} · `) : ''}{it.usedIn.join(' · ')}
          </span>
        </span>
      </label>
    </li>
  )

  return (
    <div className="h-full overflow-y-auto py-3">
      <div className="max-w-3xl mx-auto flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-accent hover:text-accent-dark text-sm font-medium">← Home</button>
          <h2 className="text-lg font-bold text-text flex-1">Shopping <span className="text-text-muted font-normal text-sm">· {pretty(start)} – {pretty(end)}</span></h2>
          <div className="flex rounded border border-border overflow-hidden text-xs font-semibold">
            <button onClick={() => setTab('list')} className={`px-3 py-1 ${tab === 'list' ? 'bg-accent text-white' : 'text-text-secondary'}`}>List</button>
            <button onClick={() => setTab('pantry')} className={`px-3 py-1 ${tab === 'pantry' ? 'bg-accent text-white' : 'text-text-secondary'}`}>Pantry</button>
          </div>
          <button onClick={() => setStart(addDays(start, -7))} className="px-2 py-1 rounded border border-border text-text-secondary hover:border-accent">‹</button>
          <button onClick={() => setStart(addDays(start, 7))} className="px-2 py-1 rounded border border-border text-text-secondary hover:border-accent">›</button>
          <button onClick={() => setStart(iso(mondayOf(new Date())))} className="text-xs text-accent font-semibold">This week</button>
        </div>

        {tab === 'pantry' && <KitchenPantry onChange={() => setRefresh((n) => n + 1)} />}

        {tab === 'list' && error && <div className="bg-card border border-border rounded-xl p-4 text-sm text-text-secondary">Couldn&apos;t build the list: {error}</div>}
        {tab === 'list' && !data && !error && <div className="text-xs text-text-muted">Building list…</div>}

        {tab === 'list' && data && data.items.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-sm text-text-muted">
            No meals planned for {pretty(start)} – {pretty(end)}, so nothing to buy.
          </div>
        )}

        {tab === 'list' && data && data.items.length > 0 && (
          <>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Cook this week</h3>
                <span className="text-[11px] text-accent font-semibold">{left} of {buy.length} items left</span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-text-secondary">
                {data.batches.map((b) => (
                  <li key={b.id}>
                    <span className="text-text font-semibold">{b.batches}×</span> {b.name}
                    <span className="text-text-muted"> ({b.eaten} of {b.batchServings} servings eaten)</span>
                  </li>
                ))}
              </ul>
            </div>

            {groups.map(([aisle, list]) => (
              <div key={aisle} className="bg-card rounded-xl border border-border p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--la-nutrition)' }}>{aisle}</h3>
                <ul>{list.map((it) => <Row key={it.key} it={it} />)}</ul>
              </div>
            ))}

            {pantry.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <button onClick={() => setShowPantry(!showPantry)} className="w-full flex items-center justify-between text-left">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Pantry check — skip if stocked ({pantry.length})</h3>
                  <span className="text-text-muted text-xs">{showPantry ? '▲' : '▼'}</span>
                </button>
                {showPantry && <ul className="mt-1">{pantry.map((it) => <Row key={it.key} it={it} />)}</ul>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
