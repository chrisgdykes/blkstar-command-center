'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) { setError('Sign-in failed. Check your email and password.'); setBusy(false); return }
    // Full reload so the proxy sees the new session cookie.
    window.location.href = '/'
  }

  return (
    <div className="h-screen flex items-center justify-center bg-bg px-5">
      <form onSubmit={submit} className="w-full max-w-sm bg-card border border-border rounded-xl p-6 flex flex-col gap-3">
        <div className="text-center mb-2">
          <div className="text-xs font-bold tracking-[0.3em] text-text-muted uppercase">BLKSTAR</div>
          <h1 className="text-xl font-bold text-text">Command Center</h1>
        </div>
        <input type="email" required autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="bg-card-alt border border-border rounded px-3 py-2 text-sm text-text" />
        <input type="password" required autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="bg-card-alt border border-border rounded px-3 py-2 text-sm text-text" />
        {error && <p className="text-xs text-text-secondary">{error}</p>}
        <button disabled={busy} className="px-3 py-2 rounded bg-accent text-white text-sm font-semibold disabled:opacity-50">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
