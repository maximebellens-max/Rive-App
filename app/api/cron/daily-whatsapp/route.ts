import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { mandateNoticeDate, dateUrgency, formatDate } from '@/lib/rive/mandates'
import {
  notifyTeamAlertWhatsApp,
  notifyTeamAppointmentWhatsApp,
  notifyTeamMandateRenewalWhatsApp,
} from '@/lib/rive/whatsapp-notify'
import { generateBriefingBrief } from '@/lib/rive/ai-prompts'
import { generateWithClaude } from '@/lib/rive/anthropic'
import { claimDailyAlert } from '@/lib/rive/daily-alerts'

type AdminClient = ReturnType<typeof createAdminClient>

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
    .select('id, name, category, critere_lieu, critere_type, budget, financement, notes, action_label, action_date')
    .eq('agency_id', agencyId)
    .eq('action_date', today)

  for (const lead of leads ?? []) {
    const isNew = await claimDailyAlert(supabase, agencyId, 'appointment', lead.id, today)
    if (!isNew) continue

    const brief = await composeAppointmentBrief(supabase, lead)
    if (brief) {
      await notifyTeamAlertWhatsApp(supabase, agencyId, `RDV aujourd'hui — ${lead.name}`, brief)
    } else {
      await notifyTeamAppointmentWhatsApp(supabase, agencyId, {
        leadName: lead.name,
        actionLabel: lead.action_label || '',
      })
    }
  }
}

async function sendRenewalAlerts(supabase: AdminClient, agencyId: string, today: string) {
  const { data: mandates } = await supabase
    .from('mandates')
    .select('id, address, signed_date, duration_months, renewal_notice_days')
    .eq('agency_id', agencyId)
    .eq('is_draft', false)
    .neq('stage', 'vendu')

  for (const mandate of mandates ?? []) {
    const notice = mandateNoticeDate(mandate.signed_date, mandate.duration_months, mandate.renewal_notice_days)
    const urgency = dateUrgency(notice)
    if (urgency !== 'overdue' && urgency !== 'soon') continue

    const isNew = await claimDailyAlert(supabase, agencyId, 'mandate_renewal', mandate.id, today)
    if (!isNew) continue

    await notifyTeamMandateRenewalWhatsApp(supabase, agencyId, {
      address: mandate.address || '',
      noticeDate: formatDate(notice),
    })
  }
}