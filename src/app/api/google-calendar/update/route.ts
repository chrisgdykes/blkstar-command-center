import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MVP_USER_ID = '00000000-0000-0000-0000-000000000001'

async function getValidToken(): Promise<string> {
  const { data, error } = await supabase
    .from('google_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', MVP_USER_ID)
    .single()

  if (error || !data) throw new Error('No Google token found')

  const expiresAt = new Date(data.expires_at).getTime()
  if (Date.now() < expiresAt - 60000) return data.access_token

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) throw new Error('Failed to refresh token')
  const tokens = await res.json()

  await supabase.from('google_tokens').update({
    access_token: tokens.access_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  }).eq('user_id', MVP_USER_ID)

  return tokens.access_token
}

// PATCH /api/google-calendar/update  { eventId, start, end }
export async function PATCH(req: NextRequest) {
  try {
    const { eventId, start, end } = await req.json()
    if (!eventId || !start || !end) {
      return NextResponse.json({ error: 'eventId, start, end required' }, { status: 400 })
    }

    const accessToken = await getValidToken()

    const patchBody = {
      start: { dateTime: start, timeZone: 'America/New_York' },
      end:   { dateTime: end,   timeZone: 'America/New_York' },
    }

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patchBody),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }

    const updated = await res.json()
    return NextResponse.json({ success: true, id: updated.id })
  } catch (err) {
    console.error('[google-calendar/update]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
