import { NextResponse } from 'next/server'

const TODOIST_TOKEN = process.env.TODOIST_API_TOKEN || 'c85b67688bcc6be4af55ad2d6fe18740450812c3'

// Cache tasks for 10 minutes
let cache: { data: unknown; timestamp: number } | null = null
const CACHE_TTL = 10 * 60 * 1000

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data)
  }

  try {
    const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
      headers: { Authorization: `Bearer ${TODOIST_TOKEN}` },
    })
    if (!res.ok) throw new Error(`Todoist API: ${res.status}`)
    const tasks = await res.json()

    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    const dueToday = tasks.filter(
      (t: { due?: { date: string }; is_completed: boolean }) =>
        t.due?.date === today && !t.is_completed
    )
    const dueTomorrow = tasks.filter(
      (t: { due?: { date: string }; is_completed: boolean }) =>
        t.due?.date === tomorrow && !t.is_completed
    )
    const completedToday = tasks.filter(
      (t: { due?: { date: string }; is_completed: boolean }) =>
        t.due?.date === today && t.is_completed
    )

    const result = {
      tasks: tasks
        .filter((t: { is_completed: boolean }) => !t.is_completed)
        .slice(0, 20)
        .map((t: { id: string; content: string; description?: string; due?: { date: string; datetime?: string }; priority: number }) => ({
          id: t.id,
          content: t.content,
          description: t.description,
          due: t.due,
          priority: t.priority,
        })),
      stats: {
        due_today: dueToday.length,
        due_tomorrow: dueTomorrow.length,
        total: tasks.filter((t: { is_completed: boolean }) => !t.is_completed).length,
        completed: completedToday.length,
      },
    }

    cache = { data: result, timestamp: Date.now() }
    return NextResponse.json(result)
  } catch (error) {
    console.error('Todoist API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}
