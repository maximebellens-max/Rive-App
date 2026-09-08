// Rapport hebdomadaire automatique : chaque lundi matin, une synthèse
// factuelle de la semaine écoulée (lundi précédent → dimanche) envoyée par
// WhatsApp à l'équipe — nouveaux prospects, mandats signés, ventes conclues.
// Même posture que les autres automatisations : purement informatif pour
// l'agent, aucun message envoyé à un client.
import type { SupabaseClient } from '@supabase/supabase-js'
import { claimDailyAlert } from './daily-alerts'
import { notifyTeamAlertWhatsApp } from './whatsapp-notify'
import { generateWithClaude } from './anthropic'
import { generateWeeklyReportBrief } from './ai-prompts'
import { CATEGORY_LABEL } from './pipelines'
import { formatEUR } from './mandates'

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Le cron tourne le lundi matin : la semaine à résumer est celle qui vient
// de se terminer (le lundi précédent → hier, dimanche), pas la semaine en
// cours qui n'a encore presque aucune donnée.
function previousWeekRange(today: Date): { start: string; end: string; label: string } {
  const end = new Date(today)
  end.setUTCDate(end.getUTCDate() - 1) // hier (dimanche, si le cron tourne bien le lundi)
  end.setUTCHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 6) // lundi de cette même semaine

  const label = `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
  return { start: toISODate(start), end: toISODate(end), label }
}

export async function runWeeklyReportForAgency(supabase: SupabaseClient, agencyId: string, today: Date, todayStr: string) {
  const { start, end, label } = previousWeekRange(today)
  const endExclusive = new Date(`${end}T00:00:00Z`)
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)

  const [{ data: newLeads }, { data: signedMandates }, { data: soldMandates }] = await Promise.all([
    supabase
      .from('leads')
      .select('id, category')
      .eq('agency_id', agencyId)
      .gte('created_at', `${start}T00:00:00Z`)
      .lt('created_at', toISODate(endExclusive) + 'T00:00:00Z'),
    supabase
      .from('mandates')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('is_draft', false)
      .gte('signed_date', start)
      .lte('signed_date', end),
    supabase
      .from('mandates')
      .select('id, price')
      .eq('agency_id', agencyId)
      .eq('stage', 'vendu')
      .gte('sold_date', start)
      .lte('sold_date', end),
  ])

  const newLeadsByCategory: Record<string, number> = {}
  for (const lead of newLeads ?? []) {
    const label = lead.category ? (CATEGORY_LABEL[lead.category] ?? lead.category) : 'Non classé'
    newLeadsByCategory[label] = (newLeadsByCategory[label] ?? 0) + 1
  }
  const soldVolume = (soldMandates ?? []).reduce((sum, m: { price: number | null }) => sum + (m.price ?? 0), 0)

  const stats = {
    weekLabel: label,
    newLeadsCount: newLeads?.length ?? 0,
    newLeadsByCategory,
    mandatesSignedCount: signedMandates?.length ?? 0,
    mandatesSoldCount: soldMandates?.length ?? 0,
    soldVolume,
  }

  // Rien à raconter cette semaine : pas de message plutôt qu'un rapport vide.
  if (!stats.newLeadsCount && !stats.mandatesSignedCount && !stats.mandatesSoldCount) return

  const claimed = await claimDailyAlert(supabase, agencyId, 'weekly_report', agencyId, todayStr)
  if (!claimed) return

  const prompt = generateWeeklyReportBrief(stats)
  const { text } = await generateWithClaude(prompt)
  const body =
    text ||
    [
      `Semaine du ${stats.weekLabel} :`,
      `${stats.newLeadsCount} nouveau${stats.newLeadsCount > 1 ? 'x' : ''} prospect${stats.newLeadsCount > 1 ? 's' : ''}`,
      `${stats.mandatesSignedCount} mandat${stats.mandatesSignedCount > 1 ? 's' : ''} signé${stats.mandatesSignedCount > 1 ? 's' : ''}`,
      `${stats.mandatesSoldCount} vente${stats.mandatesSoldCount > 1 ? 's' : ''} conclue${stats.mandatesSoldCount > 1 ? 's' : ''}${stats.soldVolume ? ` (${formatEUR(stats.soldVolume)})` : ''}`,
    ].join('\n')

  await notifyTeamAlertWhatsApp(supabase, agencyId, 'Rapport hebdomadaire', body)
}