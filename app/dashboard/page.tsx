import { createClient } from '@/lib/supabase/server'
import { mandateNoticeDate, dateUrgency, formatDate } from '@/lib/rive/mandates'
import { actionBucket, daysAgo, RECONTACT_THRESHOLD_DAYS, STALE_BIEN_THRESHOLD_DAYS } from '@/lib/rive/today'
import { computeMatchPairs, bienIsActive, type MatchLead, type MatchMandate } from '@/lib/rive/matching'
import TodayWidgets, { type Widget } from './today-widgets'
import AppointmentForm from './appointment-form'

export default async function TodayPage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select(
      'id, name, category, action_label, action_date, budget, critere_type, critere_lieu, surface_min, pieces_min, created_at'
    )

  const { data: mandates } = await supabase
    .from('mandates')
    .select(
      'id, type, stage, is_draft, lead_id, address, property_type, price, surface, pieces, signed_date, sold_date, duration_months, renewal_notice_days'
    )

  const { data: seen } = await supabase.from('seen_match_pairs').select('lead_id, mandate_id')

  const { data: historyRows } = await supabase.from('lead_history_entries').select('lead_id, entry_date')

  const leadsList = leads ?? []
  const mandatesList = mandates ?? []

  const lastHistory: Record<string, string> = {}
  for (const row of historyRows ?? []) {
    if (!lastHistory[row.lead_id] || row.entry_date > lastHistory[row.lead_id]) lastHistory[row.lead_id] = row.entry_date
  }

  // ---------- 1. Nouveaux rapprochements acheteur ↔ bien ----------
  const matchPairs = computeMatchPairs(leadsList as MatchLead[], mandatesList as MatchMandate[])
  const seenSet = new Set((seen ?? []).map((s) => `${s.lead_id}|${s.mandate_id}`))
  const newMatches = matchPairs.filter((p) => !seenSet.has(`${p.leadId}|${p.mandateId}`))
  const leadById = new Map(leadsList.map((l) => [l.id, l]))
  const mandateById = new Map(mandatesList.map((m) => [m.id, m]))

  // ---------- 2/3/4. Relances (en retard / aujourd'hui / à venir 3j) ----------
  const overdue = leadsList.filter((l) => actionBucket(l.action_date) === 'overdue')
  const todayItems = leadsList.filter((l) => actionBucket(l.action_date) === 'today')
  const upcoming = leadsList.filter((l) => actionBucket(l.action_date) === 'upcoming')

  // ---------- 5. Mandats à renouveler ----------
  const toRenew = mandatesList
    .filter((m) => !m.is_draft && m.stage !== 'vendu')
    .map((m) => ({ mandate: m, notice: mandateNoticeDate(m.signed_date, m.duration_months, m.renewal_notice_days) }))
    .filter(({ notice }) => {
      const u = dateUrgency(notice)
      return u === 'overdue' || u === 'soon'
    })

  // ---------- 6. Biens à relancer (60j+ sans rafraîchissement) ----------
  // Provisoire : basé sur la date de signature en attendant le suivi de
  // diffusion portails/campagnes (à venir).
  const stale = mandatesList
    .filter((m) => bienIsActive(m as MatchMandate))
    .map((m) => ({ mandate: m, days: daysAgo(m.signed_date) ?? 0 }))
    .filter(({ days }) => days >= STALE_BIEN_THRESHOLD_DAYS)
    .sort((a, b) => b.days - a.days)

  // ---------- 7. Clients à recontacter (300j+) ----------
  const recontact = mandatesList
    .filter((m) => m.stage === 'vendu' && m.sold_date)
    .filter((m) => (daysAgo(m.sold_date) ?? 0) >= RECONTACT_THRESHOLD_DAYS)
    .filter((m) => {
      const lastDate = m.lead_id ? lastHistory[m.lead_id] : null
      return !lastDate || (daysAgo(lastDate) ?? 999) >= RECONTACT_THRESHOLD_DAYS
    })

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
      key: 'overdue',
      icon: '⏰',
      label: 'En retard',
      items: overdue.map((l) => ({
        id: l.id,
        primary: l.name,
        secondary: l.action_label || undefined,
        href: `/dashboard/prospects/${l.id}`,
      })),
    },
    {
      key: 'today',
      icon: '📌',
      label: 'Aujourd’hui',
      items: todayItems.map((l) => ({
        id: l.id,
        primary: l.name,
        secondary: l.action_label || undefined,
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
    {
      key: 'renew',
      icon: '📄',
      label: 'Mandats à renouveler',
      items: toRenew.map(({ mandate, notice }) => ({
        id: mandate.id,
        primary: mandate.address || mandate.property_type || 'Mandat',
        secondary: formatDate(notice),
        href: `/dashboard/mandates/${mandate.id}`,
      })),
    },
    {
      key: 'stale',
      icon: '📢',
      label: 'Biens à relancer (60j+)',
      items: stale.map(({ mandate, days }) => ({
        id: mandate.id,
        primary: mandate.address || mandate.property_type || 'Bien',
        secondary: `${days} j`,
        href: `/dashboard/mandates/${mandate.id}`,
      })),
    },
    {
      key: 'recontact',
      icon: '☎️',
      label: 'Clients à recontacter (300j+)',
      items: recontact.map((m) => {
        const lead = m.lead_id ? leadById.get(m.lead_id) : undefined
        return {
          id: m.id,
          primary: lead?.name || m.address || 'Client',
          secondary: `Vendu il y a ${daysAgo(m.sold_date)} j`,
          href: lead ? `/dashboard/prospects/${lead.id}` : `/dashboard/mandates/${m.id}`,
        }
      }),
    },
  ]

  const appointmentOptions = leadsList
    .map((l) => ({ id: l.id, name: l.name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Aujourd’hui</h1>
        <p className="mt-1 text-sm text-neutral-500">Ce qui a besoin de toi, sans avoir à rouvrir chaque fiche.</p>
      </div>

      <TodayWidgets widgets={widgets} matchPairs={newMatches} />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Ajouter un rendez-vous</h2>
          <a href="/dashboard/agenda/ics" className="text-sm text-neutral-500 hover:underline">
            Exporter l’agenda (.ics) →
          </a>
        </div>
        <AppointmentForm options={appointmentOptions} />
      </div>
    </div>
  )
}
