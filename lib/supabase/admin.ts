import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Client "service role" : contourne les policies RLS (accès complet toutes
// agences confondues). Réservé aux contextes sans session utilisateur —
// webhooks publics identifiés par un jeton opaque (Meta, landing pages,
// ICS...) et crons Vercel, qui reçoivent des événements serveur-à-serveur
// sans aucun cookie. Chaque appelant doit filtrer lui-même par la bonne
// agency_id juste après résolution du jeton/de la boucle cron — l'admin
// client ne le fait pas à sa place. Ne jamais l'utiliser dans un Server
// Component, une Server Action ou une route appelée depuis le navigateur :
// createClient() (lib/supabase/server.ts), qui respecte les policies RLS via
// la session de l'utilisateur connecté, reste la bonne option partout
// ailleurs.
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