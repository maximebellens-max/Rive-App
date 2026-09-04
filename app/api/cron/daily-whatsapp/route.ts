import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { mandateNoticeDate, dateUrgency, formatDate } from '@/lib/rive/mandates'
import { notifyTeamAppointmentWhatsApp, notifyTeamMandateRenewalWhatsApp } from '@/lib/rive/whatsapp-notify'

type AdminClient = ReturnType<typeof createAdminClient>

// Digest quotidien des alertes WhatsApp qui ne sont pas déclenchées par un
// événement (contrairement à un nouveau lead, alerté immédiatement) : les
// rendez-vous prévus aujourd'hui et les mandats qui entrent dans leur
// fenêtre de préavis de renouvellement — mêmes règles que les widgets
// correspondants sur la vue Aujourd'hui. Appelée une fois par jour par
// Vercel Cron (voir vercel.json), jamais par un navigateur : Vercel envoie
// automatiquement `Authorization: Bearer $CRON_SECRET` sur ses propres
// appels, d'où la vérification ci-dessous.
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

// Marque l'événement comme notifié pour aujourd'hui et renvoie true si
// c'était bien la première fois (sinon un précédent passage du cron l'a déjà
// envoyé, on ne renvoie pas de deuxième message).
async function claimDailyAlert(
  supabase: AdminClient,
  agencyId: string,
  kind: 'appointment' | 'mandate_renewal',
  entityId: string,
  today: string
): Promise<boolean> {
  const { data: inserted } = await supabase
    .from('whatsapp_daily_alerts_sent')
    .upsert(
      { agency_id: agencyId, kind, entity_id: entityId, alert_date: today },
      { onConflict: 'agency_id,kind,entity_id,alert_date', ignoreDuplicates: true }
    )
    .select('id')

  return !!inserted && inserted.length > 0
}

async function sendAppointmentAlerts(supabase: AdminClient, agencyId: string, today: string) {
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, action_label, action_date')
    .eq('agency_id', agencyId)
    .eq('action_date', today)

  for (const lead of leads ?? []) {
    const isNew = await claimDailyAlert(supabase, agencyId, 'appointment', lead.id, today)
    if (!isNew) continue

    await notifyTeamAppointmentWhatsApp(supabase, agencyId, {
      leadName: lead.name,
      actionLabel: lead.action_label || '',
    })
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