import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/rive/mandates'
import { actionBucket } from '@/lib/rive/today'
import { computeMatchPairs, type MatchLead, type MatchMandate } from '@/lib/rive/matching'
import TodayWidgets, { type Widget } from './today-widgets'
import MonthCalendar, { type AppointmentItem } from './month-calendar'

export default async function TodayPage() {
  const supabase = await createClient()

  const [{ data: leads }, { data: mandates }, { data: seen }, { data: firstProspectsCol }, { data: appointmentsRaw }] =
    await Promise.all([
      supabase
        .from('leads')
        .select(
          'id, name, category, action_label, action_date, budget, critere_type, critere_lieu, surface_min, pieces_min, created_at, positions'
        ),
      supabase
        .from('mandates')
        .select(
          'id, type, stage, is_draft, lead_id, address, property_type, price, surface, pieces, signed_date, sold_date, duration_months, renewal_notice_days, diffusion, ad_date'
        ),
      supabase.from('seen_match_pairs').select('lead_id, mandate_id'),
      // Un prospect encore posé sur la 1ère colonne du tableau Prospects n'a
      // pas encore avancé — même convention que l'agent de relance
      // (lib/rive/relance-agent.ts) pour repérer "pas encore traité".
      supabase.from('pipeline_columns').select('id').eq('board_type', 'prospects').order('position', { ascending: true }).limit(1).maybeSingle(),
      // Tous les rendez-vous (pas seulement ceux du mois affiché) — la
      // navigation entre mois se fait côté client sans aller-retour serveur,
      // comme c'était déjà le cas avant.
      supabase
        .from('appointments')
        .select('id, lead_id, label, appointment_date, appointment_time, leads(name)')
        .order('appointment_date', { ascending: true }),
    ])

  const leadsList = leads ?? []
  const mandatesList = mandates ?? []

  // ---------- 1. Nouveaux rapprochements acheteur ↔ bien ----------
  const matchPairs = computeMatchPairs(leadsList as MatchLead[], mandatesList as MatchMandate[])
  const seenSet = new Set((seen ?? []).map((s) => `${s.lead_id}|${s.mandate_id}`))
  const newMatches = matchPairs.filter((p) => !seenSet.has(`${p.leadId}|${p.mandateId}`))
  const leadById = new Map(leadsList.map((l) => [l.id, l]))
  const mandateById = new Map(mandatesList.map((m) => [m.id, m]))

  // ---------- 2. Nouveaux prospects à contacter ----------
  const newProspects = leadsList.filter(
    (l) => firstProspectsCol && (l.positions as Record<string, string> | null)?.prospects === firstProspectsCol.id
  )

  // ---------- 3. À venir (3j) ----------
  const upcoming = leadsList.filter((l) => actionBucket(l.action_date) === 'upcoming')

  const widgets: Widget[] = [
    {
      key: 'matches',
      icon: '🤝',
      label: 'Nouveaux rapprochements',
      items: newMatches.map((p) => {
        const lead = leadById.get(p.leadId)
        const mandate = mandateById.get(p.mandateId)
        return {
          id: `${p.leadId}-${p.mandateId}`,
          primary: lead?.name ?? 'Prospect',
          secondary: mandate?.address || mandate?.property_type || '',
          href: `/dashboard/prospects/${p.leadId}`,
        }
      }),
    },
    {
      key: 'newProspects',
      icon: '🆕',
      label: 'Nouveaux prospects à contacter',
      items: newProspects.map((l) => ({
        id: l.id,
        primary: l.name,
        secondary: l.critere_lieu || undefined,
        href: `/dashboard/prospects/${l.id}`,
      })),
    },
    {
      key: 'upcoming',
      icon: '🗓️',
      label: 'À venir (3j)',
      items: upcoming.map((l) => ({
        id: l.id,
        primary: l.name,
        secondary: l.action_label ? `${l.action_label} · ${formatDate(l.action_date)}` : formatDate(l.action_date),
        href: `/dashboard/prospects/${l.id}`,
      })),
    },
  ]

  const appointmentOptions = leadsList
    .map((l) => ({ id: l.id, name: l.name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const appointments: AppointmentItem[] = (appointmentsRaw ?? []).map((a) => ({
    id: a.id,
    leadId: a.lead_id,
    leadName: (a.leads as { name: string }[] | null)?.[0]?.name ?? 'Prospect',
    label: a.label,
    date: a.appointment_date,
    time: a.appointment_time,
  }))

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Aujourd’hui</h1>
        <p className="mt-1 text-sm text-neutral-500">Ce qui a besoin de toi, sans avoir à rouvrir chaque fiche.</p>
      </div>

      <TodayWidgets widgets={widgets} matchPairs={newMatches} />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-900">Agenda</h2>
        <MonthCalendar
          initialYear={now.getFullYear()}
          initialMonth={now.getMonth()}
          todayStr={todayStr}
          appointments={appointments}
          leadOptions={appointmentOptions}
        />
      </div>
    </div>
  )
}