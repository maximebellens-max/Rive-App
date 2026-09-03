import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { buildOAuthUrl } from '@/lib/rive/meta'

// Point de départ du "Connecter mon compte Meta" des réglages : vérifie la
// session, pose un jeton anti-CSRF dans un cookie de courte durée, puis
// redirige vers la fenêtre d'autorisation Meta. Le callback (../callback)
// vérifiera que le state renvoyé par Meta correspond à ce cookie.
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL))

  const state = randomUUID()
  const response = NextResponse.redirect(buildOAuthUrl(state))
  response.cookies.set('meta_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return response
}