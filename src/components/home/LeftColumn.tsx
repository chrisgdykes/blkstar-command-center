'use client'

import { useState, useEffect } from 'react'
import type { DashboardView, CalendarEvent } from '@/types'
import { lifeAreaColors } from '@/config/theme'

interface LeftColumnProps {
  onNavigate: (view: DashboardView) => void
}

// Mock data — will be replaced with Todoist API + Calendar API
const mockTasks = {
  due_today: 5,
  due_tomorrow: 3,
  total: 14,
  completed: 2,
}

function getMockAgenda(): CalendarEvent[] {
  const now = Date.now()
  return [
    {
      id: '1',
      title: 'Morning Standup',
      life_area: 'business',
      event_type: 'meeting',
      start_at: new Date(now).toISOString(),
      end_at: new Date(now + 30 * 60000).toISOString(),
      all_day: false,
      status: 'scheduled',
      source: 'google',
    },
    {
      id: '2',
      title: 'Vet Appointment — Rover',
      life_area: 'pet_care',
      event_type: 'appointment',
      start_at: new Date(now + 2 * 3600000).toISOString(),
      end_at: new Date(now + 3 * 3600000).toISOString(),
      all_day: false,
      status: 'confirmed',
      source: 'google',
    },
    {
      id: '3',
      title: 'Gym — Upper Body',
      life_area: 'fitness',
      event_type: 'routine',
      start_at: new Date(now + 5 * 3600000).toISOString(),
      end_at: new Date(now + 6 * 3600000).toISOString(),
      all_day: false,
      status: 'scheduled',
      source: 'manual',
    },
    {
      id: '4',
      title: 'Meal Prep — Week Ahead',
      life_area: 'nutrition',
      event_type: 'task',
      start_at: new Date(now + 7 * 3600000).toISOString(),
      end_at: new Date(now + 8 * 3600000).toISOString(),
      all_day: false,
      status: 'scheduled',
      source: 'manual',
    },
  ]
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function LeftColumn({ onNavigate }: LeftColumnProps) {
  const [agenda, setAgenda] = useState<CalendarEvent[]>([])

  useEffect(() => {
    setAgenda(getMockAgenda())
  }, [])

  return (
    <>
      {/* Tasks Overview Card */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Tasks
          </h2>
          <span className="text-xs text-accent font-semibold">
            {mockTasks.completed}/{mockTasks.due_today} done
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-card-alt rounded-lg p-2.5 text-center">
            <div className="text-2xl font-bold text-text">{mockTasks.due_today}</div>
            <div className="text-[10px] text-text-muted font-medium">Due Today</div>
          </div>
          <div className="bg-card-alt rounded-lg p-2.5 text-center">
            <div className="text-2xl font-bold text-text">{mockTasks.due_tomorrow}</div>
            <div className="text-[10px] text-text-muted font-medium">Tomorrow</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-card-alt rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${(mockTasks.completed / mockTasks.due_today) * 100}%` }}
          />
        </div>
      </div>

      {/* Today's Agenda */}
      <div className="bg-card rounded-xl border border-border p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Today&apos;s Agenda
          </h2>
          <button
            onClick={() => onNavigate('day')}
            className="text-[10px] text-accent font-semibold hover:text-accent-dark transition-colors"
          >
            View Full Agenda →
          </button>
        </div>

        <div className="flex-1 overflow-y-auto agenda-scroll space-y-2">
          {agenda.map((event) => (
            <div
              key={event.id}
              className="flex gap-2.5 p-2 rounded-lg hover:bg-card-alt transition-colors cursor-pointer"
              onClick={() => onNavigate('day')}
            >
              {/* Life Area color bar */}
              <div
                className="w-1 rounded-full shrink-0 mt-0.5"
                style={{
                  backgroundColor: lifeAreaColors[event.life_area] || '#9CA3AF',
                  height: '100%',
                  minHeight: '32px',
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text truncate">
                  {event.title}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  {formatEventTime(event.start_at)} – {formatEventTime(event.end_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
