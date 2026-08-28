import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rafraîchit le token de session Supabase à chaque requête et protège les routes
// privées. Appelé depuis proxy.ts (voir la doc Next.js 16 : "middleware" a été
// renommé "proxy", mais le rôle est identique).
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT : ne rien exécuter entre createServerClient et getUser().
  // Une erreur ici peut déconnecter des utilisateurs de façon aléatoire.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAuthRoute = path === '/login' || path === '/signup'
  // /auth/* (ex: /auth/confirm) doit rester accessible sans session : c'est justement
  // la route qui crée la session après un clic sur le lien de confirmation par email.
  const isPublicRoute = path === '/' || isAuthRoute || path.startsWith('/auth/')

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
