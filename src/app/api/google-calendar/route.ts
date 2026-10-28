import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cache events for 15 minutes
let cache: { data: unknown; timestamp: number } | null = null
const CACHE_TTL = 15 * 60 * 1000

const MVP_USER_ID = '00000000-0000-0000-0000-000000000001'

// GET /api/google-calendar — fetch today's + upcoming events
export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data)
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get stored tokens
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('user_id', MVP_USER_ID)
      .single()

    if (tokenErr || !tokenRow) {
      return NextResponse.json(
        { error: 'not_connected', message: 'Google Calendar not connected. Visit /api/google-calendar/auth to connect.' },
        { status: 401 }
      )
    }

    let accessToken = tokenRow.access_token

    // Refresh if expired
    if (new Date(tokenRow.expires_at) <= new Date()) {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: tokenRow.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (!refreshRes.ok) {
        return NextResponse.json(
          { error: 'refresh_failed', message: 'Token refresh failed. Re-auth at /api/google-calendar/auth' },
          { status: 401 }
        )
      }

      const refreshed = await refreshRes.json()
      accessToken = refreshed.access_token

      // Update stored token
      await supabase
        .from('google_tokens')
        .update({
          access_token: refreshed.access_token,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq('user_id', MVP_USER_ID)
    }

    // Fetch events: today through 7 days out
    const now = new Date()
    const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString()

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '50',
    })

    const eventsRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!eventsRes.ok) {
      const err = await eventsRes.text()
      console.error('Google Calendar fetch error:', err)
      return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
    }

    const eventsData = await eventsRes.json()

    const events = (eventsData.items || []).map((e: GoogleCalendarEvent) => ({
      id: e.id,
      title: e.summary || '(No title)',
      description: e.description || '',
      start_at: e.start?.dateTime || e.start?.date || '',
      end_at: e.end?.dateTime || e.end?.date || '',
      all_day: !e.start?.dateTime,
      location: e.location || '',
      status: e.status === 'confirmed' ? 'confirmed' : 'scheduled',
      source: 'google' as const,
      external_id: e.id,
      // Default life_area — will be overridden by calendar-to-life-area mapping later
      life_area: 'personal' as const,
      event_type: 'task' as const,
    }))

    const result = { events, count: events.length, fetched_at: new Date().toISOString() }
    cache = { data: result, timestamp: Date.now() }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Google Calendar API error:', error)
    return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 500 })
  }
}

interface GoogleCalendarEvent {
  id: string
  summary?: string
  description?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  location?: string
  status?: string
}
