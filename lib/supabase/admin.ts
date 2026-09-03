import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Client "service role" : contourne les policies RLS (accès complet toutes
// agences confondues). Réservé aux contextes sans session utilisateur —
// aujourd'hui uniquement le webhook Meta (app/api/webhooks/meta), qui reçoit
// des événements serveur-à-serveur sans aucun cookie. Ne jamais l'utiliser
// dans un Server Component, une Server Action ou une route appelée depuis le
// navigateur : createClient() (lib/supabase/server.ts), qui respecte les
// policies RLS via la session de l'utilisateur connecté, reste la bonne
// option partout ailleurs.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante (à ajouter dans les variables d’environnement).')
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}