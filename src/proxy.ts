import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isAllowedEmail } from '@/lib/auth'

// Gate for the whole app: every page and API route requires a signed-in, allow-listed user.
// Only /login is public. Sessions are refreshed here so cookies stay current.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data } = await supabase.auth.getUser()
  const ok = !!data.user && isAllowedEmail(data.user.email)
  const path = request.nextUrl.pathname

  if (path === '/login') {
    if (ok) return NextResponse.redirect(new URL('/', request.url))
    return response
  }
  if (!ok) {
    if (path.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)'],
}
