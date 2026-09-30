// Compteur d'usage mensuel par agence — pose la mécanique de suivi avant
// qu'un vrai palier limité existe (voir plans.ts). Suit aujourd'hui les 2
// ressources partagées/coûteuses identifiées lors de l'audit multi-agence :
// les générations IA (Claude) et les envois WhatsApp. Aucune limite n'est
// encore appliquée (Hevrest est sur le palier 'interne', jamais limité) —
// canUseAI existe pour que le jour où une agence est sur un palier limité,
// il suffise de l'appeler avant l'appel à Claude, sans rien reconstruire.
import type { SupabaseClient } from '@supabase/supabase-js'
import { planFor } from './plans'

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7) // 'YYYY-MM'
}

type UsageKind = 'ai' | 'whatsapp'

const COLUMN_BY_KIND: Record<UsageKind, 'ai_generations_count' | 'whatsapp_messages_count'> = {
  ai: 'ai_generations_count',
  whatsapp: 'whatsapp_messages_count',
}

// Incrémente le compteur du mois en cours pour une agence. Toujours appelée
// en best-effort (jamais attendue de façon bloquante par l'appelant, jamais
// laissée faire échouer la fonctionnalité IA/WhatsApp elle-même si
// l'écriture rate) — nécessite le client admin (service role), la table
// n'accepte pas d'écriture authentifiée classique (voir migration 057).
export async function recordUsage(supabase: SupabaseClient, agencyId: string, kind: UsageKind): Promise<void> {
  try {
    const month = currentMonth()
    const column = COLUMN_BY_KIND[kind]

    const { data: existing } = await supabase
      .from('usage_counters')
      .select('id, ai_generations_count, whatsapp_messages_count')
      .eq('agency_id', agencyId)
      .eq('month', month)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('usage_counters')
        .update({ [column]: (existing[column] ?? 0) + 1, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase.from('usage_counters').insert({ agency_id: agencyId, month, [column]: 1 })
    }
  } catch (err) {
    console.error('[billing] Échec de l’enregistrement d’usage :', err)
  }
}

// Vrai si l'agence peut encore générer un texte IA ce mois-ci selon son
// palier. Toujours vrai pour un palier sans plafond (interne/agence
// aujourd'hui) — n'a d'effet concret que le jour où une agence est
// réellement sur un palier limité (solo/équipe).
export async function canUseAI(supabase: SupabaseClient, agencyId: string): Promise<boolean> {
  const { data: agency } = await supabase.from('agencies').select('plan').eq('id', agencyId).maybeSingle()
  const plan = planFor(agency?.plan)
  if (plan.aiMonthlyLimit === null) return true

  const { data: usage } = await supabase
    .from('usage_counters')
    .select('ai_generations_count')
    .eq('agency_id', agencyId)
    .eq('month', currentMonth())
    .maybeSingle()

  return (usage?.ai_generations_count ?? 0) < plan.aiMonthlyLimit
}