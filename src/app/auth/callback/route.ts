import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Handles redirects from Supabase email links:
 * - Magic links (PKCE): `?code=...`
 * - Magic links (implicit flow): `?token_hash=...&type=magiclink`
 * - OAuth providers: `?code=...`
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const next = searchParams.get('next') ?? '/dashboard'

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  } else if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      type: 'magiclink',
      token_hash: tokenHash,
    })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=callback`)
}
