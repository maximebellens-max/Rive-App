import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { mandateNoticeDate, dateUrgency, formatDate } from '@/lib/rive/mandates'
import { nearestUpcomingMilestone } from '@/lib/rive/today'
import {
  notifyAlertWhatsApp,
  notifyAppointmentWhatsApp,
  notifyMandateRenewalWhatsApp,
  notifyTeamAlertWhatsApp,
} from '@/lib/rive/whatsapp-notify'
import { notifyPushForAssignee, notifyPushTeam } from '@/lib/rive/push-notify'
import { generateBriefingBrief } from '@/lib/rive/ai-prompts'
import { generateWithClaude } from '@/lib/rive/anthropic'
import { claimDailyAlert } from '@/lib/rive/daily-alerts'

type AdminClient = ReturnType<typeof createAdminClient>

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

function leadUrl(leadId: string): string {
  return `${appUrl()}/dashboard/prospects/${leadId}`
}

// Longueur max raisonnable pour un corps de message WhatsApp (le gabarit
// rive_alerte accepte plus, mais on garde le briefing lisible sur un écran
// de téléphone plutôt que de coller la limite technique).
const BRIEF_MAX_LENGTH = 900

// Digest quotidien des alertes WhatsApp qui ne sont pas déclenchées par un
// événement (contrairement à un nouveau lead, alerté immédiatement) : les
// rendez-vous prévus aujourd'hui et les mandats qui entrent dans leur
// fenêtre de préavis de renouvellement — mêmes règles que les widgets
// correspondants sur la vue Aujourd'hui. Appelée une fois par jour par
// Vercel Cron (voir vercel.json), jamais par un navigateur : Vercel envoie
// automatiquement `Authorization: Bearer $CRON_SECRET` sur ses propres
// appels, d'où la vérification ci-dessous.
// Empêche Next.js de mettre cette route en cache / de l'évaluer comme
// statique — sans ça, un appel cron planifié peut silencieusement ne
// jamais ré-exécuter la fonction (ni même apparaître dans les logs Vercel),
// symptôme documenté par Vercel pour les routes de cron sans cette
// déclaration.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: agencies } = await supabase.from('agencies').select('id')

  for (const agency of agencies ?? []) {
    await sendAppointmentAlerts(supabase, agency.id, today)
    await sendRenewalAlerts(supabase, agency.id, today)
    await sendFurnishingMilestoneAlerts(supabase, agency.id)
    await sendKitchenMilestoneAlerts(supabase, agency.id)
    await sendWorksMilestoneAlerts(supabase, agency.id)
  }

  return NextResponse.json({ ok: true })
}

// Compose un briefing court (contexte du prospect + derniers échanges +
// question(s) à poser) via Claude, pour l'alerte WhatsApp de RDV du jour —
// plutôt que le simple "RDV avec untel à telle heure" d'origine. Renvoie
// null si Claude n'a pas pu générer de texte (clé API absente, erreur
// ponctuelle...), auquel cas l'appelant se replie sur l'alerte simple.
async function composeAppointmentBrief(
  supabase: AdminClient,
  lead: {
    id: string
    name: string
    category: string | null
    critere_lieu: string | null
    critere_type: string | null
    budget: number | null
    financement: string | null
    notes: string | null
    action_label: string | null
    action_date: string | null
  }
): Promise<string | null> {
  const { data: entries } = await supabase
    .from('lead_history_entries')
    .select('entry_date, text')
    .eq('lead_id', lead.id)
    .order('entry_date', { ascending: false })
    .limit(5)

  const prompt = generateBriefingBrief(
    {
      name: lead.name,
      category: lead.category,
      critere_lieu: lead.critere_lieu || '',
      critere_type: lead.critere_type || '',
      budget: lead.budget,
      financement: lead.financement || '',
      notes: lead.notes || '',
      action_label: lead.action_label || '',
      action_date: lead.action_date,
    },
    entries ?? []
  )

  const { text } = await generateWithClaude(prompt)
  if (!text) return null
  return text.length > BRIEF_MAX_LENGTH ? `${text.slice(0, BRIEF_MAX_LENGTH)}…` : text
}

async function sendAppointmentAlerts(supabase: AdminClient, agencyId: string, today: string) {
  const { data: leads } = await supabase
    .from('leads')
    .select(
      'id, name, category, critere_lieu, critere_type, budget, financement, notes, action_label, action_date, assigned_to'
    )
    .eq('agency_id', agencyId)
    .eq('action_date', today)

  for (const lead of leads ?? []) {
    const isNew = await claimDailyAlert(supabase, agencyId, 'appointment', lead.id, today)
    if (!isNew) continue

    const brief = await composeAppointmentBrief(supabase, lead)
    if (brief) {
      await notifyAlertWhatsApp(supabase, agencyId, lead.assigned_to, `RDV aujourd'hui — ${lead.name}`, brief)
    } else {
      await notifyAppointmentWhatsApp(supabase, agencyId, lead.assigned_to, {
        leadName: lead.name,
        actionLabel: lead.action_label || '',
      })
    }
    await notifyPushForAssignee(supabase, agencyId, lead.assigned_to, 'rdv_jour', {
      title: `RDV aujourd'hui — ${lead.name}`,
      body: brief || lead.action_label || 'Rendez-vous prévu aujourd’hui.',
      url: leadUrl(lead.id),
    })
  }
}

async function sendRenewalAlerts(supabase: AdminClient, agencyId: string, today: string) {
  const { data: mandates } = await supabase
    .from('mandates')
    .select('id, address, signed_date, duration_months, renewal_notice_days, assigned_to')
    .eq('agency_id', agencyId)
    .eq('is_draft', false)
    .neq('stage', 'vendu')

  for (const mandate of mandates ?? []) {
    const notice = mandateNoticeDate(mandate.signed_date, mandate.duration_months, mandate.renewal_notice_days)
    const urgency = dateUrgency(notice)
    if (urgency !== 'overdue' && urgency !== 'soon') continue

    const isNew = await claimDailyAlert(supabase, agencyId, 'mandate_renewal', mandate.id, today)
    if (!isNew) continue

    await notifyMandateRenewalWhatsApp(supabase, agencyId, mandate.assigned_to, {
      address: mandate.address || '',
      noticeDate: formatDate(notice),
    })
    await notifyPushForAssignee(supabase, agencyId, mandate.assigned_to, 'echeance_mandat', {
      title: 'Échéance de mandat',
      body: `${mandate.address || 'Ce bien'} — préavis le ${formatDate(notice)}.`,
      url: `${appUrl()}/dashboard/mandates/${mandate.id}`,
    })
  }
}

// Alertes pour les 3 tableaux de suivi (Ameublement, Cuisine, Travaux) :
// même fenêtre "à venir" que les cartes correspondantes de la vue
// Aujourd'hui (voir lib/rive/today.ts, nearestUpcomingMilestone) — une
// alerte part quand une échéance entre dans les 7 prochains jours, une
// seule fois par échéance (pas une relance quotidienne tant qu'on est
// dedans) : le dédoublonnage se fait sur la date de l'échéance elle-même
// plutôt que sur la date du jour, contrairement aux autres alertes de ce
// fichier. Toujours envoyées à toute l'équipe (comme le nouveau prospect),
// pas seulement à l'agent assigné — ces chantiers concernent souvent
// plusieurs personnes de l'agence (pas de repli "agent assigné" ici).
async function sendFurnishingMilestoneAlerts(supabase: AdminClient, agencyId: string) {
  const { data: rows } = await supabase
    .from('furnishing_projects')
    .select('id, lead_id, date_livraison_ikea, date_livraison_ed, date_pose, leads(name)')
    .eq('agency_id', agencyId)
    .eq('statut', 'en_cours')

  for (const row of rows ?? []) {
    const milestone = nearestUpcomingMilestone([
      { label: 'Livraison IKEA', date: row.date_livraison_ikea },
      { label: 'Livraison E.D', date: row.date_livraison_ed },
      { label: 'Pose', date: row.date_pose },
    ])
    if (!milestone) continue

    const isNew = await claimDailyAlert(supabase, agencyId, 'furnishing_milestone', row.id, milestone.date)
    if (!isNew) continue

    const leadName = (row.leads as { name: string }[] | null)?.[0]?.name ?? 'Client'
    await notifyTeamAlertWhatsApp(
      supabase,
      agencyId,
      `Ameublement — ${leadName}`,
      `${milestone.label} le ${formatDate(milestone.date)}.\n${leadUrl(row.lead_id)}`
    )
    await notifyPushTeam(supabase, agencyId, 'chantier_ameublement', {
      title: `Ameublement — ${leadName}`,
      body: `${milestone.label} le ${formatDate(milestone.date)}.`,
      url: leadUrl(row.lead_id),
    })
  }
}

async function sendKitchenMilestoneAlerts(supabase: AdminClient, agencyId: string) {
  const { data: rows } = await supabase
    .from('kitchen_projects')
    .select('id, lead_id, date_livraison, date_pose_debut, date_pose_fin, leads(name)')
    .eq('agency_id', agencyId)
    .eq('statut', 'en_cours')

  for (const row of rows ?? []) {
    const milestone = nearestUpcomingMilestone([
      { label: 'Livraison', date: row.date_livraison },
      { label: 'Début pose', date: row.date_pose_debut },
      { label: 'Fin pose', date: row.date_pose_fin },
    ])
    if (!milestone) continue

    const isNew = await claimDailyAlert(supabase, agencyId, 'kitchen_milestone', row.id, milestone.date)
    if (!isNew) continue

    const leadName = (row.leads as { name: string }[] | null)?.[0]?.name ?? 'Client'
    await notifyTeamAlertWhatsApp(
      supabase,
      agencyId,
      `Cuisine — ${leadName}`,
      `${milestone.label} le ${formatDate(milestone.date)}.\n${leadUrl(row.lead_id)}`
    )
    await notifyPushTeam(supabase, agencyId, 'chantier_cuisine', {
      title: `Cuisine — ${leadName}`,
      body: `${milestone.label} le ${formatDate(milestone.date)}.`,
      url: leadUrl(row.lead_id),
    })
  }
}

async function sendWorksMilestoneAlerts(supabase: AdminClient, agencyId: string) {
  const { data: rows } = await supabase
    .from('works_projects')
    .select('id, lead_id, echeance_debut, echeance_fin, leads(name)')
    .eq('agency_id', agencyId)
    .neq('statut', 'termine')

  for (const row of rows ?? []) {
    const milestone = nearestUpcomingMilestone([
      { label: 'Début travaux', date: row.echeance_debut },
      { label: 'Fin travaux', date: row.echeance_fin },
    ])
    if (!milestone) continue

    const isNew = await claimDailyAlert(supabase, agencyId, 'works_milestone', row.id, milestone.date)
    if (!isNew) continue

    const leadName = (row.leads as { name: string }[] | null)?.[0]?.name ?? 'Client'
    await notifyTeamAlertWhatsApp(
      supabase,
      agencyId,
      `Travaux — ${leadName}`,
      `${milestone.label} le ${formatDate(milestone.date)}.\n${leadUrl(row.lead_id)}`
    )
    await notifyPushTeam(supabase, agencyId, 'chantier_travaux', {
      title: `Travaux — ${leadName}`,
      body: `${milestone.label} le ${formatDate(milestone.date)}.`,
      url: leadUrl(row.lead_id),
    })
  }
}