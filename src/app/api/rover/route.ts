import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Config ────────────────────────────────────────────────────────────────────

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

const supabaseUrl        = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const MVP_USER_ID        = '00000000-0000-0000-0000-000000000001'

/** Exact Google Calendar name for pet sitting jobs */
const ROVER_CALENDAR_NAME = 'Pet care: Rover'

// ── Rates ─────────────────────────────────────────────────────────────────────
// Event title format: "[Service] - [Name] ([# pets])"
// e.g. "Overnight - Max (1)"  |  "Drop-in - Buddy + Luna (2)"

const BASE_RATES: Record<string, number> = {
  overnight:     85,
  'drop-in':     25,
  'day sitting': 85,
  'dog walk':    35,
}

const ADDITIONAL_PET_RATES: Record<string, number> = {
  overnight:     20,
  'drop-in':     10,
  'day sitting': 20,
  'dog walk':    10,
}

/** Parse event title → { serviceKey, petCount } */
function parseEventTitle(title: string): { serviceKey: string | null; petCount: number } {
  if (!title) return { serviceKey: null, petCount: 1 }

  const lower = title.toLowerCase()

  // Detect service type (longest match first to avoid 'drop-in' matching 'drop')
  const keys = Object.keys(BASE_RATES).sort((a, b) => b.length - a.length)
  let serviceKey: string | null = null
  for (const key of keys) {
    if (lower.startsWith(key)) { serviceKey = key; break }
  }

  // Parse pet count from trailing "(N)"
  const petMatch = title.match(/\((\d+)\)\s*$/)
  const petCount = petMatch ? parseInt(petMatch[1], 10) : 1

  return { serviceKey, petCount }
}

/** Calculate payout for one event.
 *  For multi-day events (overnights / day sitting), multiply by day count.
 */
function calcEarnings(
  serviceKey: string,
  petCount: number,
  startStr: string | undefined,
  endStr: string | undefined,
): number {
  const base  = BASE_RATES[serviceKey] ?? 0
  const extra = ADDITIONAL_PET_RATES[serviceKey] ?? 0
  const perUnit = base + Math.max(0, petCount - 1) * extra

  // Multiply overnights / day sitting by duration
  if ((serviceKey === 'overnight' || serviceKey === 'day sitting') && startStr && endStr) {
    const start = new Date(startStr)
    const end   = new Date(endStr)
    const msPerDay = 24 * 60 * 60 * 1000
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay))
    return perUnit * days
  }

  return perUnit
}

// ── Cache ─────────────────────────────────────────────────────────────────────
let cache: { data: unknown; timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 min

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data)
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Get + optionally refresh Google token
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('user_id', MVP_USER_ID)
      .single()

    if (tokenErr || !tokenRow) {
      return NextResponse.json(
        { error: 'not_connected', message: 'Google Calendar not connected.' },
        { status: 401 },
      )
    }

    let accessToken = tokenRow.access_token

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
        return NextResponse.json({ error: 'refresh_failed' }, { status: 401 })
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

    // 2. Find the Rover calendar by name
    const calListRes = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=50',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!calListRes.ok) {
      return NextResponse.json({ error: 'cal_list_failed' }, { status: 500 })
    }
    const calListData = await calListRes.json()
    const roverCal = (calListData.items || []).find(
      (c: { summary: string }) =>
        c.summary.toLowerCase() === ROVER_CALENDAR_NAME.toLowerCase(),
    )

    if (!roverCal) {
      return NextResponse.json({
        error: 'calendar_not_found',
        message: `Calendar "${ROVER_CALENDAR_NAME}" not found.`,
      }, { status: 404 })
    }

    // 3. Fetch events: start of this month → end of next month
    const now        = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59)

    const eventsRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(roverCal.id)}/events` +
      `?timeMin=${monthStart.toISOString()}&timeMax=${monthEnd.toISOString()}` +
      `&singleEvents=true&orderBy=startTime&maxResults=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!eventsRes.ok) {
      return NextResponse.json({ error: 'events_fetch_failed' }, { status: 500 })
    }
    const eventsData = await eventsRes.json()
    const events: Array<{
      summary?: string
      start?: { dateTime?: string; date?: string }
      end?:   { dateTime?: string; date?: string }
      status?: string
    }> = (eventsData.items || []).filter(
      (e: { status?: string }) => e.status !== 'cancelled',
    )

    // 4. Aggregate stats
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const todayStart     = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    let monthJobs      = 0
    let monthIncome    = 0
    let upcomingJobs   = 0
    let upcomingIncome = 0
    const nextJobList: Array<{ title: string; date: string; earnings: number }> = []

    for (const ev of events) {
      const title    = ev.summary || ''
      const startRaw = ev.start?.dateTime || ev.start?.date || ''
      const endRaw   = ev.end?.dateTime   || ev.end?.date   || ''
      const startDate = new Date(startRaw)

      const { serviceKey, petCount } = parseEventTitle(title)
      if (!serviceKey) continue // skip unrecognized events

      const earnings = calcEarnings(serviceKey, petCount, startRaw, endRaw)

      // This calendar month
      if (startDate >= thisMonthStart && startDate <= thisMonthEnd) {
        monthJobs++
        monthIncome += earnings
      }

      // From today forward
      if (startDate >= todayStart) {
        upcomingJobs++
        upcomingIncome += earnings

        if (nextJobList.length < 3) {
          nextJobList.push({
            title,
            date: startDate.toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
            }),
            earnings,
          })
        }
      }
    }

    const payload = {
      monthJobs,
      monthIncome,
      upcomingJobs,
      upcomingIncome,
      nextJob:  nextJobList[0] ?? null,
      nextJobs: nextJobList,
    }

    cache = { data: payload, timestamp: Date.now() }
    return NextResponse.json(payload)

  } catch (err) {
    console.error('Rover API error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
