'use client'

import { useState, useMemo, useEffect } from 'react'
import type { DashboardView } from '@/types'

interface CenterColumnProps {
  onNavigate: (view: DashboardView) => void
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
    // Use a stable initial value for SSR, update on mount
    return new Date(2000, 0, 1)
  })
  const [mounted, setMounted] = useState(false)
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  useEffect(() => {
    const now = new Date()
    setToday(now)
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
    setMounted(true)
  }, [])

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth)
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
    const daysInPrevMonth = getDaysInMonth(viewYear, viewMonth - 1)

    const days: { day: number; currentMonth: boolean; isToday: boolean; isPast: boolean }[] = []

    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        currentMonth: false,
        isToday: false,
        isPast: true,
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

      days.push({ day: d, currentMonth: true, isToday, isPast: isPast && !isToday })
    }

    // Next month leading days to fill the grid (6 rows × 7 = 42)
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      days.push({ day: d, currentMonth: false, isToday: false, isPast: false })
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
        {calendarDays.map((cell, i) => (
          <button
            key={i}
            onClick={() => {
              if (cell.currentMonth) onNavigate('day')
            }}
            className={`
              relative flex flex-col items-center justify-start pt-1.5 rounded-lg text-sm transition-all
              ${cell.currentMonth ? 'hover:bg-card-alt cursor-pointer' : 'opacity-30 cursor-default'}
              ${cell.isPast && cell.currentMonth ? 'bg-past-day-bg/50' : ''}
              ${cell.isToday ? 'ring-2 ring-today-border font-bold' : ''}
            `}
          >
            <span
              className={`
                w-7 h-7 flex items-center justify-center rounded-full text-xs
                ${cell.isToday ? 'bg-accent text-white font-bold' : 'text-text'}
                ${!cell.currentMonth ? 'text-text-muted' : ''}
              `}
            >
              {cell.day}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
