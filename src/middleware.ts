import { NextResponse, type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isProtected = pathname === '/dashboard' || pathname.startsWith('/dashboard/')
  const isSignIn = pathname === '/sign-in'

  // Protect everything under /dashboard.
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Signed-in users should not land on the sign-in page.
  if (isSignIn && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/sign-in'],
}
