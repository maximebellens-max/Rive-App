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
import MandatesView from './mandates-view'
import Avatar from '../_components/avatar'
import type { StageCard } from '../_components/stage-kanban'

const URGENCY_CLASS: Record<string, string> = {
  overdue: 'bg-danger-soft text-danger',
  soon: 'bg-warn-soft text-warn',
  ok: 'bg-neutral-100 text-neutral-600',
  none: 'bg-neutral-100 text-neutral-400',
}

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

  const table = (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-surface shadow-sm">
      <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Bien / Client</th>
              <th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Prix</th>
              <th className="px-4 py-3 font-medium">Exclusivité</th>
              <th className="px-4 py-3 font-medium">Étape</th>
              <th className="px-4 py-3 font-medium">Renouvellement</th>
            </tr>
          </thead>
          <tbody>
            {!mandates?.length && !investorRows.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  Aucun mandat pour l&apos;instant.
                </td>
              </tr>
            )}
            {investorRows.map((r) => (
              <tr key={`investment-${r.id}`} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/investments/${r.id}`} className="font-medium text-neutral-900 hover:underline">
                    {r.lead?.name || 'Prospect supprimé'}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="text-neutral-300">—</span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">Investisseur</span>
                </td>
                <td className="px-4 py-3 tabular-nums text-neutral-600">
                  {r.capaciteEmprunt ? formatEUR(r.capaciteEmprunt) : <span className="text-neutral-300">—</span>}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  <span className="text-neutral-300">—</span>
                </td>
                <td className="px-4 py-3 text-neutral-600">Mandat</td>
                <td className="px-4 py-3 text-neutral-600">
                  {r.dateMandat ? formatDate(r.dateMandat) : <span className="text-neutral-300">—</span>}
                </td>
              </tr>
            ))}
            {mandates?.map((m) => {
              const notice = mandateIsActive(m.stage)
                ? mandateNoticeDate(m.signed_date, m.duration_months, m.renewal_notice_days)
                : null
              const urgency = dateUrgency(notice)
              const agent = m.assigned_to ? memberById.get(m.assigned_to) : undefined
              return (
                <tr key={m.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/mandates/${m.id}`} className="font-medium text-neutral-900 hover:underline">
                      {m.address || m.property_type || 'Mandat sans adresse'}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {agent ? (
                      <Avatar name={agent.full_name || 'Agent'} avatarUrl={agent.avatar_url} size={22} />
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 capitalize">{m.type}</td>
                  <td className="px-4 py-3 tabular-nums text-neutral-600">{formatEUR(m.price)}</td>
                  <td className="px-4 py-3 text-neutral-600">{exclusivityLabel(m.exclusivity) || '—'}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {m.stage === 'vendu' ? 'Vendu' : m.stage === 'compromis_signe' ? 'Compromis signé' : 'En cours'}
                  </td>
                  <td className="px-4 py-3">
                    {notice ? (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${URGENCY_CLASS[urgency]}`}>
                        {formatDate(notice)}
                      </span>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
      </table>
    </div>
  )

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

      <MandatesView table={table} cards={cards} />
    </div>
  )
}