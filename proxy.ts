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
    // manifest.webmanifest, sw.js et offline.html (infrastructure de
    // l'appli installable, voir app/manifest.ts et public/sw.js) doivent
    // rester accessibles sans session : le navigateur les récupère parfois
    // avant toute connexion (ou en tâche de fond), et les recevoir en HTML
    // de redirection vers /login cassait silencieusement l'installation.
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}