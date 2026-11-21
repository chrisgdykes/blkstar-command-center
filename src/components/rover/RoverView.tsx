'use client'

import { useEffect, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Job {
  title: string
  service: string
  serviceLabel: string
  petName: string
  petCount: number
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

// ── Service colors ────────────────────────────────────────────────────────────

const SERVICE_COLORS: Record<string, string> = {
  overnight:     '#7C6AF7', // purple
  'drop-in':     '#4AAEFF', // blue
  'day sitting': '#F5A623', // amber
  'dog walk':    '#7ED957', // green
}

const SERVICE_ICONS: Record<string, string> = {
  overnight:     '🌙',
  'drop-in':     '🏠',
  'day sitting': '☀️',
  'dog walk':    '🦮',
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
      {/* Service icon chip */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
        style={{ background: `${color}22`, border: `1px solid ${color}44` }}
      >
        {icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text truncate">
            {job.petName || job.title}
          </span>
          {job.isToday && (
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{ background: `${color}33`, color }}
            >
              TODAY
            </span>
          )}
          {job.petCount > 1 && (
            <span className="text-[10px] text-text-muted">×{job.petCount}</span>
          )}
        </div>
        <div className="text-[11px] text-text-muted mt-0.5">
          {job.serviceLabel} · {job.dateLabel}
        </div>
      </div>

      {/* Earnings */}
      <div className="text-sm font-bold shrink-0" style={{ color }}>
        ${job.earnings}
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 text-center">
      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-2xl font-black text-text">{value}</div>
      {sub && <div className="text-[10px] text-text-muted mt-0.5">{sub}</div>}
    </div>
  )
}

// ── Main View ─────────────────────────────────────────────────────────────────

export default function RoverView({ onBack }: { onBack: () => void }) {
  const [data, setData]       = useState<RoverData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    fetch('/api/rover')
      .then(r => { if (!r.ok) throw new Error(); return r.json() as Promise<RoverData> })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  const fmt = (n: number) => `$${n.toLocaleString()}`

  const thisMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const upcoming = data?.allJobs.filter(j => !j.isPast || j.isToday) ?? []
  const pastJobs  = data?.allJobs.filter(j => j.isPast && !j.isToday) ?? []
  const avgPerJob = data && data.monthJobs > 0
    ? Math.round(data.monthIncome / data.monthJobs)
    : 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between pt-1 pb-3 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-accent hover:opacity-70 transition-opacity text-sm font-semibold"
        >
          <span>←</span>
          <span>Home</span>
        </button>
        <div className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
          PET SITTING
        </div>
        <div className="w-16" />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center text-text-muted">
          <div className="text-center">
            <div className="text-4xl mb-3 animate-pulse">🐕</div>
            <div className="text-sm">Loading jobs…</div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex-1 flex items-center justify-center text-text-muted">
          <div className="text-center">
            <div className="text-4xl mb-3">🐾</div>
            <div className="text-sm">Could not load pet sitting data</div>
          </div>
        </div>
      )}

      {/* Content */}
      {data && !loading && (
        <div className="flex-1 overflow-y-auto space-y-5 pb-4">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label={thisMonth}
              value={fmt(data.monthIncome)}
              sub={`${data.monthJobs} job${data.monthJobs !== 1 ? 's' : ''}`}
            />
            <StatCard
              label="Upcoming"
              value={String(data.upcomingJobs)}
              sub={data.upcomingJobs > 0 ? `${fmt(data.upcomingIncome)} projected` : 'No jobs booked'}
            />
            <StatCard
              label="Avg Per Job"
              value={data.monthJobs > 0 ? fmt(avgPerJob) : '—'}
              sub="this month"
            />
          </div>

          {/* Upcoming jobs */}
          {upcoming.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3">
                Upcoming
              </div>
              {upcoming.map((job, i) => <JobRow key={i} job={job} />)}
            </div>
          )}

          {/* Past jobs this month */}
          {pastJobs.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3">
                Completed This Month
              </div>
              {pastJobs.map((job, i) => <JobRow key={i} job={job} />)}
            </div>
          )}

          {/* Empty state */}
          {data.allJobs.length === 0 && (
            <div className="bg-card rounded-2xl border border-border p-8 text-center">
              <div className="text-4xl mb-3">🐾</div>
              <div className="text-sm text-text-muted">No jobs on the calendar this month</div>
            </div>
          )}

          {/* Rate sheet legend */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3">
              Rate Sheet
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(SERVICE_COLORS) as [string, string][]).map(([key, color]) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span>{SERVICE_ICONS[key]}</span>
                    <span className="text-xs text-text capitalize">{key}</span>
                  </div>
                  <span className="text-xs font-semibold" style={{ color }}>
                    ${ ({ overnight: '85', 'drop-in': '25', 'day sitting': '85', 'dog walk': '35' } as Record<string,string>)[key] }+
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
