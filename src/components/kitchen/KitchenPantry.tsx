'use client'

import { useEffect, useState, useCallback } from 'react'
import { fmtAmount } from '@/lib/fractions'

interface Food {
  id: string; name: string; brand: string | null; match_key: string; barcode: string | null
  serving_label: string | null; kcal: number | null; protein: number | null; carbs: number | null; fat: number | null
  default_unit: string | null; store: string | null
}
interface Candidate {
  source: 'off' | 'usda'; name: string; brand: string | null; barcode: string | null
  serving_label: string | null; basis: 'serving' | '100g'
  kcal: number | null; protein: number | null; carbs: number | null; fat: number | null
}
interface InvRow { id: string; quantity: number; unit: string; location: 'pantry' | 'fridge' | 'freezer'; expires_on: string | null; food: Food }

const LOCS: InvRow['location'][] = ['pantry', 'fridge', 'freezer']
const UNITS = ['ea', 'can', 'lb', 'oz', 'cup', 'tbsp', 'tsp', 'bottle', 'pack', 'bag', 'jar', 'box', 'head', 'bar', 'scoop']
const inputCls = 'bg-card-alt border border-border rounded px-2 py-1.5 text-xs text-text w-full'

export default function KitchenPantry({ onChange }: { onChange: () => void }) {
  const [rows, setRows] = useState<InvRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState({ name: '', brand: '', quantity: '', unit: 'ea', location: 'pantry', expires_on: '', kcal: '', protein: '', carbs: '', fat: '', serving_label: '', store: '' })
  const [more, setMore] = useState(false)
  const [filter, setFilter] = useState('')
  const [barcode, setBarcode] = useState('')
  const [source, setSource] = useState<'manual' | 'usda' | 'off'>('manual')
  const [term, setTerm] = useState('')
  const [cands, setCands] = useState<Candidate[] | null>(null)
  const [lookupMsg, setLookupMsg] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)

  const load = useCallback(() => {
    fetch('/api/kitchen/inventory')
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b.error || 'Failed'); setRows(b.inventory) })
      .catch((e) => setError(e.message))
  }, [])
  useEffect(() => { load() }, [load])

  async function lookup(e: React.FormEvent) {
    e.preventDefault()
    const t = term.trim()
    if (!t) return
    setSearching(true); setCands(null); setLookupMsg(null)
    try {
      const isCode = /^\d{8,14}$/.test(t.replace(/\s/g, ''))
      const r = await fetch(`/api/kitchen/lookup?${isCode ? 'barcode' : 'q'}=${encodeURIComponent(t)}`)
      const b = await r.json(); if (!r.ok) throw new Error(b.error || 'Lookup failed')
      setCands(b.results)
      const msgs: string[] = []
      if (!b.results.length) msgs.push(isCode ? 'No product found for that barcode — enter it manually below.' : 'No matches.')
      if (b.errors?.length) msgs.push(b.errors.join(' · '))
      setLookupMsg(msgs.join(' ') || null)
    } catch (err) { setLookupMsg((err as Error).message) } finally { setSearching(false) }
  }

  function useCandidate(c: Candidate) {
    setF({ ...f, name: c.name, brand: c.brand ?? '', serving_label: c.serving_label ?? '',
      kcal: c.kcal != null ? String(c.kcal) : '', protein: c.protein != null ? String(c.protein) : '',
      carbs: c.carbs != null ? String(c.carbs) : '', fat: c.fat != null ? String(c.fat) : '' })
    setBarcode(c.barcode ?? ''); setSource(c.source); setMore(true); setCands(null)
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      // Nutrition/brand details go on the food record; create it first when provided so inventory links to it.
      let food_id: string | undefined
      const hasDetails = barcode || f.brand || f.kcal || f.protein || f.carbs || f.fat || f.serving_label || f.store
      if (hasDetails) {
        const r = await fetch('/api/kitchen/foods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          name: f.name, brand: f.brand, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat,
          serving_label: f.serving_label, store: f.store, default_unit: f.unit, barcode, source }) })
        const b = await r.json(); if (!r.ok) throw new Error(b.error || 'Could not save food')
        food_id = b.food.id
      }
      const r = await fetch('/api/kitchen/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        food_id, name: f.name, quantity: f.quantity, unit: f.unit, location: f.location, expires_on: f.expires_on || null }) })
      const b = await r.json(); if (!r.ok) throw new Error(b.error || 'Could not add')
      setBarcode(''); setSource('manual'); setTerm(''); setCands(null)
      setF({ ...f, name: '', brand: '', quantity: '', expires_on: '', kcal: '', protein: '', carbs: '', fat: '', serving_label: '', store: '' })
      load(); onChange()
    } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }

  async function setQty(id: string, quantity: number) {
    await fetch('/api/kitchen/inventory', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, quantity }) })
    load(); onChange()
  }

  const shown = (rows ?? []).filter((r) => !filter || `${r.food.name} ${r.food.brand ?? ''}`.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={lookup} className="bg-card rounded-xl border border-border p-4 flex flex-col gap-2">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Find a product</h3>
        <div className="flex gap-2">
          <input placeholder="Barcode or name (e.g. 0722252601025 or “Kirkland protein bar”)" value={term} onChange={(e) => setTerm(e.target.value)} className={inputCls} />
          <button disabled={searching} className="px-3 py-1.5 rounded border border-accent text-accent text-xs font-semibold shrink-0 disabled:opacity-50">{searching ? 'Searching…' : 'Search'}</button>
        </div>
        {lookupMsg && <p className="text-[11px] text-text-secondary">{lookupMsg}</p>}
        {cands && cands.length > 0 && (
          <ul className="divide-y divide-border">
            {cands.map((c, i) => (
              <li key={i} className="flex items-center gap-2 py-1.5">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text truncate">{c.name}{c.brand ? <span className="text-text-muted"> · {c.brand}</span> : null}</div>
                  <div className="text-[10px] text-text-muted">
                    {c.kcal != null ? `${Math.round(c.kcal)} kcal · ${c.protein ?? '–'}P · ${c.carbs ?? '–'}C · ${c.fat ?? '–'}F` : 'no nutrition'} per {c.serving_label} · {c.source === 'off' ? 'Open Food Facts' : 'USDA'}
                  </div>
                </div>
                <button type="button" onClick={() => useCandidate(c)} className="px-2 py-1 rounded bg-accent text-white text-[11px] font-semibold">Use</button>
              </li>
            ))}
          </ul>
        )}
      </form>

      <form onSubmit={add} className="bg-card rounded-xl border border-border p-4 flex flex-col gap-2.5">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Add to pantry</h3>
        <div className="grid grid-cols-12 gap-2">
          <input required placeholder="Item (e.g. Black beans)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={`${inputCls} col-span-12 sm:col-span-5`} />
          <input required type="number" step="any" min="0" placeholder="Qty" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} className={`${inputCls} col-span-4 sm:col-span-2`} />
          <select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} className={`${inputCls} col-span-4 sm:col-span-2`}>
            {UNITS.map((u) => <option key={u}>{u}</option>)}
          </select>
          <select value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} className={`${inputCls} col-span-4 sm:col-span-3`}>
            {LOCS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <button type="button" onClick={() => setMore(!more)} className="text-[11px] text-accent font-semibold text-left">
          {more ? '− Hide' : '+ Add'} brand, nutrition, expiry
        </button>
        {more && (
          <div className="grid grid-cols-12 gap-2">
            <input placeholder="Brand / product" value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} className={`${inputCls} col-span-6`} />
            <input placeholder="Store (e.g. Sam's Club)" value={f.store} onChange={(e) => setF({ ...f, store: e.target.value })} className={`${inputCls} col-span-6`} />
            <input placeholder="Serving (e.g. 1 bar, 40 g)" value={f.serving_label} onChange={(e) => setF({ ...f, serving_label: e.target.value })} className={`${inputCls} col-span-12 sm:col-span-4`} />
            <input type="number" step="any" placeholder="kcal" value={f.kcal} onChange={(e) => setF({ ...f, kcal: e.target.value })} className={`${inputCls} col-span-3 sm:col-span-2`} />
            <input type="number" step="any" placeholder="P g" value={f.protein} onChange={(e) => setF({ ...f, protein: e.target.value })} className={`${inputCls} col-span-3 sm:col-span-2`} />
            <input type="number" step="any" placeholder="C g" value={f.carbs} onChange={(e) => setF({ ...f, carbs: e.target.value })} className={`${inputCls} col-span-3 sm:col-span-2`} />
            <input type="number" step="any" placeholder="F g" value={f.fat} onChange={(e) => setF({ ...f, fat: e.target.value })} className={`${inputCls} col-span-3 sm:col-span-2`} />
            <label className="col-span-12 text-[10px] text-text-muted flex items-center gap-2">Expires
              <input type="date" value={f.expires_on} onChange={(e) => setF({ ...f, expires_on: e.target.value })} className={`${inputCls} w-auto`} />
            </label>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button disabled={busy} className="px-3 py-1.5 rounded bg-accent text-white text-xs font-semibold disabled:opacity-50">{busy ? 'Adding…' : 'Add'}</button>
          {error && <span className="text-xs text-text-secondary">{error}</span>}
        </div>
        <p className="text-[10px] text-text-muted">Items whose name matches a recipe ingredient (e.g. “Black beans”, same unit) are subtracted from the shopping list automatically.</p>
      </form>

      <input placeholder="Filter pantry…" value={filter} onChange={(e) => setFilter(e.target.value)} className={inputCls} />
      {!rows && !error && <div className="text-xs text-text-muted">Loading…</div>}
      {rows && rows.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-sm text-text-muted">Pantry is empty. Add what you have above and the shopping list will account for it.</div>
      )}
      {LOCS.map((loc) => {
        const list = shown.filter((r) => r.location === loc)
        if (!list.length) return null
        return (
          <div key={loc} className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--la-nutrition)' }}>{loc}</h3>
            <ul className="divide-y divide-border">
              {list.map((r) => (
                <li key={r.id} className="flex items-center gap-2 py-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text truncate">{r.food.name}{r.food.brand ? <span className="text-text-muted"> · {r.food.brand}</span> : null}</div>
                    <div className="text-[10px] text-text-muted">
                      {r.food.kcal != null ? `${Math.round(Number(r.food.kcal))} kcal · ${r.food.protein ?? '–'}P · ${r.food.carbs ?? '–'}C · ${r.food.fat ?? '–'}F${r.food.serving_label ? ` per ${r.food.serving_label}` : ''}` : ''}
                      {r.expires_on ? `${r.food.kcal != null ? ' · ' : ''}exp ${r.expires_on}` : ''}
                    </div>
                  </div>
                  <button onClick={() => setQty(r.id, Number(r.quantity) - 1)} className="w-6 h-6 rounded border border-border text-text-secondary hover:border-accent">−</button>
                  <span className="w-20 text-center text-xs text-text font-medium">{fmtAmount(Number(r.quantity))} {r.unit}</span>
                  <button onClick={() => setQty(r.id, Number(r.quantity) + 1)} className="w-6 h-6 rounded border border-border text-text-secondary hover:border-accent">+</button>
                  <button onClick={() => setQty(r.id, 0)} aria-label="Remove" className="w-6 h-6 text-text-muted hover:text-text">✕</button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
