import { guard } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cache events for 2 minutes
let cache: { data: unknown; timestamp: number } | null = null
const CACHE_TTL = 2 * 60 * 1000

const MVP_USER_ID = '00000000-0000-0000-0000-000000000001'

// Map Google Calendar color IDs → life_area
// colorId 1–11 are Google's named colors; background is the hex fallback
const COLOR_ID_TO_LIFE_AREA: Record<string, string> = {
  '1':  'health',      // Tomato
  '2':  'health',      // Flamingo
  '3':  'finance',     // Tangerine
  '4':  'personal',    // Banana
  '5':  'personal',    // Sage
  '6':  'work',        // Basil
  '7':  'work',        // Peacock
  '8':  'work',        // Blueberry
  '9':  'health',      // Lavender
  '10': 'personal',    // Grape
  '11': 'personal',    // Graphite
}

// Map calendar name keywords → life_area (fallback when no colorId)
function calNameToLifeArea(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('rover') || n.includes('pet') || n.includes('dog')) return 'personal'
  if (n.includes('medical') || n.includes('health') || n.includes('dental') || n.includes('doctor')) return 'health'
  if (n.includes('work') || n.includes('client') || n.includes('sparc') || n.includes('business')) return 'work'
  if (n.includes('finance') || n.includes('money') || n.includes('bill')) return 'finance'
  if (n.includes('auto') || n.includes('car') || n.includes('vehicle')) return 'personal'
  if (n.includes('fitness') || n.includes('gym') || n.includes('workout')) return 'health'
  return 'personal'
}

interface GoogleCalendarEvent {
  id: string
  summary?: string
  description?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  location?: string
  status?: string
  colorId?: string
}

interface CalendarListEntry {
  id: string
  summary: string
  colorId?: string
  backgroundColor?: string
  selected?: boolean
  accessRole?: string
}

// GET /api/google-calendar — fetch events from ALL calendars
export async function GET() {
  const denied = await guard()
  if (denied) return denied
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

      await supabase
        .from('google_tokens')
        .update({
          access_token: refreshed.access_token,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq('user_id', MVP_USER_ID)
    }

    // Step 1: Get the list of all calendars the user has
    const calListRes = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=50',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!calListRes.ok) {
      const err = await calListRes.text()
      console.error('Calendar list fetch error:', err)
      return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
    }

    const calListData = await calListRes.json()
    const calendars: CalendarListEntry[] = (calListData.items || []).filter(
      (c: CalendarListEntry) => c.accessRole !== 'freeBusyReader'
    )

    // Step 2: Fetch events from all calendars in parallel
    const now = new Date()
    const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60).toISOString()
    const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 60).toISOString()

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '200',
    })

    const fetchPromises = calendars.map(async (cal) => {
      const calId = encodeURIComponent(cal.id)
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (!res.ok) return []
      const data = await res.json()
      const calLifeArea = cal.colorId
        ? (COLOR_ID_TO_LIFE_AREA[cal.colorId] ?? calNameToLifeArea(cal.summary))
        : calNameToLifeArea(cal.summary)

      return (data.items || []).map((e: GoogleCalendarEvent) => ({
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
        calendar_name: cal.summary,
        // Per-event colorId overrides calendar colorId
        life_area: e.colorId
          ? (COLOR_ID_TO_LIFE_AREA[e.colorId] ?? calLifeArea)
          : calLifeArea,
        event_type: 'task' as const,
      }))
    })

    const allEventArrays = await Promise.all(fetchPromises)
    const events = allEventArrays
      .flat()
      .filter(e => e.start_at) // drop events with no start time
      .sort((a, b) => a.start_at.localeCompare(b.start_at))

    const result = { events, count: events.length, fetched_at: new Date().toISOString() }
    cache = { data: result, timestamp: Date.now() }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Google Calendar API error:', error)
    return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 500 })
  }
}
