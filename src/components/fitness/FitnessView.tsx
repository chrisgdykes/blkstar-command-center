'use client'

// ─── Types ──────────────────────────────────────────────────────────────────

interface PersonData {
  name: string
  avatar: string
  color: string
  kcal: number
  kcalGoal: number
  minutes: number
  minGoal: number
  workoutTitle: string
  workoutSubtitle: string
  workoutLocation: string
  workoutDuration: number  // minutes
  workoutType: string
  exercises: { name: string; sets: number; reps: string }[]
  weekSessions: WeekSession[]
  weekStats: { sessions: number; totalMin: number; totalKcal: number }
}

interface WeekSession {
  day: string
  label: string
  done: boolean
  type: 'push' | 'pull' | 'legs' | 'cardio' | 'boxing' | 'fullbody' | 'recovery' | 'rest'
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_DATA: PersonData[] = [
  {
    name: 'Chris',
    avatar: 'C',
    color: '#E07C4A',
    kcal: 450,
    kcalGoal: 600,
    minutes: 45,
    minGoal: 60,
    workoutTitle: 'PUSH DAY',
    workoutSubtitle: 'Chest / Shoulder / Triceps',
    workoutLocation: 'Planet Fitness',
    workoutDuration: 60,
    workoutType: 'push',
    exercises: [
      { name: 'Chest Press Machine', sets: 3, reps: '10–12' },
      { name: 'Chest Fly Machine', sets: 3, reps: '12–15' },
      { name: 'Machine Shoulder Press', sets: 3, reps: '10–12' },
      { name: 'Lateral Raise (DB)', sets: 3, reps: '15' },
      { name: 'Cable Triceps Pushdown', sets: 3, reps: '12–15' },
    ],
    weekSessions: [
      { day: 'Mon', label: 'Push', done: true, type: 'push' },
      { day: 'Tue', label: 'Cardio', done: true, type: 'cardio' },
      { day: 'Wed', label: 'Pull', done: false, type: 'pull' },
      { day: 'Thu', label: 'Legs', done: false, type: 'legs' },
      { day: 'Fri', label: 'Boxing', done: false, type: 'boxing' },
      { day: 'Sat', label: 'Full Body', done: false, type: 'fullbody' },
      { day: 'Sun', label: 'Recovery', done: false, type: 'recovery' },
    ],
    weekStats: { sessions: 2, totalMin: 110, totalKcal: 820 },
  },
  {
    name: 'Eryn',
    avatar: 'E',
    color: '#C084FC',
    kcal: 320,
    kcalGoal: 500,
    minutes: 30,
    minGoal: 50,
    workoutTitle: 'CARDIO + CORE',
    workoutSubtitle: 'Peloton · Run · Ab Circuit',
    workoutLocation: 'Home',
    workoutDuration: 45,
    workoutType: 'cardio',
    exercises: [
      { name: 'Peloton Ride', sets: 1, reps: '20 min' },
      { name: 'Treadmill Run', sets: 1, reps: '15 min' },
      { name: 'Plank Hold', sets: 3, reps: '45 sec' },
      { name: 'Russian Twists', sets: 3, reps: '20' },
      { name: 'Leg Raises', sets: 3, reps: '12' },
    ],
    weekSessions: [
      { day: 'Mon', label: 'Cardio', done: true, type: 'cardio' },
      { day: 'Tue', label: 'Full Body', done: false, type: 'fullbody' },
      { day: 'Wed', label: 'Cardio', done: false, type: 'cardio' },
      { day: 'Thu', label: 'Full Body', done: false, type: 'fullbody' },
      { day: 'Fri', label: 'Cardio', done: false, type: 'cardio' },
      { day: 'Sat', label: 'Full Body', done: false, type: 'fullbody' },
      { day: 'Sun', label: 'Rest', done: false, type: 'rest' },
    ],
    weekStats: { sessions: 1, totalMin: 45, totalKcal: 320 },
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  push:     '#FF8C42',
  pull:     '#4AAEFF',
  legs:     '#FF5A5F',
  cardio:   '#7ED957',
  boxing:   '#FF3B30',
  fullbody: '#CF8E54',
  recovery: '#8BBCCC',
  rest:     '#555',
}

function RingProgress({ pct, color, size, stroke }: { pct: number; color: string; size: number; stroke: number }) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const cx   = size / 2
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="currentColor"
        strokeWidth={stroke} className="text-border opacity-30" />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
    </svg>
  )
}

// ─── Activity Ring Card ───────────────────────────────────────────────────────

function ActivityRingCard({ person }: { person: PersonData }) {
  const kcalPct = Math.min(100, Math.round((person.kcal / person.kcalGoal) * 100))
  const minPct  = Math.min(100, Math.round((person.minutes / person.minGoal) * 100))

  return (
    <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-6">
      {/* Ring stack */}
      <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
        <RingProgress pct={kcalPct} color={person.color} size={80} stroke={7} />
        <div className="absolute inset-0 flex items-center justify-center">
          <RingProgress pct={minPct} color={person.color} size={56} stroke={6} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-black leading-none" style={{ color: person.color }}>
            {kcalPct}%
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex-1 min-w-0">
        {/* Name + avatar row */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
            style={{ background: person.color }}>
            {person.avatar}
          </div>
          <span className="font-black text-base text-text tracking-wide">{person.name}</span>
          <span className="ml-auto text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: `${person.color}22`, color: person.color }}>
            ACTIVE
          </span>
        </div>

        {/* Stat rows */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <div>
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider leading-none mb-0.5">
              Calories
            </div>
            <div className="text-sm font-bold text-text leading-none">
              {person.kcal}
              <span className="text-xs font-normal text-text-muted ml-1">/ {person.kcalGoal} kcal</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider leading-none mb-0.5">
              Active Time
            </div>
            <div className="text-sm font-bold text-text leading-none">
              {person.minutes}
              <span className="text-xs font-normal text-text-muted ml-1">/ {person.minGoal} min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Today's Workout Card ─────────────────────────────────────────────────────

function TodayWorkoutCard({ person }: { person: PersonData }) {
  const typeColor = TYPE_COLORS[person.workoutType] ?? person.color

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
            Today&apos;s Workout
          </div>
          <div className="text-base font-black text-text tracking-wide">{person.workoutTitle}</div>
          <div className="text-xs text-text-muted mt-0.5">{person.workoutSubtitle}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: `${typeColor}22`, color: typeColor }}>
            {person.workoutType.toUpperCase()}
          </span>
          <div className="text-[10px] text-text-muted">{person.workoutLocation} · {person.workoutDuration} min</div>
        </div>
      </div>

      {/* Exercises */}
      <div className="space-y-1.5">
        {person.exercises.map((ex, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
            <span className="text-sm text-text font-medium">{ex.name}</span>
            <span className="text-xs text-text-muted font-semibold tabular-nums">
              {ex.sets}×{ex.reps}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Weekly Summary Card ──────────────────────────────────────────────────────

function WeeklySummaryCard({ person }: { person: PersonData }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">This Week</div>
        <div className="text-[10px] text-text-muted">Week 46 of 52</div>
      </div>

      {/* Day dots */}
      <div className="flex gap-1.5 mb-4">
        {person.weekSessions.map((s) => (
          <div key={s.day} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all"
              style={{
                background: s.done ? `${TYPE_COLORS[s.type] ?? person.color}33` : 'var(--border)',
                color: s.done ? (TYPE_COLORS[s.type] ?? person.color) : 'var(--text-muted)',
                border: s.done ? `1px solid ${TYPE_COLORS[s.type] ?? person.color}66` : '1px solid transparent',
              }}
            >
              {s.label.slice(0, 3)}
            </div>
            <div className="text-[9px] text-text-muted uppercase font-semibold">{s.day}</div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-xl font-black text-text">{person.weekStats.sessions}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Sessions</div>
        </div>
        <div className="text-center border-x border-border">
          <div className="text-xl font-black text-text">{person.weekStats.totalMin}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Minutes</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-black text-text">{person.weekStats.totalKcal}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Kcal</div>
        </div>
      </div>
    </div>
  )
}

// ─── Person Column ────────────────────────────────────────────────────────────

function PersonColumn({ person }: { person: PersonData }) {
  return (
    <div className="flex flex-col gap-4">
      <ActivityRingCard person={person} />
      <TodayWorkoutCard person={person} />
      <WeeklySummaryCard person={person} />
    </div>
  )
}

// ─── FitnessView (main export) ────────────────────────────────────────────────

export default function FitnessView({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between pt-1 pb-3 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-accent hover:text-accent-dark transition-colors text-sm font-semibold"
        >
          <span>←</span>
          <span>Home</span>
        </button>
        <div className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
          FITNESS COMMAND CENTER
        </div>
        <div className="w-16" />
      </div>

      {/* Two-column grid — Chris | Eryn */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-5 pb-4">
          {MOCK_DATA.map((person) => (
            <PersonColumn key={person.name} person={person} />
          ))}
        </div>
      </div>
    </div>
  )
}
