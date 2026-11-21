'use client'

import { useEffect, useState, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Job {
  title: string
  service: string
  serviceLabel: string
  petName: string
  petCount: number
  clientName: string | null
  dateISO: string
  dateLabel: string
  earnings: number
  isPast: boolean
  isToday: boolean
}

interface RoverData {
  monthJobs: number
  monthIncome: number
  upcomingJobs: number
  upcomingIncome: number
  nextJob: Job | null
  nextJobs: Job[]
  allJobs: Job[]
}

interface RoverRate {
  service_key: string
  rate: number
}

interface RoverClient {
  id: string
  name: string
  dogs: string[]
  notes: string | null
  rover_rates: RoverRate[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SERVICE_COLORS: Record<string, string> = {
  overnight:     '#7C6AF7',
  'drop-in':     '#4AAEFF',
  'day sitting': '#F5A623',
  'dog walk':    '#7ED957',
}

const SERVICE_ICONS: Record<string, string> = {
  overnight:     '🌙',
  'drop-in':     '🏠',
  'day sitting': '☀️',
  'dog walk':    '🦮',
}

const SERVICE_KEYS = ['overnight', 'drop-in', 'day sitting', 'dog walk'] as const
const SERVICE_LABELS: Record<string, string> = {
  overnight:     'Overnight',
  'drop-in':     'Drop-In',
  'day sitting': 'Day Sitting',
  'dog walk':    'Dog Walk',
}

const DEFAULT_RATES: Record<string, number> = {
  overnight: 85, 'drop-in': 25, 'day sitting': 85, 'dog walk': 35,
}

// ── Job Row ───────────────────────────────────────────────────────────────────

function JobRow({ job }: { job: Job }) {
  const color = SERVICE_COLORS[job.service] ?? '#888'
  const icon  = SERVICE_ICONS[job.service] ?? '🐕'

  return (
    <div
      className="flex items-center gap-3 py-2.5 border-b border-border last:border-0"
      style={{ opacity: job.isPast && !job.isToday ? 0.55 : 1 }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
        style={{ background: `${color}22`, border: `1px solid ${color}44` }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text truncate">
            {job.petName || job.title}
          </span>
          {job.isToday && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{ background: `${color}33`, color }}>TODAY</span>
          )}
          {job.petCount > 1 && (
            <span className="text-[10px] text-text-muted">×{job.petCount}</span>
          )}
        </div>
        <div className="text-[11px] text-text-muted mt-0.5">
          {job.serviceLabel} · {job.dateLabel}
          {job.clientName && <span className="text-text-muted"> · {job.clientName}</span>}
        </div>
      </div>
      <div className="text-sm font-bold shrink-0" style={{ color }}>${job.earnings}</div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 text-center">
      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-black text-text">{value}</div>
      {sub && <div className="text-[10px] text-text-muted mt-0.5">{sub}</div>}
    </div>
  )
}

// ── Client Editor ─────────────────────────────────────────────────────────────

interface ClientFormProps {
  initial?: RoverClient
  onSave: () => void
  onCancel: () => void
}

function ClientForm({ initial, onSave, onCancel }: ClientFormProps) {
  const [name, setName]       = useState(initial?.name ?? '')
  const [dogsText, setDogs]   = useState(initial?.dogs.join(', ') ?? '')
  const [notes, setNotes]     = useState(initial?.notes ?? '')
  const [rates, setRates]     = useState<Record<string, string>>(() => {
    const r: Record<string, string> = {}
    for (const key of SERVICE_KEYS) {
      const existing = initial?.rover_rates.find(x => x.service_key === key)
      r[key] = existing ? String(existing.rate) : ''
    }
    return r
  })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')

    const dogs = dogsText.split(',').map(d => d.trim()).filter(Boolean)
    const ratePayload = SERVICE_KEYS
      .filter(k => rates[k] && Number(rates[k]) > 0)
      .map(k => ({ service_key: k, rate: Number(rates[k]) }))

    const body = { id: initial?.id, name: name.trim(), dogs, notes: notes.trim() || null, rates: ratePayload }
    const method = initial ? 'PUT' : 'POST'

    try {
      const res = await fetch('/api/rover/clients', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed')
      onSave()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      setSaving(false)
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
      <div className="text-[11px] font-bold text-text uppercase tracking-wider">
        {initial ? 'Edit Client' : 'New Client'}
      </div>

      {/* Name */}
      <div>
        <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
          Client Name
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. The Smith Family"
          className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent"
        />
      </div>

      {/* Dogs */}
      <div>
        <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
          Dogs (comma-separated, match your calendar)
        </label>
        <input
          value={dogsText}
          onChange={e => setDogs(e.target.value)}
          placeholder="e.g. Maui, Jilly"
          className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent"
        />
      </div>

      {/* Rates */}
      <div>
        <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-2">
          Rates (leave blank to use default)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SERVICE_KEYS.map(key => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-sm w-4">{SERVICE_ICONS[key]}</span>
              <span className="text-xs text-text-muted w-20">{SERVICE_LABELS[key]}</span>
              <div className="flex-1 relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-muted">$</span>
                <input
                  type="number"
                  value={rates[key]}
                  onChange={e => setRates(r => ({ ...r, [key]: e.target.value }))}
                  placeholder={String(DEFAULT_RATES[key])}
                  className="w-full bg-bg border border-border rounded-lg pl-5 pr-2 py-1.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Gate code, feeding instructions, etc."
          rows={2}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent resize-none"
        />
      </div>

      {error && <div className="text-xs text-red-500">{error}</div>}

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-text-muted hover:text-text transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 text-xs font-semibold bg-accent text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ── Client Card ───────────────────────────────────────────────────────────────

function ClientCard({ client, onEdit, onDelete }: {
  client: RoverClient
  onEdit: () => void
  onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-sm font-bold text-text">{client.name}</div>
          <div className="text-[11px] text-text-muted mt-0.5">
            🐕 {client.dogs.length > 0 ? client.dogs.join(', ') : 'No dogs listed'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="text-[11px] text-accent hover:opacity-70 transition-opacity font-semibold"
          >
            Edit
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onDelete}
                className="text-[11px] text-red-500 font-semibold hover:opacity-70"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[11px] text-text-muted hover:text-text"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-[11px] text-text-muted hover:text-red-500 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Rates grid */}
      {client.rover_rates.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
          {client.rover_rates.map(r => {
            const color = SERVICE_COLORS[r.service_key] ?? '#888'
            return (
              <div key={r.service_key} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">{SERVICE_ICONS[r.service_key]}</span>
                  <span className="text-[11px] text-text-muted">{SERVICE_LABELS[r.service_key]}</span>
                </div>
                <span className="text-[11px] font-bold" style={{ color }}>${r.rate}</span>
              </div>
            )
          })}
        </div>
      )}
      {client.rover_rates.length === 0 && (
        <div className="text-[11px] text-text-muted mt-2 italic">Using default rates</div>
      )}

      {client.notes && (
        <div className="mt-3 pt-3 border-t border-border text-[11px] text-text-muted">
          {client.notes}
        </div>
      )}
    </div>
  )
}

// ── Clients Tab ───────────────────────────────────────────────────────────────

function ClientsTab() {
  const [clients, setClients]   = useState<RoverClient[]>([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState<RoverClient | null | 'new'>(null)

  const loadClients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/rover/clients')
      if (!res.ok) throw new Error()
      setClients(await res.json())
    } catch {
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadClients() }, [loadClients])

  const handleDelete = async (id: string) => {
    await fetch(`/api/rover/clients?id=${id}`, { method: 'DELETE' })
    loadClients()
  }

  const handleSaved = () => {
    setEditing(null)
    loadClients()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted text-sm">
        Loading clients…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Add button (only when not editing) */}
      {!editing && (
        <button
          onClick={() => setEditing('new')}
          className="w-full py-2 rounded-xl border border-dashed border-border text-[11px] font-semibold text-text-muted hover:border-accent hover:text-accent transition-colors"
        >
          + Add Client
        </button>
      )}

      {/* New client form */}
      {editing === 'new' && (
        <ClientForm
          onSave={handleSaved}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Client list */}
      {clients.map(client => (
        editing && editing !== 'new' && editing.id === client.id ? (
          <ClientForm
            key={client.id}
            initial={editing}
            onSave={handleSaved}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <ClientCard
            key={client.id}
            client={client}
            onEdit={() => setEditing(client)}
            onDelete={() => handleDelete(client.id)}
          />
        )
      ))}

      {clients.length === 0 && editing !== 'new' && (
        <div className="text-center py-8 text-text-muted text-sm">
          <div className="text-3xl mb-2">🐾</div>
          No clients yet — add one to set custom rates
        </div>
      )}
    </div>
  )
}

// ── Jobs Tab ──────────────────────────────────────────────────────────────────

function JobsTab({ data }: { data: RoverData }) {
  const fmt = (n: number) => `$${n.toLocaleString()}`
  const thisMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const upcoming  = data.allJobs.filter(j => !j.isPast || j.isToday)
  const pastJobs  = data.allJobs.filter(j => j.isPast && !j.isToday)
  const avgPerJob = data.monthJobs > 0 ? Math.round(data.monthIncome / data.monthJobs) : 0

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={thisMonth} value={fmt(data.monthIncome)}
          sub={`${data.monthJobs} job${data.monthJobs !== 1 ? 's' : ''}`} />
        <StatCard label="Upcoming" value={String(data.upcomingJobs)}
          sub={data.upcomingJobs > 0 ? `${fmt(data.upcomingIncome)} projected` : 'No jobs booked'} />
        <StatCard label="Avg Per Job" value={data.monthJobs > 0 ? fmt(avgPerJob) : '—'}
          sub="this month" />
      </div>

      {upcoming.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3">Upcoming</div>
          {upcoming.map((job, i) => <JobRow key={i} job={job} />)}
        </div>
      )}

      {pastJobs.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3">Completed This Month</div>
          {pastJobs.map((job, i) => <JobRow key={i} job={job} />)}
        </div>
      )}

      {data.allJobs.length === 0 && (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <div className="text-4xl mb-3">🐾</div>
          <div className="text-sm text-text-muted">No jobs on the calendar this month</div>
        </div>
      )}

      {/* Rate sheet */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3">Default Rates</div>
        <div className="grid grid-cols-2 gap-2">
          {SERVICE_KEYS.map(key => (
            <div key={key} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span>{SERVICE_ICONS[key]}</span>
                <span className="text-xs text-text">{SERVICE_LABELS[key]}</span>
              </div>
              <span className="text-xs font-semibold" style={{ color: SERVICE_COLORS[key] }}>
                ${DEFAULT_RATES[key]}+
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main View ─────────────────────────────────────────────────────────────────

type Tab = 'jobs' | 'clients'

export default function RoverView({ onBack }: { onBack: () => void }) {
  const [data, setData]       = useState<RoverData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [tab, setTab]         = useState<Tab>('jobs')

  useEffect(() => {
    fetch('/api/rover')
      .then(r => { if (!r.ok) throw new Error(); return r.json() as Promise<RoverData> })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between pt-1 pb-3 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-accent hover:opacity-70 transition-opacity text-sm font-semibold"
        >
          <span>←</span><span>Home</span>
        </button>
        <div className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
          PET SITTING
        </div>
        <div className="w-16" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-card rounded-xl border border-border p-1 shrink-0">
        {(['jobs', 'clients'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
              tab === t
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-4">
        {tab === 'jobs' && loading && (
          <div className="flex items-center justify-center h-full text-text-muted">
            <div className="text-center">
              <div className="text-4xl mb-3 animate-pulse">🐕</div>
              <div className="text-sm">Loading jobs…</div>
            </div>
          </div>
        )}
        {tab === 'jobs' && error && !loading && (
          <div className="flex items-center justify-center h-full text-text-muted">
            <div className="text-center">
              <div className="text-4xl mb-3">🐾</div>
              <div className="text-sm">Could not load pet sitting data</div>
            </div>
          </div>
        )}
        {tab === 'jobs' && data && !loading && <JobsTab data={data} />}
        {tab === 'clients' && <ClientsTab />}
      </div>
    </div>
  )
}
