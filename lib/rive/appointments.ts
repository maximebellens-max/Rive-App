import type { SupabaseClient } from '@supabase/supabase-js'

// Recalcule le "prochain rendez-vous" affiché sur le lead
// (action_label/action_date) à partir de la table appointments — ces deux
// champs restent la source lue par la priorisation IA
// (lib/rive/ai-priority.ts), l'agent de relance (lib/rive/relance-agent.ts),
// le cron WhatsApp du matin (api/cron/daily-whatsapp) et l'export ICS. Un
// lead peut désormais avoir plusieurs rendez-vous ; on choisit le plus
// proche à venir, ou à défaut le plus récent passé (pour ne pas perdre le
// signal "une action a eu lieu" quand tous les rendez-vous sont derrière
// nous).
export async function syncLeadNextAction(supabase: SupabaseClient, leadId: string, todayStr: string) {
  const { data: upcoming } = await supabase
    .from('appointments')
    .select('label, appointment_date, appointment_time')
    .eq('lead_id', leadId)
    .gte('appointment_date', todayStr)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  let next = upcoming

  if (!next) {
    const { data: past } = await supabase
      .from('appointments')
      .select('label, appointment_date, appointment_time')
      .eq('lead_id', leadId)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()
    next = past
  }

  await supabase
    .from('leads')
    .update({
      action_label: next?.label || '',
      action_date: next?.appointment_date || null,
    })
    .eq('id', leadId)
}

export function todayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}