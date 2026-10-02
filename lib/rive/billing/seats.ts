// Synchronise la facturation Stripe d'une agence avec son effectif réel de
// postes occupés. Toujours en best-effort (jamais attendue de façon
// bloquante par l'appelant, jamais laissée faire échouer une action métier
// — même principe que recordUsage, voir usage.ts) : si Stripe échoue,
// l'écart sera corrigé au prochain appel plutôt que de bloquer un retrait/
// ajout de coéquipier pour un problème de facturation.
//
// Appelée après toute variation d'effectif réelle :
// - acceptation d'une invitation (app/actions/auth.ts, signup)
// - retrait d'un membre (app/actions/team.ts, removeTeamMember)
// - changement de palier fait depuis le portail Stripe, qui peut changer le
//   nombre de postes inclus sans changer l'effectif (app/api/stripe/
//   webhook/route.ts)
//
// Ne fait rien pour une agence sans abonnement Stripe actif (encore en
// essai, ou jamais passée en payant) — rien à proratiser tant qu'il n'y a
// pas d'abonnement.
import type { SupabaseClient } from '@supabase/supabase-js'
import { billableExtraSeats } from './plans'
import { updateSubscriptionExtraSeats } from './stripe'

export async function seatCountForAgency(supabase: SupabaseClient, agencyId: string): Promise<number> {
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
  return count ?? 0
}

export async function syncAgencySeats(supabase: SupabaseClient, agencyId: string): Promise<void> {
  try {
    const { data: agency } = await supabase
      .from('agencies')
      .select('plan, stripe_subscription_id')
      .eq('id', agencyId)
      .maybeSingle()

    if (!agency?.stripe_subscription_id) return

    const seatCount = await seatCountForAgency(supabase, agencyId)
    const extraSeats = billableExtraSeats(agency.plan, seatCount)
    await updateSubscriptionExtraSeats(agency.stripe_subscription_id, extraSeats)
  } catch (err) {
    console.error('[billing] Échec de la synchronisation des postes facturés :', err)
  }
}