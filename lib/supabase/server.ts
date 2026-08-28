import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Client Supabase utilisable dans les Server Components, Server Actions et Route Handlers.
// Un nouveau client est créé à chaque appel (recommandation Supabase) : ne jamais le
// réutiliser d'une requête à l'autre.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll appelé depuis un Server Component : sans effet si le proxy
            // (proxy.ts) rafraîchit déjà la session à chaque requête. Sans danger.
          }
        },
      },
    }
  )
}
