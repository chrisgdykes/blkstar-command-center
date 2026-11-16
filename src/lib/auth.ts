import { NextResponse } from 'next/server'
import { serverAuthClient } from '@/lib/supabase/server'

// Single-user app: only emails listed in ALLOWED_EMAILS (comma-separated) get in.
// Fails closed — if the variable is unset or empty, nobody is allowed.
export function isAllowedEmail(email?: string | null): boolean {
  const list = (process.env.ALLOWED_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  return !!email && list.includes(email.toLowerCase())
}

// Defense in depth for API routes (the proxy already gates every request).
// Usage:  const denied = await guard(); if (denied) return denied
export async function guard(): Promise<NextResponse | null> {
  const sb = await serverAuthClient()
  const { data } = await sb.auth.getUser()
  if (!data.user || !isAllowedEmail(data.user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
