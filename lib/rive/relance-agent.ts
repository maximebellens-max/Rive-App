// Agent de relance automatique : détecte plusieurs situations qui méritent
// un rappel, rédige un brouillon via Claude, et alerte l'agent par WhatsApp
// (gabarit générique "rive_alerte") — jamais d'envoi automatique à un
// client. L'envoi de messages automatiques directement aux clients demande
// un mécanisme de consentement RGPD séparé, pas encore construit ; ici,
// c'est toujours l'agent qui relit le brouillon et l'envoie lui-même.
//
// 6 déclencheurs :
// 1. Nouveau prospect sans retour : relances à J+3, J+7, J+14 depuis le
//    dernier point de contact (création du prospect, ou date de la
//    dernière note si plus récente). Une nouvelle note reporte la séquence
//    (elle repart de zéro à partir de cette note) plutôt que de l'arrêter ;
//    seule une vraie progression dans le pipeline (le prospect quitte la
//    1ère colonne du tableau Prospects) l'arrête définitivement.
// 2. Anniversaire de la vente/de l'achat : 1 an (ou plus) jour pour jour
//    après mandates.sold_date, pour tous les mandats conclus (vente comme
//    recherche — rien ne distingue formellement les deux aujourd'hui, la
//    formulation du message s'adapte via la catégorie du prospect).
// 3. Anniversaire du client (vendeurs et investisseurs) : via leads.birth_date.
// 4. Vœux de fin d'année : un seul message groupé, le 15 décembre.
// 5. Demande d'avis Google : 7 jours après une transaction conclue.
// 6. Relance estimation sans suite : 7 jours après une estimation
//    (mandat brouillon) jamais transformée en mandat signé.
import type { SupabaseClient } from '@supabase/supabase-js'
import { firstColumnId } from './pipeline-positions'
import { claimDailyAlert } from './daily-alerts'
import {
  RELANCE_STEPS,
  GOOGLE_REVIEW_DELAY_DAYS,
  ESTIMATION_FOLLOWUP_DELAY_DAYS,
  daysAgo,
} from './today'
import {
  generateNoResponseRelanceBrief,
  generateAnniversaryBrief,
  generateBirthdayBrief,
  generateYearEndWishesBrief,
  generateGoogleReviewBrief,
  generateEstimationFollowupBrief,
} from './ai-prompts'
import { generateWithClaude } from './anthropic'
import { notifyTeamAlertWhatsApp } from './whatsapp-notify'

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

function leadUrl(leadId: string): string {
  return `${appUrl()}/dashboard/prospects/${leadId}`
}

// "MM-DD" — comparer seulement le mois/jour de deux dates ISO (YYYY-MM-DD),
// sans passer par des objets Date (donc sans risque de décalage de fuseau).
function monthDay(dateStr: string): string {
  return dateStr.slice(5, 10)
}

function yearsBetween(fromDateStr: string, toDateStr: string): number {
  return parseInt(toDateStr.slice(0, 4), 10) - parseInt(fromDateStr.slice(0, 4), 10)
}

type RelanceStep = 'j3' | 'j7' | 'j14'

function currentRelanceStep(daysSince: number): RelanceStep | null {
  if (daysSince >= RELANCE_STEPS.j14) return 'j14'
  if (daysSince >= RELANCE_STEPS.j7) return 'j7'
  if (daysSince >= RELANCE_STEPS.j3) return 'j3'
  return null
}

// 1. Nouveau prospect sans retour (J+3 / J+7 / J+14).
async function processNoResponseRelances(supabase: SupabaseClient, agencyId: string) {
  const firstCol = await firstColumnId(supabase, agencyId, 'prospects')
  if (!firstCol) return

  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, created_at, positions')
    .eq('agency_id', agencyId)

  const candidates = (leads ?? []).filter(
    (l) => (l.positions as Record<string, string> | null)?.prospects === firstCol
  )
  if (!candidates.length) return

  const leadIds = candidates.map((l) => l.id)

  const { data: historyRows } = await supabase
    .from('lead_history_entries')
    .select('lead_id, entry_date')
    .in('lead_id', leadIds)

  const lastHistoryByLead = new Map<string, string>()
  for (const row of historyRows ?? []) {
    const current = lastHistoryByLead.get(row.lead_id)
    if (!current || row.entry_date > current) lastHistoryByLead.set(row.lead_id, row.entry_date)
  }

  const { data: states } = await supabase
    .from('lead_relance_state')
    .select('lead_id, reference_date, last_step')
    .in('lead_id', leadIds)
  const stateByLead = new Map((states ?? []).map((s) => [s.lead_id, s]))

  for (const lead of candidates) {
    const lastHistory = lastHistoryByLead.get(lead.id)
    const created = lead.created_at.slice(0, 10)
    const referenceDate = lastHistory && lastHistory > created ? lastHistory : created
    const daysSince = daysAgo(referenceDate) ?? 0

    const prevState = stateByLead.get(lead.id)
    // Une nouvelle date de référence (nouvelle note plus récente que le
    // dernier passage, ou tout premier passage) reporte la séquence : elle
    // repart de zéro à partir de cette date plutôt que de rester bloquée
    // sur l'ancien palier déjà envoyé.
    const lastStep = prevState && prevState.reference_date === referenceDate ? prevState.last_step : null

    const step = currentRelanceStep(daysSince)

    if (step && step !== lastStep) {
      const { text } = await generateWithClaude(generateNoResponseRelanceBrief(lead.name, step, daysSince))
      const body =
        text || `Toujours sans nouvelles de ${lead.name}, ${daysSince} jours après son dernier point de contact.`
      await notifyTeamAlertWhatsApp(
        supabase,
        agencyId,
        `Relance J+${RELANCE_STEPS[step]} — ${lead.name}`,
        `${body}\n${leadUrl(lead.id)}`
      )
    }

    const nextLastStep = step && step !== lastStep ? step : lastStep
    await supabase.from('lead_relance_state').upsert({
      lead_id: lead.id,
      agency_id: agencyId,
      reference_date: referenceDate,
      last_step: nextLastStep,
      updated_at: new Date().toISOString(),
    })
  }
}

// 2. Anniversaire de la vente/de l'achat.
async function processAnniversaryRelances(supabase: SupabaseClient, agencyId: string, today: string) {
  const { data: mandates } = await supabase
    .from('mandates')
    .select('id, address, sold_date, lead_id')
    .eq('agency_id', agencyId)
    .eq('is_draft', false)
    .not('sold_date', 'is', null)

  for (const mandate of mandates ?? []) {
    if (!mandate.sold_date || !mandate.lead_id) continue
    if (monthDay(mandate.sold_date) !== monthDay(today)) continue
    const years = yearsBetween(mandate.sold_date, today)
    if (years < 1) continue

    const isNew = await claimDailyAlert(supabase, agencyId, 'mandate_anniversary', mandate.id, today)
    if (!isNew) continue

    const { data: lead } = await supabase
      .from('leads')
      .select('name, category')
      .eq('id', mandate.lead_id)
      .maybeSingle()
    if (!lead) continue

    const { text } = await generateWithClaude(
      generateAnniversaryBrief(lead.name, mandate.address || '', years, lead.category)
    )
    const body = text || `Cela fait ${years} an${years > 1 ? 's' : ''} aujourd'hui.`
    await notifyTeamAlertWhatsApp(supabase, agencyId, `Anniversaire — ${lead.name}`, `${body}\n${leadUrl(mandate.lead_id)}`)
  }
}

// 3. Anniversaire du client (vendeurs et investisseurs).
async function processBirthdayRelances(supabase: SupabaseClient, agencyId: string, today: string) {
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, birth_date')
    .eq('agency_id', agencyId)
    .in('category', ['vendeur', 'investisseur'])
    .not('birth_date', 'is', null)

  for (const lead of leads ?? []) {
    if (!lead.birth_date || monthDay(lead.birth_date) !== monthDay(today)) continue

    const isNew = await claimDailyAlert(supabase, agencyId, 'lead_birthday', lead.id, today)
    if (!isNew) continue

    const { text } = await generateWithClaude(generateBirthdayBrief(lead.name))
    const body = text || `C'est l'anniversaire de ${lead.name} aujourd'hui.`
    await notifyTeamAlertWhatsApp(supabase, agencyId, `Anniversaire — ${lead.name}`, `${body}\n${leadUrl(lead.id)}`)
  }
}

// 4. Vœux de fin d'année — un seul message groupé, le 15 décembre.
async function processYearEndWishes(supabase: SupabaseClient, agencyId: string, today: string) {
  if (monthDay(today) !== '12-15') return

  const isNew = await claimDailyAlert(supabase, agencyId, 'year_end_wishes', agencyId, today)
  if (!isNew) return

  const { text } = await generateWithClaude(generateYearEndWishesBrief())
  const body = text || "Toute l'équipe Hevrest vous souhaite de très belles fêtes de fin d'année !"
  await notifyTeamAlertWhatsApp(supabase, agencyId, 'Vœux de fin d\'année', `${body}\n\nÀ copier-coller vers ta liste de diffusion.`)
}

// 5. Demande d'avis Google, 7 jours après une transaction conclue.
async function processGoogleReviewRequests(supabase: SupabaseClient, agencyId: string, today: string) {
  const { data: mandates } = await supabase
    .from('mandates')
    .select('id, address, sold_date, lead_id')
    .eq('agency_id', agencyId)
    .eq('is_draft', false)
    .not('sold_date', 'is', null)

  for (const mandate of mandates ?? []) {
    if (!mandate.sold_date || !mandate.lead_id) continue
    if ((daysAgo(mandate.sold_date) ?? -1) !== GOOGLE_REVIEW_DELAY_DAYS) continue

    const isNew = await claimDailyAlert(supabase, agencyId, 'google_review_request', mandate.id, today)
    if (!isNew) continue

    const { data: lead } = await supabase.from('leads').select('name').eq('id', mandate.lead_id).maybeSingle()
    if (!lead) continue

    const { text } = await generateWithClaude(
      generateGoogleReviewBrief(lead.name, mandate.address || '', GOOGLE_REVIEW_DELAY_DAYS)
    )
    const body = text || `Ça fait ${GOOGLE_REVIEW_DELAY_DAYS} jours que la transaction est conclue avec ${lead.name} — bon moment pour demander un avis.`
    await notifyTeamAlertWhatsApp(supabase, agencyId, `Demande d'avis — ${lead.name}`, `${body}\n${leadUrl(mandate.lead_id)}`)
  }
}

// 6. Relance estimation sans suite, 7 jours après une estimation
// (mandat brouillon) jamais transformée en mandat signé.
async function processStaleEstimations(supabase: SupabaseClient, agencyId: string, today: string) {
  const { data: mandates } = await supabase
    .from('mandates')
    .select('id, address, created_at, lead_id')
    .eq('agency_id', agencyId)
    .eq('is_draft', true)

  for (const mandate of mandates ?? []) {
    if (!mandate.lead_id) continue
    const createdDate = (mandate.created_at as string).slice(0, 10)
    if ((daysAgo(createdDate) ?? -1) !== ESTIMATION_FOLLOWUP_DELAY_DAYS) continue

    const isNew = await claimDailyAlert(supabase, agencyId, 'estimation_stale', mandate.id, today)
    if (!isNew) continue

    const { data: lead } = await supabase.from('leads').select('name').eq('id', mandate.lead_id).maybeSingle()
    if (!lead) continue

    const { text } = await generateWithClaude(
      generateEstimationFollowupBrief(lead.name, mandate.address || '', ESTIMATION_FOLLOWUP_DELAY_DAYS)
    )
    const body = text || `Estimation envoyée à ${lead.name} il y a ${ESTIMATION_FOLLOWUP_DELAY_DAYS} jours, toujours sans mandat signé.`
    await notifyTeamAlertWhatsApp(supabase, agencyId, `Relance estimation — ${lead.name}`, `${body}\n${leadUrl(mandate.lead_id)}`)
  }
}

export async function runRelanceAgent(supabase: SupabaseClient, agencyId: string, today: string) {
  await processNoResponseRelances(supabase, agencyId)
  await processAnniversaryRelances(supabase, agencyId, today)
  await processBirthdayRelances(supabase, agencyId, today)
  await processYearEndWishes(supabase, agencyId, today)
  await processGoogleReviewRequests(supabase, agencyId, today)
  await processStaleEstimations(supabase, agencyId, today)
}