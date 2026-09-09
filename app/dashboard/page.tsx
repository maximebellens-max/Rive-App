import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/rive/mandates'
import { actionBucket, nearestUpcomingMilestone } from '@/lib/rive/today'
import { computeMatchPairs, type MatchLead, type MatchMandate } from '@/lib/rive/matching'
import TodayWidgets, { type Widget } from './today-widgets'
import MonthCalendar, { type AppointmentItem } from './month-calendar'

export default async function TodayPage() {
  const supabase = await createClient()

  const [
    { data: leads },
    { data: mandates },
    { data: seen },
    { data: firstProspectsCol },
    { data: appointmentsRaw },
    { data: furnishingRows },
    { data: kitchenRows },
    { data: worksRows },
  ] = await Promise.all([
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
    // Échéances à venir des 3 tableaux de suivi (Ameublement, Cuisine,
    // Travaux) : seuls les dossiers non terminés nous intéressent ici.
    supabase
      .from('furnishing_projects')
      .select('id, lead_id, statut, date_livraison_ikea, date_livraison_ed, date_pose, leads(name)')
      .eq('statut', 'en_cours'),
    supabase
      .from('kitchen_projects')
      .select('id, lead_id, statut, date_livraison, date_pose_debut, date_pose_fin, leads(name)')
      .eq('statut', 'en_cours'),
    supabase
      .from('works_projects')
      .select('id, lead_id, statut, echeance_debut, echeance_fin, leads(name)')
      .neq('statut', 'termine'),
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

  // ---------- 4-6. Échéances à venir des tableaux de suivi ----------
  // Chaque dossier a plusieurs dates clés possibles (livraison, pose,
  // échéance de travaux...) — on ne retient que la plus proche des 3
  // prochains jours, comme pour "À venir" côté prospects.
  const furnishingUpcoming = (furnishingRows ?? [])
    .map((r) => {
      const milestone = nearestUpcomingMilestone([
        { label: 'Livraison IKEA', date: r.date_livraison_ikea },
        { label: 'Livraison E.D', date: r.date_livraison_ed },
        { label: 'Pose', date: r.date_pose },
      ])
      if (!milestone) return null
      return {
        id: r.id,
        leadId: r.lead_id,
        leadName: (r.leads as { name: string }[] | null)?.[0]?.name ?? 'Client',
        milestone,
      }
    })
    .filter((r): r is NonNullable<typeof r> => !!r)
    .sort((a, b) => a.milestone.date.localeCompare(b.milestone.date))

  const kitchenUpcoming = (kitchenRows ?? [])
    .map((r) => {
      const milestone = nearestUpcomingMilestone([
        { label: 'Livraison', date: r.date_livraison },
        { label: 'Début pose', date: r.date_pose_debut },
        { label: 'Fin pose', date: r.date_pose_fin },
      ])
      if (!milestone) return null
      return {
        id: r.id,
        leadId: r.lead_id,
        leadName: (r.leads as { name: string }[] | null)?.[0]?.name ?? 'Client',
        milestone,
      }
    })
    .filter((r): r is NonNullable<typeof r> => !!r)
    .sort((a, b) => a.milestone.date.localeCompare(b.milestone.date))

  const worksUpcoming = (worksRows ?? [])
    .map((r) => {
      const milestone = nearestUpcomingMilestone([
        { label: 'Début travaux', date: r.echeance_debut },
        { label: 'Fin travaux', date: r.echeance_fin },
      ])
      if (!milestone) return null
      return {
        id: r.id,
        leadId: r.lead_id,
        leadName: (r.leads as { name: string }[] | null)?.[0]?.name ?? 'Client',
        milestone,
      }
    })
    .filter((r): r is NonNullable<typeof r> => !!r)
    .sort((a, b) => a.milestone.date.localeCompare(b.milestone.date))

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
    {
      key: 'ameublement',
      icon: '🛋️',
      label: 'Ameublement — échéances (3j)',
      items: furnishingUpcoming.map((r) => ({
        id: r.id,
        primary: r.leadName,
        secondary: `${r.milestone.label} · ${formatDate(r.milestone.date)}`,
        href: `/dashboard/prospects/${r.leadId}`,
      })),
    },
    {
      key: 'cuisine',
      icon: '🍳',
      label: 'Cuisine — échéances (3j)',
      items: kitchenUpcoming.map((r) => ({
        id: r.id,
        primary: r.leadName,
        secondary: `${r.milestone.label} · ${formatDate(r.milestone.date)}`,
        href: `/dashboard/prospects/${r.leadId}`,
      })),
    },
    {
      key: 'travaux',
      icon: '🔨',
      label: 'Travaux — échéances (3j)',
      items: worksUpcoming.map((r) => ({
        id: r.id,
        primary: r.leadName,
        secondary: `${r.milestone.label} · ${formatDate(r.milestone.date)}`,
        href: `/dashboard/prospects/${r.leadId}`,
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