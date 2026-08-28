import type { EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Route appelée par le lien de confirmation envoyé par email (voir le template
// "Confirm signup" dans le dashboard Supabase, qui doit pointer vers
// {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email).
// C'est ici, côté serveur, que le token est échangé contre une vraie session.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error) {
      const redirectTo = request.nextUrl.clone()
      redirectTo.pathname = next
      redirectTo.search = ''
      return NextResponse.redirect(redirectTo)
    }
  }

  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = '/login'
  redirectTo.search = ''
  redirectTo.searchParams.set('error', 'confirmation-failed')
  return NextResponse.redirect(redirectTo)
}
