// Modules optionnels, vendus en plus d'un palier plutôt qu'inclus dedans
// (voir migration 058). Activés au cas par cas depuis /dashboard/admin,
// jamais en libre-service — voir deploy-notes/rive-commercialisation-
// grille-tarifaire.md.
//
// - investissement (50€/mois) : tableau Investisseurs France +
//   /dashboard/investments. Vendu comme up-sell.
// - whatsapp : alertes WhatsApp (Réglages > WhatsApp + envois réels, voir
//   lib/rive/whatsapp-notify.ts). Pas de communication officielle ni de
//   prix affiché pour l'instant — réservé à Hevrest, activable au cas par
//   cas pour un client si Maxime en parle à l'oral (décision de Maxime :
//   pas d'offre publique sur ce module pour le moment).
import type { SupabaseClient } from '@supabase/supabase-js'

export const AGENCY_MODULES = ['investissement', 'whatsapp'] as const
export type AgencyModule = (typeof AGENCY_MODULES)[number]

export const MODULE_LABELS: Record<AgencyModule, string> = {
  investissement: 'Investissement',
  whatsapp: 'WhatsApp',
}

// Prix affiché pour un module vendu publiquement — absent pour un module
// qui n'a pas de tarif communiqué (ex. whatsapp, activé au cas par cas sans
// grille tarifaire officielle pour l'instant).
export const MODULE_PRICE_CENTS: Partial<Record<AgencyModule, number>> = {
  investissement: 5000,
}

export function isAgencyModule(value: string): value is AgencyModule {
  return (AGENCY_MODULES as readonly string[]).includes(value)
}

// Version de hasModule (voir lib/rive/access.ts) utilisable hors contexte
// de session utilisateur — crons, webhooks, tout appelant qui a déjà un
// agencyId et un client Supabase (service role ou non) sous la main, sans
// passer par getAccessContext() qui suppose un utilisateur connecté.
export async function agencyHasModule(
  supabase: SupabaseClient,
  agencyId: string,
  moduleKey: AgencyModule
): Promise<boolean> {
  const { data: agency } = await supabase
    .from('agencies')
    .select('plan, enabled_modules')
    .eq('id', agencyId)
    .maybeSingle()
  if (!agency) return false
  if (agency.plan === 'interne') return true
  return ((agency.enabled_modules ?? []) as string[]).includes(moduleKey)
}