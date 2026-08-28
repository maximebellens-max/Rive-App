import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Dans Next.js 16, "middleware.ts" a été renommé "proxy.ts" (même rôle : code
// exécuté avant le rendu de chaque route). Ici il rafraîchit la session Supabase
// et protège les routes privées (voir lib/supabase/middleware.ts).
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
