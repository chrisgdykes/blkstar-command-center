'use client'

import { useState, useEffect } from 'react'
import type { DashboardView, CalendarEvent, TaskStats } from '@/types'
import { lifeAreaColors } from '@/config/theme'

interface LeftColumnProps {
  onNavigate: (view: DashboardView) => void
}

// Fallback mock data — used when APIs are unreachable
const mockTasks: TaskStats = {
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
  const [tasks, setTasks] = useState<TaskStats>(mockTasks)
  const [isLive, setIsLive] = useState({ tasks: false, calendar: false })

  useEffect(() => {
    // Fetch Todoist tasks
    fetch('/api/tasks')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.stats) {
          setTasks(data.stats)
          setIsLive((prev) => ({ ...prev, tasks: true }))
        }
      })
      .catch(() => {/* keep mock */})

    // Fetch Google Calendar events
    fetch('/api/google-calendar')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.events?.length > 0) {
          // Filter to today's events and sort by start time
          const now = new Date()
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

          const todayEvents = data.events
            .filter((e: CalendarEvent) => {
              const start = new Date(e.start_at)
              return start >= todayStart && start < todayEnd
            })
            .sort((a: CalendarEvent, b: CalendarEvent) =>
              new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
            )

          setAgenda(todayEvents)
          setIsLive((prev) => ({ ...prev, calendar: true }))
        } else {
          setAgenda(getMockAgenda())
        }
      })
      .catch(() => {
        setAgenda(getMockAgenda())
      })
  }, [])

  const completionPct = tasks.due_today > 0
    ? (tasks.completed / tasks.due_today) * 100
    : 0

  return (
    <>
      {/* Tasks Overview Card */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Tasks
            {!isLive.tasks && (
              <span className="ml-1.5 text-[8px] text-text-muted/50 font-normal normal-case">
                (demo)
              </span>
            )}
          </h2>
          <span className="text-xs text-accent font-semibold">
            {tasks.completed}/{tasks.due_today} done
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-card-alt rounded-lg p-2.5 text-center">
            <div className="text-2xl font-bold text-text">{tasks.due_today}</div>
            <div className="text-[10px] text-text-muted font-medium">Due Today</div>
          </div>
          <div className="bg-card-alt rounded-lg p-2.5 text-center">
            <div className="text-2xl font-bold text-text">{tasks.due_tomorrow}</div>
            <div className="text-[10px] text-text-muted font-medium">Tomorrow</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-card-alt rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${Math.min(completionPct, 100)}%` }}
          />
        </div>
      </div>

      {/* Today's Agenda */}
      <div className="bg-card rounded-xl border border-border p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Today&apos;s Agenda
            {!isLive.calendar && (
              <span className="ml-1.5 text-[8px] text-text-muted/50 font-normal normal-case">
                (demo)
              </span>
            )}
          </h2>
          <button
            onClick={() => onNavigate('day')}
            className="text-[10px] text-accent font-semibold hover:text-accent-dark transition-colors"
          >
            View Full Agenda →
          </button>
        </div>

        <div className="flex-1 overflow-y-auto agenda-scroll space-y-2">
          {agenda.length === 0 ? (
            <div className="text-xs text-text-muted text-center py-4">
              No events today
            </div>
          ) : (
            agenda.map((event) => (
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
                    {event.all_day
                      ? 'All day'
                      : `${formatEventTime(event.start_at)} – ${formatEventTime(event.end_at)}`}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
