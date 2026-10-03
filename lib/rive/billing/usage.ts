// Compteur d'usage mensuel par agence — suit les 2 ressources partagées/
// coûteuses identifiées lors de l'audit multi-agence : les générations IA
// (Claude) et les envois WhatsApp. aiUsageStatus est appelée avant chaque
// appel à Claude déclenché par un agent (voir lib/rive/anthropic.ts et
// lib/rive/assistant-agent.ts) pour bloquer réellement une agence qui a
// atteint son quota mensuel — jamais pour Hevrest ('interne', jamais
// limité) ni pour un palier dont aiMonthlyLimit est null (Agence
// aujourd'hui), ni pour les appels des automatisations (crons), qui ne
// comptent que dans ai_background_count et ne sont jamais bloqués (voir le
// paramètre `background` de generateWithClaude).
import type { SupabaseClient } from '@supabase/supabase-js'
import { planFor } from './plans'

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7) // 'YYYY-MM'
}

// 'ai' : générations déclenchées par un agent (bouton "Générer", assistant
// conversationnel) — comptées dans aiUsageStatus ci-dessous, bloquant.
// 'ai_background' : générations des automatisations (scoring de priorité,
// relances, rapport hebdomadaire, WhatsApp automatique) — suivies pour la
// visibilité du coût (voir usage-section.tsx), jamais bloquantes (voir
// lib/rive/anthropic.ts, paramètre `background`).
type UsageKind = 'ai' | 'ai_background' | 'whatsapp'

// Incrémente le compteur du mois en cours pour une agence. Toujours appelée
// en best-effort (jamais attendue de façon bloquante par l'appelant, jamais
// laissée faire échouer la fonctionnalité IA/WhatsApp elle-même si
// l'écriture rate) — passe par le RPC increment_usage_counter (migration
// 060) plutôt que d'écrire directement dans la table : marche aussi bien
// avec le client admin (crons/webhooks) qu'avec le client authentifié
// classique d'une Server Action (ex. app/actions/ai.ts), qui ne peut pas
// écrire dans usage_counters par RLS directe (voir migration 057) et ne
// doit jamais utiliser le client admin (voir lib/supabase/admin.ts).
export async function recordUsage(supabase: SupabaseClient, agencyId: string, kind: UsageKind): Promise<void> {
  const { error } = await supabase.rpc('increment_usage_counter', { p_agency_id: agencyId, p_kind: kind })
  if (error) console.error('[billing] Échec de l’enregistrement d’usage :', error)
}

// Statut du quota IA mensuel d'une agence — `used`/`limit` sont fournis même
// quand `allowed` est vrai, pour afficher "12/50" plutôt qu'un simple
// oui/non. Comme recordUsage, dégrade silencieusement en cas de souci
// Supabase (une erreur de lecture résout `agency`/`usage` à null, donc
// `planFor(undefined)` retombe sur 'interne' => `allowed: true`) : un
// problème d'infra ne doit jamais bloquer un agent, seul un quota
// réellement atteint le doit.
export async function aiUsageStatus(
  supabase: SupabaseClient,
  agencyId: string
): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  const { data: agency } = await supabase.from('agencies').select('plan').eq('id', agencyId).maybeSingle()
  const plan = planFor(agency?.plan)
  if (plan.aiMonthlyLimit === null) return { allowed: true, used: 0, limit: null }

  const { data: usage } = await supabase
    .from('usage_counters')
    .select('ai_generations_count')
    .eq('agency_id', agencyId)
    .eq('month', currentMonth())
    .maybeSingle()

  const used = usage?.ai_generations_count ?? 0
  return { allowed: used < plan.aiMonthlyLimit, used, limit: plan.aiMonthlyLimit }
}