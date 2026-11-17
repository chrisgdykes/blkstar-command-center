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

// DELETE /api/google-calendar/delete  { eventId: string }
export async function DELETE(req: NextRequest) {
  try {
    const { eventId } = await req.json()
    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    }

    const accessToken = await getValidToken()

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    // 204 = success (no content), 410 = already deleted — both are fine
    if (res.ok || res.status === 410 || res.status === 204) {
      return NextResponse.json({ success: true })
    }

    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  } catch (err) {
    console.error('[google-calendar/delete]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
