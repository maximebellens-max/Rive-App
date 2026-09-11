import { getAuthedProfile } from '@/lib/supabase/session'
import { formatDate, formatEUR, feeForPrice } from '@/lib/rive/mandates'
import { actionBucket, nearestUpcomingMilestone } from '@/lib/rive/today'
import { computeMatchPairs, type MatchLead, type MatchMandate } from '@/lib/rive/matching'
import TodayWidgets, { type Widget } from './today-widgets'
import MonthCalendar, { type AppointmentItem } from './month-calendar'
import Card from './_components/card'

export default async function TodayPage() {
  const { supabase, user } = await getAuthedProfile()
  const userId = user?.id ?? null

  const [
    { data: leads },
    { data: mandates },
    { data: seen },
    { data: categoryColumnsRaw },
    { data: appointmentsRaw },
    { data: furnishingRows },
    { data: kitchenRows },
    { data: worksRows },
    { data: members },
    { data: commissionsRaw },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select(
        'id, name, category, action_label, action_date, budget, critere_type, critere_lieu, surface_min, pieces_min, created_at, positions, assigned_to, marked_contacted'
      ),
    supabase
      .from('mandates')
      .select(
        'id, type, stage, is_draft, lead_id, address, property_type, price, surface, pieces, signed_date, sold_date, duration_months, renewal_notice_days, diffusion, ad_date, assigned_to'
      ),
    supabase.from('seen_match_pairs').select('lead_id, mandate_id'),
    // Un prospect encore posé sur la 1ère colonne du tableau de sa propre
    // catégorie (Vendeur/Acheteur/Investisseur — plus de tableau "Prospects"
    // séparé) n'a pas encore avancé — même convention que l'agent de relance
    // (lib/rive/relance-agent.ts) pour repérer "pas encore traité". Toutes
    // colonnes des 3 tableaux en une requête, réduites ensuite à la 1ère de
    // chacun.
    supabase
      .from('pipeline_columns')
      .select('id, board_type')
      .in('board_type', ['vendeur', 'acheteur', 'investisseur'])
      .order('position', { ascending: true }),
    // Tous les rendez-vous (pas seulement ceux du mois affiché) — la
    // navigation entre mois se fait côté client sans aller-retour serveur,
    // comme c'était déjà le cas avant. L'agenda reste partagé par toute
    // l'agence (les RDV concernent souvent plusieurs agents) — seuls les
    // widgets ci-dessous, eux, sont recentrés sur l'agent connecté.
    supabase
      .from('appointments')
      .select('id, lead_id, label, lieu, appointment_date, appointment_time, participant_ids, leads(name)')
      .order('appointment_date', { ascending: true }),
    // Échéances à venir des 3 tableaux de suivi (Ameublement, Cuisine,
    // Travaux) : seuls les dossiers non terminés nous intéressent ici.
    supabase
      .from('furnishing_projects')
      .select('id, lead_id, statut, date_livraison_ikea, date_livraison_ed, date_pose, leads(name, category, assigned_to)')
      .eq('statut', 'en_cours'),
    supabase
      .from('kitchen_projects')
      .select('id, lead_id, statut, date_livraison, date_pose_debut, date_pose_fin, leads(name, category, assigned_to)')
      .eq('statut', 'en_cours'),
    supabase
      .from('works_projects')
      .select('id, lead_id, statut, echeance_debut, echeance_fin, leads(name, category, assigned_to)')
      .neq('statut', 'termine'),
    // Équipe de l'agence, pour la liste "participants" du formulaire de RDV.
    supabase.from('profiles').select('id, full_name'),
    // Commissions de l'agent connecté (jointure sur le mandat pour filtrer
    // par assigned_to, absent de la table commissions elle-même).
    supabase.from('commissions').select('amount, paid_date, mandates(assigned_to)'),
  ])

  const leadsList = leads ?? []
  const mandatesList = mandates ?? []
  // "Aujourd'hui" est le tableau de bord de l'agent connecté, pas celui de
  // toute l'agence : les widgets ci-dessous (hors agenda, resté partagé) ne
  // portent que sur ses propres prospects — PLUS les prospects sans agent
  // assigné (ex. lead Meta dont la campagne n'a pas de propriétaire choisi
  // dans Réglages → Meta Ads : owner_id peut être laissé vide). Sans ce
  // deuxième cas, un prospect non assigné serait invisible dans l'onglet
  // "Aujourd'hui" de TOUS les agents (personne n'est censé "le voir" tant
  // que personne ne l'a pris en charge) — corrigé après un cas réel où un
  // nouveau lead Meta n'apparaissait dans le widget de personne.
  const myLeadsList = leadsList.filter((l) => l.assigned_to === userId || l.assigned_to === null)

  // ---------- 1. Nouveaux rapprochements acheteur ↔ bien ----------
  // Rapprochements pour LES prospects de l'agent (+ non assignés), contre
  // TOUT le stock actif de l'agence (un bien confié à un collègue reste un
  // match valable).
  const matchPairs = computeMatchPairs(myLeadsList as MatchLead[], mandatesList as MatchMandate[])
  const seenSet = new Set((seen ?? []).map((s) => `${s.lead_id}|${s.mandate_id}`))
  const newMatches = matchPairs.filter((p) => !seenSet.has(`${p.leadId}|${p.mandateId}`))
  const leadById = new Map(myLeadsList.map((l) => [l.id, l]))
  const mandateById = new Map(mandatesList.map((m) => [m.id, m]))

  // ---------- 2. Nouveaux prospects à contacter ----------
  // Réduit la liste des colonnes (triée par position) à la 1ère colonne
  // rencontrée pour chaque tableau de catégorie.
  const firstColByCategory: Record<string, string> = {}
  for (const c of categoryColumnsRaw ?? []) {
    if (!firstColByCategory[c.board_type]) firstColByCategory[c.board_type] = c.id
  }
  const newProspects = myLeadsList.filter((l) => {
    if (l.marked_contacted) return false
    const cat = l.category
    if (!cat) return false
    const firstCol = firstColByCategory[cat]
    return !!firstCol && (l.positions as Record<string, string> | null)?.[cat] === firstCol
  })

  // ---------- 3. À venir (7j) ----------
  const upcoming = myLeadsList.filter((l) => actionBucket(l.action_date) === 'upcoming')

  // ---------- 4-6. Échéances à venir des tableaux de suivi ----------
  // Chaque dossier a plusieurs dates clés possibles (livraison, pose,
  // échéance de travaux...) — on ne retient que la plus proche des 3
  // prochains jours, comme pour "À venir" côté prospects. Ne garde que les
  // dossiers du client de l'agent connecté (même filtre que les autres
  // widgets).
  const furnishingUpcoming = (furnishingRows ?? [])
    .filter((r) => (r.leads as { assigned_to: string | null }[] | null)?.[0]?.assigned_to === userId)
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
        category: (r.leads as { category: string | null }[] | null)?.[0]?.category ?? null,
        milestone,
      }
    })
    .filter((r): r is NonNullable<typeof r> => !!r)
    .sort((a, b) => a.milestone.date.localeCompare(b.milestone.date))

  const kitchenUpcoming = (kitchenRows ?? [])
    .filter((r) => (r.leads as { assigned_to: string | null }[] | null)?.[0]?.assigned_to === userId)
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
        category: (r.leads as { category: string | null }[] | null)?.[0]?.category ?? null,
        milestone,
      }
    })
    .filter((r): r is NonNullable<typeof r> => !!r)
    .sort((a, b) => a.milestone.date.localeCompare(b.milestone.date))

  const worksUpcoming = (worksRows ?? [])
    .filter((r) => (r.leads as { assigned_to: string | null }[] | null)?.[0]?.assigned_to === userId)
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
        category: (r.leads as { category: string | null }[] | null)?.[0]?.category ?? null,
        milestone,
      }
    })
    .filter((r): r is NonNullable<typeof r> => !!r)
    .sort((a, b) => a.milestone.date.localeCompare(b.milestone.date))

  // ---------- 7. Commissions & chiffre d'affaires à venir ----------
  // Commissions en attente de paiement sur les mandats de l'agent (le lien
  // se fait par le mandat, la table commissions ne porte pas assigned_to
  // elle-même). CA à venir : honoraires projetés (barème feeForPrice) des
  // mandats de VENTE en cours de l'agent, ni brouillon ni déjà vendus — les
  // mandats de recherche n'ont pas de barème fixe, leur commission reste
  // saisie à la main une fois conclue, donc pas de projection fiable ici.
  const myPendingCommissions = (commissionsRaw ?? [])
    .filter(
      (c) => (c.mandates as unknown as { assigned_to: string | null } | null)?.assigned_to === userId && !c.paid_date
    )
    .reduce((sum, c) => sum + (c.amount || 0), 0)

  const myUpcomingRevenue = mandatesList
    .filter((m) => m.assigned_to === userId && m.type === 'vente' && !m.is_draft && m.stage !== 'vendu')
    .reduce((sum, m) => sum + feeForPrice(m.price), 0)

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
          category: lead?.category ?? null,
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
        category: l.category,
      })),
    },
    {
      key: 'upcoming',
      icon: '🗓️',
      label: 'À venir (7j)',
      items: upcoming.map((l) => ({
        id: l.id,
        primary: l.name,
        secondary: l.action_label ? `${l.action_label} · ${formatDate(l.action_date)}` : formatDate(l.action_date),
        href: `/dashboard/prospects/${l.id}`,
        category: l.category,
      })),
    },
    {
      key: 'ameublement',
      icon: '🛋️',
      label: 'Ameublement — échéances (7j)',
      items: furnishingUpcoming.map((r) => ({
        id: r.id,
        primary: r.leadName,
        secondary: `${r.milestone.label} · ${formatDate(r.milestone.date)}`,
        href: `/dashboard/prospects/${r.leadId}`,
        category: r.category,
      })),
    },
    {
      key: 'cuisine',
      icon: '🍳',
      label: 'Cuisine — échéances (7j)',
      items: kitchenUpcoming.map((r) => ({
        id: r.id,
        primary: r.leadName,
        secondary: `${r.milestone.label} · ${formatDate(r.milestone.date)}`,
        href: `/dashboard/prospects/${r.leadId}`,
        category: r.category,
      })),
    },
    {
      key: 'travaux',
      icon: '🔨',
      label: 'Travaux — échéances (7j)',
      items: worksUpcoming.map((r) => ({
        id: r.id,
        primary: r.leadName,
        secondary: `${r.milestone.label} · ${formatDate(r.milestone.date)}`,
        href: `/dashboard/prospects/${r.leadId}`,
        category: r.category,
      })),
    },
  ]

  const appointmentOptions = leadsList
    .map((l) => ({ id: l.id, name: l.name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const memberNameById = new Map((members ?? []).map((m) => [m.id, m.full_name]))

  const appointments: AppointmentItem[] = (appointmentsRaw ?? []).map((a) => {
    // lead_id est une relation simple (un seul prospect par RDV) : Supabase/PostgREST
    // renvoie donc `leads` comme un objet unique, pas un tableau. Un rendez-vous peut
    // aussi n'avoir aucun prospect attaché (RDV libre) depuis que lead_id est optionnel.
    const lead = a.leads as unknown as { name: string } | null
    return {
      id: a.id,
      leadId: a.lead_id,
      leadName: lead?.name ?? null,
      label: a.label,
      lieu: a.lieu,
      date: a.appointment_date,
      time: a.appointment_time,
      participantNames: ((a.participant_ids ?? []) as string[])
        .map((id) => memberNameById.get(id))
        .filter((n: string | undefined): n is string => Boolean(n)),
    }
  })

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Aujourd’hui</h1>
        <p className="mt-1 text-sm text-neutral-500">Ce qui a besoin de toi, sans avoir à rouvrir chaque fiche.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <MoneyTile label="Commissions en attente" value={formatEUR(myPendingCommissions)} />
        <MoneyTile label="CA à venir (mandats en cours)" value={formatEUR(myUpcomingRevenue)} />
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
          memberOptions={(members ?? []).map((m) => ({ id: m.id, name: m.full_name || 'Agent' }))}
        />
      </div>
    </div>
  )
}

function MoneyTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </Card>
  )
}