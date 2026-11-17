'use client'

import { useState, useMemo, useEffect } from 'react'
import type { DashboardView, CalendarEvent } from '@/types'
import { lifeAreaColors } from '@/config/theme'

interface CenterColumnProps {
  onNavigate: (view: DashboardView, date?: Date) => void
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function CenterColumn({ onNavigate }: CenterColumnProps) {
  const [today, setToday] = useState(() => {
    return new Date(2000, 0, 1)
  })
  const [mounted, setMounted] = useState(false)
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [eventsByDate, setEventsByDate] = useState<Record<string, CalendarEvent[]>>({})
  const [fetchKey, setFetchKey] = useState(0)

  useEffect(() => {
    const now = new Date()
    setToday(now)
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
    setMounted(true)
  }, [])

  // Fetch events and build date→events map; re-runs when fetchKey changes
  useEffect(() => {
    const bust = fetchKey > 0 ? `?bust=${fetchKey}` : ''
    fetch(`/api/google-calendar${bust}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.events) return
        const map: Record<string, CalendarEvent[]> = {}
        for (const event of data.events as CalendarEvent[]) {
          const dateKey = event.start_at.slice(0, 10)
          if (!map[dateKey]) map[dateKey] = []
          map[dateKey].push(event)
        }
        setEventsByDate(map)
      })
      .catch(() => {/* silent fail */})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey])

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth)
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
    const daysInPrevMonth = getDaysInMonth(viewYear, viewMonth - 1)

    const days: { day: number; currentMonth: boolean; isToday: boolean; isPast: boolean; date: Date | null }[] = []

    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        currentMonth: false,
        isToday: false,
        isPast: true,
        date: null,
      })
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d)
      const isToday =
        d === today.getDate() &&
        viewMonth === today.getMonth() &&
        viewYear === today.getFullYear()
      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate())

      days.push({ day: d, currentMonth: true, isToday, isPast: isPast && !isToday, date })
    }

    // Next month leading days to fill the grid (6 rows × 7 = 42)
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      days.push({ day: d, currentMonth: false, isToday: false, isPast: false, date: null })
    }

    return days
  }, [viewYear, viewMonth, today])

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const goToToday = () => {
    setViewMonth(today.getMonth())
    setViewYear(today.getFullYear())
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 h-full flex flex-col">
      {/* Month Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-text">{monthLabel}</h2>
          <button
            onClick={goToToday}
            className="text-[10px] font-semibold text-accent hover:text-accent-dark px-2 py-0.5 rounded border border-accent/30 hover:border-accent transition-colors"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFetchKey(k => k + 1)}
            title="Refresh calendar"
            className="w-7 h-7 rounded-lg hover:bg-card-alt flex items-center justify-center text-text-muted hover:text-text transition-colors text-sm"
          >
            ↻
          </button>
          <button
            onClick={prevMonth}
            className="w-7 h-7 rounded-lg hover:bg-card-alt flex items-center justify-center text-text-muted hover:text-text transition-colors"
          >
            ‹
          </button>
          <button
            onClick={nextMonth}
            className="w-7 h-7 rounded-lg hover:bg-card-alt flex items-center justify-center text-text-muted hover:text-text transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="text-center text-[10px] font-bold text-text-muted uppercase tracking-wider py-1"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 flex-1 gap-px">
        {calendarDays.map((cell, i) => {
          const dateKey = cell.date
            ? `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, '0')}-${String(cell.date.getDate()).padStart(2, '0')}`
            : null
          const dayEvents = dateKey ? (eventsByDate[dateKey] ?? []) : []
          const visibleEvents = dayEvents.slice(0, 2)
          const overflow = dayEvents.length - visibleEvents.length

          return (
            <button
              key={i}
              onClick={() => {
                if (cell.currentMonth && cell.date) {
                  onNavigate('day', cell.date)
                }
              }}
              className={`
                relative flex flex-col items-start justify-start pt-1 px-0.5 pb-1 rounded-lg text-sm transition-all min-h-[52px]
                ${cell.currentMonth ? 'hover:bg-card-alt cursor-pointer' : 'opacity-30 cursor-default'}
                ${cell.isPast && cell.currentMonth ? 'bg-past-day-bg/70' : ''}
                ${cell.isToday ? 'ring-2 ring-today-border font-bold' : ''}
              `}
            >
              <span
                className={`
                  w-6 h-6 flex items-center justify-center rounded-full text-[11px] self-center mb-0.5
                  ${cell.isToday ? 'bg-accent text-white font-bold' : 'text-text'}
                  ${!cell.currentMonth ? 'text-text-muted' : ''}
                `}
              >
                {cell.day}
              </span>
              {/* Event pills */}
              <div className="w-full flex flex-col gap-px">
                {visibleEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="w-full truncate rounded px-1 text-[9px] font-semibold leading-tight py-px text-white"
                    style={{ backgroundColor: lifeAreaColors[ev.life_area] ?? '#6B7280' }}
                    title={ev.title}
                  >
                    {ev.title}
                  </div>
                ))}
                {overflow > 0 && (
                  <div className="text-[8px] text-text-muted font-semibold pl-1">
                    +{overflow} more
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
