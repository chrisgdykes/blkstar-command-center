'use client'

import type { DashboardView } from '@/types'

interface FooterProps {
  onNavigate: (view: DashboardView, date?: Date) => void
}

// SVG circular progress ring
function RingProgress({
  pct,
  color,
  size = 44,
  stroke = 4,
}: {
  pct: number
  color: string
  size?: number
  stroke?: number
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const cx = size / 2
  return (
    <svg width={size} height={size} className="-rotate-90">
      {/* Track */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-border opacity-40" />
      {/* Progress */}
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
}

interface PersonRing {
  name: string
  kcal: number
  kcalGoal: number
  minutes: number
  minGoal: number
  color: string
}

function FitnessRing({ person }: { person: PersonRing }) {
  const kcalPct = Math.min(100, Math.round((person.kcal / person.kcalGoal) * 100))
  const minPct  = Math.min(100, Math.round((person.minutes / person.minGoal) * 100))
  return (
    <div className="flex flex-col items-center gap-0.5">
      {/* Stacked rings: outer = kcal, inner = minutes */}
      <div className="relative" style={{ width: 44, height: 44 }}>
        <RingProgress pct={kcalPct} color={person.color} size={44} stroke={4} />
        <div className="absolute inset-0 flex items-center justify-center">
          <RingProgress pct={minPct} color={person.color} size={30} stroke={3.5} />
        </div>
        {/* Center percentage */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[8px] font-bold" style={{ color: person.color }}>
            {kcalPct}%
          </span>
        </div>
      </div>
      {/* Name */}
      <div className="text-[9px] font-semibold text-text-muted uppercase tracking-wider leading-none">
        {person.name}
      </div>
      {/* Stats */}
      <div className="text-[8px] text-text-muted leading-none">{person.kcal} kcal</div>
      <div className="text-[8px] text-text-muted leading-none">{person.minutes} min</div>
    </div>
  )
}

// Mock fitness data — replace with /api/fitness once endpoint exists
const FITNESS_DATA: PersonRing[] = [
  {
    name: 'Chris',
    kcal: 450,
    kcalGoal: 600,
    minutes: 45,
    minGoal: 60,
    color: '#22c55e', // green-500
  },
  {
    name: 'Eryn',
    kcal: 320,
    kcalGoal: 500,
    minutes: 30,
    minGoal: 50,
    color: '#a855f7', // purple-500
  },
]

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="shrink-0 px-5 pb-3 pt-2">
      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr 1fr 1.4fr 1fr 1fr' }}>

        {/* Income & Expenses */}
        <button
          onClick={() => onNavigate('finance')}
          className="bg-card rounded-xl border border-border px-3 py-2.5 text-left transition-all hover:border-accent hover:shadow-sm cursor-pointer"
        >
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
            Income &amp; Expenses
          </div>
          <div className="text-lg font-bold text-text leading-tight">$—</div>
          <div className="text-[10px] text-text-muted mt-0.5">This month</div>
        </button>

        {/* Accounts */}
        <button
          onClick={() => onNavigate('finance')}
          className="bg-card rounded-xl border border-border px-3 py-2.5 text-left transition-all hover:border-accent hover:shadow-sm cursor-pointer"
        >
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
            Accounts
          </div>
          <div className="text-lg font-bold text-text leading-tight">$—</div>
          <div className="text-[10px] text-text-muted mt-0.5">Total balance</div>
        </button>

        {/* Net Worth */}
        <button
          onClick={() => onNavigate('finance')}
          className="bg-card rounded-xl border border-border px-3 py-2.5 text-left transition-all hover:border-accent hover:shadow-sm cursor-pointer"
        >
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
            Total Net Worth
          </div>
          <div className="text-lg font-bold text-text leading-tight">$—</div>
          <div className="text-[10px] text-text-muted mt-0.5">Updated today</div>
        </button>

        {/* FITNESS — dual person rings */}
        <button
          onClick={() => onNavigate('fitness')}
          className="bg-card rounded-xl border border-border px-3 py-2 text-left transition-all hover:border-accent hover:shadow-sm cursor-pointer"
        >
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
            Fitness
          </div>
          <div className="flex justify-around items-end">
            {FITNESS_DATA.map((p) => (
              <FitnessRing key={p.name} person={p} />
            ))}
          </div>
        </button>

        {/* Rover */}
        <button className="bg-card rounded-xl border border-border px-3 py-2.5 text-left cursor-default">
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
            Rover
          </div>
          <div className="text-lg font-bold text-text leading-tight">🐕</div>
          <div className="text-[10px] text-text-muted mt-0.5">Next walk TBD</div>
        </button>

        {/* Open Time */}
        <button className="bg-card rounded-xl border border-border px-3 py-2.5 text-left cursor-default">
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
            Open Time
          </div>
          <div className="text-lg font-bold text-text leading-tight">—h</div>
          <div className="text-[10px] text-text-muted mt-0.5">Available today</div>
        </button>

      </div>
    </footer>
  )
}
