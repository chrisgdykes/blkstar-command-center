import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google-calendar/callback'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// GET /api/google-calendar/callback — handles OAuth redirect from Google
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/?gcal_error=' + error, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?gcal_error=no_code', request.url))
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('Token exchange failed:', err)
      return NextResponse.redirect(new URL('/?gcal_error=token_exchange', request.url))
    }

    const tokens = await tokenRes.json()

    // Store tokens in Supabase
    // For MVP: store with a fixed user_id since we're single-user
    // TODO: wire up proper auth when multi-user is needed
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const { error: dbError } = await supabase
      .from('google_tokens')
      .upsert(
        {
          user_id: '00000000-0000-0000-0000-000000000001', // MVP single-user placeholder
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_type: tokens.token_type || 'Bearer',
          expires_at: expiresAt,
          scope: tokens.scope,
        },
        { onConflict: 'user_id' }
      )

    if (dbError) {
      console.error('Failed to store tokens:', dbError)
      return NextResponse.redirect(new URL('/?gcal_error=db_store', request.url))
    }

    return NextResponse.redirect(new URL('/?gcal_connected=true', request.url))
  } catch (err) {
    console.error('Google Calendar callback error:', err)
    return NextResponse.redirect(new URL('/?gcal_error=unknown', request.url))
  }
}
