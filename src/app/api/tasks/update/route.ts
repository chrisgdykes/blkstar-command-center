import { guard } from '@/lib/auth'
import { NextResponse } from 'next/server'

const TODOIST_TOKEN = process.env.TODOIST_API_TOKEN

// PATCH /api/tasks/update — set a task's due date
export async function PATCH(req: Request) {
  const denied = await guard()
  if (denied) return denied

  try {
    const { taskId, due_date } = await req.json()
    if (!taskId || !due_date) {
      return NextResponse.json({ error: 'taskId and due_date required' }, { status: 400 })
    }

    const res = await fetch(`https://api.todoist.com/api/v1/tasks/${taskId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TODOIST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ due_date }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Todoist update error:', err)
      return NextResponse.json({ error: 'Failed to update task' }, { status: res.status })
    }

    const task = await res.json()
    return NextResponse.json({ ok: true, task })
  } catch (error) {
    console.error('Todoist update error:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}
