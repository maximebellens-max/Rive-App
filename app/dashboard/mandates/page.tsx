import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  mandateNoticeDate,
  mandateIsActive,
  dateUrgency,
  exclusivityLabel,
  formatEUR,
  formatDate,
} from '@/lib/rive/mandates'
import MandatesView, { type MandateRow } from './mandates-view'
import type { StageCard } from '../_components/stage-kanban'

export default async function MandatesPage() {
  const supabase = await createClient()

  const [{ data: mandates }, { data: members }, { data: investorMandates }] = await Promise.all([
    supabase
      .from('mandates')
      .select(
        'id, type, address, property_type, price, stage, exclusivity, signed_date, duration_months, renewal_notice_days, assigned_to'
      )
      .eq('is_draft', false)
      .order('created_at', { ascending: false }),
    // La RLS ("profiles: select same agency") restreint déjà aux membres de
    // l'agence courante, pas besoin de filtrer par agency_id ici.
    supabase.from('profiles').select('id, full_name, avatar_url'),
    // Projets investisseur "en mandat" (onglet Projets investisseur) : pas de
    // vrai mandat créé dans la table `mandates` pour eux, mais ils doivent
    // quand même apparaître ici — repris à part (voir plus bas) plutôt que
    // dans le Kanban, dont les colonnes/le glisser-déposer sont propres aux
    // mandats classiques.
    supabase
      .from('invest_projects')
      .select('id, capacite_emprunt, date_mandat, leads ( id, name )')
      .eq('stage', 'mandat')
      .order('created_at', { ascending: false }),
  ])

  const investorRows = (investorMandates ?? []).map((p) => ({
    id: p.id,
    capaciteEmprunt: p.capacite_emprunt,
    dateMandat: p.date_mandat,
    lead: p.leads as unknown as { id: string; name: string } | null,
  }))

  const memberById = new Map((members ?? []).map((m) => [m.id, m]))

  const cards: StageCard[] = (mandates ?? []).map((m) => {
    const agent = m.assigned_to ? memberById.get(m.assigned_to) : undefined
    return {
      id: m.id,
      title: m.address || m.property_type || 'Mandat sans adresse',
      subtitle: `${m.type === 'vente' ? 'Vente' : 'Recherche'} · ${formatEUR(m.price)}`,
      meta: m.stage,
      href: `/dashboard/mandates/${m.id}`,
      assignedName: agent?.full_name || undefined,
      assignedAvatarUrl: agent?.avatar_url || undefined,
    }
  })

  // Repris ici aussi (en plus du tableau `table` ci-dessous) pour que la vue
  // Kanban — celle affichée par défaut en arrivant sur cette page — montre
  // elle aussi les projets investisseur, pas seulement la vue Liste. Pas de
  // glisser-déposer sur ces cartes (draggable: false) : `onMove` appelle
  // `moveMandateStage`, propre à la table `mandates`, qui ne trouverait pas
  // ces id (table `invest_projects`).
  const investorCards: StageCard[] = investorRows.map((r) => ({
    id: r.id,
    title: r.lead?.name || 'Prospect supprimé',
    subtitle: r.capaciteEmprunt ? formatEUR(r.capaciteEmprunt) : undefined,
    meta: 'investisseur',
    href: `/dashboard/investments/${r.id}`,
    draggable: false,
  }))

  // Une ligne par mandat classique + une par projet investisseur "en mandat" —
  // toute la mise en forme se fait ici (côté serveur) pour que MandatesView
  // (client, pour le tri/la recherche/l'export CSV) n'ait plus qu'à afficher
  // des chaînes et des nombres déjà prêts.
  const investorMandateRows: MandateRow[] = investorRows.map((r) => ({
    id: `investment-${r.id}`,
    href: `/dashboard/investments/${r.id}`,
    title: r.lead?.name || 'Prospect supprimé',
    searchText: (r.lead?.name || '').toLowerCase(),
    agentName: null,
    agentAvatarUrl: null,
    typeLabel: 'Investisseur',
    price: r.capaciteEmprunt,
    priceLabel: r.capaciteEmprunt ? formatEUR(r.capaciteEmprunt) : '',
    exclusivityLabel: null,
    stageLabel: 'Mandat',
    noticeDate: r.dateMandat,
    noticeLabel: r.dateMandat ? formatDate(r.dateMandat) : null,
    urgency: 'none',
  }))

  const mandateRows: MandateRow[] = (mandates ?? []).map((m) => {
    const notice = mandateIsActive(m.stage)
      ? mandateNoticeDate(m.signed_date, m.duration_months, m.renewal_notice_days)
      : null
    const urgency = dateUrgency(notice)
    const agent = m.assigned_to ? memberById.get(m.assigned_to) : undefined
    const title = m.address || m.property_type || 'Mandat sans adresse'
    return {
      id: m.id,
      href: `/dashboard/mandates/${m.id}`,
      title,
      searchText: `${title} ${agent?.full_name || ''}`.toLowerCase(),
      agentName: agent?.full_name || null,
      agentAvatarUrl: agent?.avatar_url || null,
      typeLabel: m.type === 'vente' ? 'Vente' : 'Recherche',
      price: m.price,
      priceLabel: formatEUR(m.price),
      exclusivityLabel: exclusivityLabel(m.exclusivity) || null,
      stageLabel: m.stage === 'vendu' ? 'Vendu' : m.stage === 'compromis_signe' ? 'Compromis signé' : 'En cours',
      noticeDate: notice ? notice.toISOString() : null,
      noticeLabel: notice ? formatDate(notice) : null,
      urgency,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Mandats</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {mandates?.length ?? 0} mandat{(mandates?.length ?? 0) > 1 ? 's' : ''}
            {investorRows.length > 0 &&
              ` · ${investorRows.length} projet${investorRows.length > 1 ? 's' : ''} investisseur en mandat`}
          </p>
        </div>
        <Link
          href="/dashboard/mandates/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover"
        >
          Nouveau mandat
        </Link>
      </div>

      <MandatesView rows={[...investorMandateRows, ...mandateRows]} cards={[...cards, ...investorCards]} />
    </div>
  )
}