'use client'

import { useState, useEffect } from 'react'
import type { CalendarEvent, TodoistTask } from '@/types'
import { lifeAreaColors } from '@/config/theme'

interface PlannerViewProps {
  onBack: () => void
}

function isoDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

function formatDayLabel(date: Date): { short: string; num: string; isToday: boolean } {
  const today = isoDate(new Date())
  return {
    short: date.toLocaleDateString('en-US', { weekday: 'short' }),
    num: String(date.getDate()),
    isToday: isoDate(date) === today,
  }
}

function getWeekDates(anchor: Date): Date[] {
  const start = new Date(anchor)
  const day = start.getDay()
  start.setDate(start.getDate() - day)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

const PRIORITY_COLORS: Record<number, string> = { 4: '#ef4444', 3: '#f97316', 2: '#3b82f6', 1: '#6b7280' }
const PRIORITY_LABELS: Record<number, string> = { 4: 'P1', 3: 'P2', 2: 'P3', 1: 'P4' }

export default function PlannerView({ onBack }: PlannerViewProps) {
  const [weekAnchor, setWeekAnchor] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [tasks, setTasks] = useState<TodoistTask[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForDate, setAddForDate] = useState<Date | null>(null)
  const [newEvent, setNewEvent] = useState({ title: '', start: '09:00', end: '10:00', allDay: false })
  const [saving, setSaving] = useState(false)

  const weekDates = getWeekDates(weekAnchor)

  useEffect(() => {
    setLoadingEvents(true)
    fetch('/api/google-calendar')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.events) setEvents(data.events) })
      .catch(() => {})
      .finally(() => setLoadingEvents(false))

    setLoadingTasks(true)
    fetch('/api/tasks')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.tasks) setTasks(data.tasks) })
      .catch(() => {})
      .finally(() => setLoadingTasks(false))
  }, [])

  function eventsForDate(date: Date): CalendarEvent[] {
    const ds = isoDate(date)
    return events.filter(e => e.start_at.split('T')[0] === ds)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }

  function formatTime(iso: string): string {
    if (!iso.includes('T')) return ''
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const prevWeek = () => {
    const d = new Date(weekAnchor)
    d.setDate(d.getDate() - 7)
    setWeekAnchor(d)
  }

  const nextWeek = () => {
    const d = new Date(weekAnchor)
    d.setDate(d.getDate() + 7)
    setWeekAnchor(d)
  }

  const unscheduledTasks = tasks.filter(t => !t.due?.date && !t.is_completed)
  const scheduledTasks = tasks.filter(t => t.due?.date && !t.is_completed)

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!addForDate) return
    setSaving(true)
    const dateStr = isoDate(addForDate)
    const start = newEvent.allDay ? dateStr : `${dateStr}T${newEvent.start}:00`
    const end = newEvent.allDay ? dateStr : `${dateStr}T${newEvent.end}:00`
    try {
      const res = await fetch('/api/google-calendar/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newEvent.title, start, end, allDay: newEvent.allDay }),
      })
      if (res.ok) {
        setShowAddModal(false)
        setNewEvent({ title: '', start: '09:00', end: '10:00', allDay: false })
        fetch('/api/google-calendar')
          .then(r => r.ok ? r.json() : null)
          .then(data => { if (data?.events) setEvents(data.events) })
      }
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const weekLabel = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div className="flex h-full overflow-hidden gap-4">
      <div className="w-64 shrink-0 flex flex-col gap-3 overflow-y-auto">
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
            Unscheduled Tasks
            <span className="ml-1 text-accent">{unscheduledTasks.length}</span>
          </h3>
          {loadingTasks ? (
            <div className="text-xs text-text-muted">Loading…</div>
          ) : unscheduledTasks.length === 0 ? (
            <div className="text-xs text-text-muted">All tasks have due dates</div>
          ) : (
            <div className="space-y-2">
              {unscheduledTasks.map(task => (
                <div key={task.id} className="flex items-start gap-2 p-2 bg-card-alt rounded-lg">
                  <span
                    className="text-[9px] font-bold px-1 py-0.5 rounded shrink-0 mt-0.5 text-white"
                    style={{ backgroundColor: PRIORITY_COLORS[task.priority] || '#6b7280' }}
                  >
                    {PRIORITY_LABELS[task.priority] || 'P4'}
                  </span>
                  <span className="text-xs text-text leading-tight">{task.content}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {scheduledTasks.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
              Scheduled Tasks
              <span className="ml-1 text-accent">{scheduledTasks.length}</span>
            </h3>
            <div className="space-y-2">
              {scheduledTasks.map(task => (
                <div key={task.id} className="flex items-start gap-2 p-2 bg-card-alt rounded-lg">
                  <span
                    className="text-[9px] font-bold px-1 py-0.5 rounded shrink-0 mt-0.5 text-white"
                    style={{ backgroundColor: PRIORITY_COLORS[task.priority] || '#6b7280' }}
                  >
                    {PRIORITY_LABELS[task.priority] || 'P4'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-text leading-tight">{task.content}</div>
                    {task.due?.date && (
                      <div className="text-[10px] text-text-muted mt-0.5">{task.due.date}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between py-3 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-accent text-sm font-medium hover:text-accent-dark transition-colors">← Home</button>
            <div className="flex items-center gap-2">
              <button onClick={prevWeek} className="w-7 h-7 rounded-lg hover:bg-card flex items-center justify-center text-text-muted hover:text-text transition-colors text-lg">‹</button>
              <span className="text-sm font-bold text-text">{weekLabel}</span>
              <button onClick={nextWeek} className="w-7 h-7 rounded-lg hover:bg-card flex items-center justify-center text-text-muted hover:text-text transition-colors text-lg">›</button>
            </div>
            <button
              onClick={() => setWeekAnchor(new Date())}
              className="text-[10px] font-semibold text-accent hover:text-accent-dark px-2 py-0.5 rounded border border-accent/30 hover:border-accent transition-colors"
            >
              This Week
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-7 gap-2 overflow-y-auto">
          {weekDates.map((date, i) => {
            const { short, num, isToday } = formatDayLabel(date)
            const dayEvents = eventsForDate(date)
            return (
              <div key={i} className={`flex flex-col bg-card rounded-xl border overflow-hidden ${isToday ? 'border-accent' : 'border-border'}`}>
                <div className={`flex items-center justify-between px-2 py-2 shrink-0 ${isToday ? 'bg-accent/10' : 'bg-card-alt'}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-accent' : 'text-text-muted'}`}>{short}</span>
                  <span className={`text-sm font-bold ${isToday ? 'text-accent' : 'text-text'}`}>{num}</span>
                </div>
                <div className="flex-1 p-1.5 space-y-1 overflow-y-auto">
                  {loadingEvents ? (
                    <div className="text-[10px] text-text-muted text-center py-2">…</div>
                  ) : dayEvents.length === 0 ? (
                    <div className="text-[10px] text-text-muted/50 text-center py-2">—</div>
                  ) : (
                    dayEvents.map(event => (
                      <div
                        key={event.id}
                        className="rounded px-1.5 py-1 text-white overflow-hidden"
                        style={{ backgroundColor: lifeAreaColors[event.life_area] || '#9CA3AF' }}
                      >
                        <div className="text-[10px] font-semibold truncate">{event.title}</div>
                        {!event.all_day && (
                          <div className="text-[9px] opacity-80">{formatTime(event.start_at)}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <button
                  onClick={() => { setAddForDate(date); setShowAddModal(true) }}
                  className="shrink-0 w-full text-[10px] text-text-muted hover:text-accent hover:bg-accent/5 py-1 transition-colors border-t border-border/40"
                >
                  + Add
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {showAddModal && addForDate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-text mb-1">Add Event</h3>
            <p className="text-xs text-text-muted mb-4">
              {addForDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newEvent.title}
                  onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                  className="w-full bg-card-alt border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                  placeholder="Event title"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="allDayP" checked={newEvent.allDay}
                  onChange={e => setNewEvent(p => ({ ...p, allDay: e.target.checked }))} className="rounded" />
                <label htmlFor="allDayP" className="text-sm text-text">All day</label>
              </div>
              {!newEvent.allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">Start</label>
                    <input type="time" value={newEvent.start}
                      onChange={e => setNewEvent(p => ({ ...p, start: e.target.value }))}
                      className="w-full bg-card-alt border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">End</label>
                    <input type="time" value={newEvent.end}
                      onChange={e => setNewEvent(p => ({ ...p, end: e.target.value }))}
                      className="w-full bg-card-alt border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent" />
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-card-alt text-text-muted text-sm font-semibold py-2 rounded-lg hover:text-text transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-accent text-white text-sm font-semibold py-2 rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-50">
                  {saving ? 'Saving…' : 'Add to Google Calendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
