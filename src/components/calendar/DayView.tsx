'use client'

import { useState, useEffect } from 'react'
import type { CalendarEvent } from '@/types'
import { lifeAreaColors } from '@/config/theme'

interface DayViewProps {
  date: Date
  onBack: () => void
  onDateChange: (date: Date) => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatDateHeader(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function isoDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 6am–11pm

export default function DayView({ date, onBack, onDateChange }: DayViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newEvent, setNewEvent] = useState({ title: '', start: '09:00', end: '10:00', allDay: false })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch('/api/google-calendar')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.events) {
          const dateStr = isoDate(date)
          const dayEvents = data.events.filter((e: CalendarEvent) => {
            const start = e.start_at.split('T')[0]
            return start === dateStr
          }).sort((a: CalendarEvent, b: CalendarEvent) =>
            new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
          )
          setEvents(dayEvents)
        }
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [date])

  const prevDay = () => {
    const d = new Date(date)
    d.setDate(d.getDate() - 1)
    onDateChange(d)
  }

  const nextDay = () => {
    const d = new Date(date)
    d.setDate(d.getDate() + 1)
    onDateChange(d)
  }

  const goToday = () => onDateChange(new Date())

  function getEventStyle(event: CalendarEvent) {
    if (event.all_day) return null
    const start = new Date(event.start_at)
    const end = new Date(event.end_at)
    const startMin = start.getHours() * 60 + start.getMinutes()
    const endMin = end.getHours() * 60 + end.getMinutes()
    const gridStart = 6 * 60
    const gridEnd = 23 * 60
    const topPct = ((startMin - gridStart) / (gridEnd - gridStart)) * 100
    const heightPct = ((endMin - startMin) / (gridEnd - gridStart)) * 100
    return { top: `${Math.max(0, topPct)}%`, height: `${Math.max(2, heightPct)}%` }
  }

  const allDayEvents = events.filter(e => e.all_day)
  const timedEvents = events.filter(e => !e.all_day)

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg('')
    const dateStr = isoDate(date)
    const start = newEvent.allDay ? dateStr : `${dateStr}T${newEvent.start}:00`
    const end = newEvent.allDay ? dateStr : `${dateStr}T${newEvent.end}:00`
    try {
      const res = await fetch('/api/google-calendar/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newEvent.title, start, end, allDay: newEvent.allDay }),
      })
      if (res.ok) {
        setSaveMsg('Event added!')
        setShowAddModal(false)
        setNewEvent({ title: '', start: '09:00', end: '10:00', allDay: false })
        setTimeout(() => {
          fetch('/api/google-calendar')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data?.events) {
                const dateStr2 = isoDate(date)
                setEvents(data.events.filter((ev: CalendarEvent) => ev.start_at.split('T')[0] === dateStr2))
              }
            })
        }, 500)
      } else {
        setSaveMsg('Failed to add event.')
      }
    } catch {
      setSaveMsg('Error adding event.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between py-3 px-1 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-accent text-sm font-medium hover:text-accent-dark transition-colors">
            ← Home
          </button>
          <div className="flex items-center gap-2">
            <button onClick={prevDay} className="w-7 h-7 rounded-lg hover:bg-card flex items-center justify-center text-text-muted hover:text-text transition-colors text-lg">‹</button>
            <h2 className="text-lg font-bold text-text">{formatDateHeader(date)}</h2>
            <button onClick={nextDay} className="w-7 h-7 rounded-lg hover:bg-card flex items-center justify-center text-text-muted hover:text-text transition-colors text-lg">›</button>
          </div>
          <button onClick={goToday} className="text-[10px] font-semibold text-accent hover:text-accent-dark px-2 py-0.5 rounded border border-accent/30 hover:border-accent transition-colors">Today</button>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-accent text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-accent-dark transition-colors"
        >
          + Add Event
        </button>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="px-1 pb-2 shrink-0">
          <div className="bg-card rounded-lg p-2 flex flex-wrap gap-2">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider self-center mr-1">All day</span>
            {allDayEvents.map(e => (
              <span key={e.id} className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: lifeAreaColors[e.life_area] || '#9CA3AF' }}>
                {e.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {saveMsg && (
        <div className="px-1 pb-2 shrink-0">
          <div className="bg-card rounded-lg p-2 text-xs text-accent font-medium">{saveMsg}</div>
        </div>
      )}

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-text-muted text-sm">Loading…</div>
        ) : (
          <div className="relative" style={{ minHeight: `${HOURS.length * 60}px` }}>
            {HOURS.map(h => (
              <div key={h} className="absolute w-full border-t border-border/40" style={{ top: `${((h - 6) / 17) * 100}%` }}>
                <span className="text-[10px] text-text-muted pl-2 select-none">
                  {h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`}
                </span>
              </div>
            ))}

            <div className="absolute left-14 right-2 top-0 bottom-0">
              {timedEvents.length === 0 && (
                <div className="flex items-center justify-center h-full text-text-muted text-sm">No events this day</div>
              )}
              {timedEvents.map(event => {
                const style = getEventStyle(event)
                if (!style) return null
                return (
                  <div
                    key={event.id}
                    className="absolute left-0 right-0 rounded-lg px-2 py-1 overflow-hidden cursor-pointer hover:brightness-110 transition-all"
                    style={{
                      ...style,
                      backgroundColor: lifeAreaColors[event.life_area] || '#9CA3AF',
                      opacity: 0.9,
                    }}
                  >
                    <div className="text-white text-xs font-semibold truncate">{event.title}</div>
                    <div className="text-white/80 text-[10px]">
                      {formatTime(event.start_at)} – {formatTime(event.end_at)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-text mb-4">Add Event</h3>
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
                <input
                  type="checkbox"
                  id="allDay"
                  checked={newEvent.allDay}
                  onChange={e => setNewEvent(p => ({ ...p, allDay: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="allDay" className="text-sm text-text">All day</label>
              </div>
              {!newEvent.allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">Start</label>
                    <input
                      type="time"
                      value={newEvent.start}
                      onChange={e => setNewEvent(p => ({ ...p, start: e.target.value }))}
                      className="w-full bg-card-alt border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">End</label>
                    <input
                      type="time"
                      value={newEvent.end}
                      onChange={e => setNewEvent(p => ({ ...p, end: e.target.value }))}
                      className="w-full bg-card-alt border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-card-alt text-text-muted text-sm font-semibold py-2 rounded-lg hover:text-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-accent text-white text-sm font-semibold py-2 rounded-lg hover:bg-accent-dark transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
