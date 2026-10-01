// Point d'entrée unique pour "cette agence a-t-elle le droit de faire X ?" —
// construit sur getAuthedProfile (déjà mis en cache par requête). Centralise
// deux notions décidées en 2026-10 (voir
// deploy-notes/rive-commercialisation-grille-tarifaire.md) :
//
// - "interne" (Hevrest, le seul palier jamais facturé) a accès à tout sans
//   exception — c'est à la fois le palier fondateur et celui qui sert de
//   bac à sable pour tout ce qui n'est pas encore "béton" (mandats/
//   documents juridiques, marchés Dubaï/Géorgie propres à Hevrest).
// - les modules optionnels (agencies.enabled_modules) s'ajoutent à un
//   palier payant au cas par cas, activés depuis /dashboard/admin — jamais
//   déduits automatiquement du palier Stripe.
import { getAuthedProfile } from '@/lib/supabase/session'
import { type AgencyModule } from './billing/modules'

export type AccessContext = Awaited<ReturnType<typeof getAccessContext>>

export async function getAccessContext() {
  const { supabase, user, profile } = await getAuthedProfile()

  const agency = profile?.agencies as unknown as {
    name: string
    plan: string | null
    enabled_modules: string[] | null
  } | null

  const isInterne = agency?.plan === 'interne'
  const enabledModules = new Set(agency?.enabled_modules ?? [])

  return {
    supabase,
    user,
    profile,
    isInterne,
    // Réservé à un seul profil (voir migration 058) — volontairement en
    // plus de isInterne, pas à sa place : tous les membres d'Hevrest (donc
    // Mandin aussi) sont isInterne, mais seul ce profil doit voir
    // /dashboard/admin.
    isPlatformAdmin: isInterne && Boolean(profile?.is_platform_admin),
    hasModule: (moduleKey: AgencyModule) => isInterne || enabledModules.has(moduleKey),
  }
}