import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { guard } from '@/lib/auth'

const MVP_USER_ID = '00000000-0000-0000-0000-000000000001'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const authError = await guard()
  if (authError) return authError

  const { title, start, end, allDay } = await request.json()

  if (!title || !start) {
    return NextResponse.json({ error: 'title and start are required' }, { status: 400 })
  }

  // Fetch the stored token
  const { data: tokenRow } = await supabase
    .from('google_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', MVP_USER_ID)
    .single()

  if (!tokenRow) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 401 })
  }

  let accessToken = tokenRow.access_token

  // Refresh if expired
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) <= new Date()) {
    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: tokenRow.refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    const refreshData = await refreshRes.json()
    if (!refreshData.access_token) {
      return NextResponse.json({ error: 'Failed to refresh token' }, { status: 401 })
    }
    accessToken = refreshData.access_token
    const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
    await supabase.from('google_tokens').update({
      access_token: accessToken,
      expires_at: expiresAt,
    }).eq('user_id', MVP_USER_ID)
  }

  // Build the event body
  const eventBody: Record<string, unknown> = {
    summary: title,
  }

  if (allDay) {
    // All-day events use date format YYYY-MM-DD
    const dateStr = start.split('T')[0]
    const endDateStr = end ? end.split('T')[0] : dateStr
    eventBody.start = { date: dateStr }
    eventBody.end = { date: endDateStr }
  } else {
    eventBody.start = { dateTime: start, timeZone: 'America/New_York' }
    eventBody.end = { dateTime: end || start, timeZone: 'America/New_York' }
  }

  const gcalRes = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    }
  )

  if (!gcalRes.ok) {
    const err = await gcalRes.json()
    console.error('Google Calendar create error:', err)
    return NextResponse.json({ error: 'Failed to create event', details: err }, { status: 500 })
  }

  const created = await gcalRes.json()
  return NextResponse.json({ success: true, id: created.id })
}
