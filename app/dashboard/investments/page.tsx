import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatEUR, formatDate } from '@/lib/rive/mandates'
import InvestmentsView from './investments-view'
import NewInvestmentForm from './new-investment-form'
import type { StageCard } from '../_components/stage-kanban'

export default async function InvestmentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
    : { data: null }

  const [{ data: projects }, { data: leads }] = await Promise.all([
    supabase
      .from('invest_projects')
      .select('id, stage, capacite_emprunt, date_mandat, apporteur, ca_ht, commission_apporteur_pct, leads ( id, name )')
      .order('created_at', { ascending: false }),
    profile?.agency_id
      ? supabase.from('leads').select('id, name').eq('agency_id', profile.agency_id).order('name', { ascending: true })
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  // lead_id est une relation simple (un seul prospect par projet) : Supabase/PostgREST
  // renvoie donc `leads` comme un objet unique, pas un tableau. Le caster en tableau et
  // lire [0] renvoyait toujours undefined → "Prospect supprimé" s'affichait même quand
  // le prospect existait bien.
  const rows = (projects ?? []).map((p) => ({
    ...p,
    lead: p.leads as unknown as { id: string; name: string } | null,
  }))

  const cards: StageCard[] = rows.map((p) => ({
    id: p.id,
    title: p.lead?.name || 'Prospect supprimé',
    subtitle: p.ca_ht ? `C.A H.T : ${formatEUR(p.ca_ht)}` : p.apporteur ? `Apporteur : ${p.apporteur}` : undefined,
    meta: p.stage,
    href: `/dashboard/investments/${p.id}`,
  }))

  const totalCa = rows.reduce((sum, p) => sum + (p.ca_ht || 0), 0)

  const table = (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-surface shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium">Bien / Client</th>
            <th className="px-4 py-3 font-medium">Étape</th>
            <th className="px-4 py-3 font-medium">C.A (H.T)</th>
            <th className="px-4 py-3 font-medium">Apporteur</th>
            <th className="px-4 py-3 font-medium">Date du mandat</th>
            <th className="px-4 py-3 font-medium">Capacité d&apos;emprunt</th>
          </tr>
        </thead>
        <tbody>
          {!rows.length && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                Aucun projet investisseur pour l&apos;instant.
              </td>
            </tr>
          )}
          {rows.map((p) => (
            <tr key={p.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
              <td className="px-4 py-3">
                <Link href={`/dashboard/investments/${p.id}`} className="font-medium text-neutral-900 hover:underline">
                  {p.lead?.name || 'Prospect supprimé'}
                </Link>
              </td>
              <td className="px-4 py-3 text-neutral-600">{STAGE_LABEL[p.stage] ?? p.stage}</td>
              <td className="px-4 py-3 tabular-nums text-neutral-600">{formatEUR(p.ca_ht)}</td>
              <td className="px-4 py-3 text-neutral-600">{p.apporteur || '—'}</td>
              <td className="px-4 py-3 text-neutral-600">{p.date_mandat ? formatDate(p.date_mandat) : '—'}</td>
              <td className="px-4 py-3 tabular-nums text-neutral-600">{formatEUR(p.capacite_emprunt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">🏠 Projets en cours — Investisseur</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {rows.length} projet{rows.length > 1 ? 's' : ''} · C.A total : {formatEUR(totalCa)}
        </p>
      </div>

      <NewInvestmentForm leadOptions={leads ?? []} />

      <InvestmentsView table={table} cards={cards} />
    </div>
  )
}

const STAGE_LABEL: Record<string, string> = {
  mandat: 'Mandat',
  compromis_signe: 'Compromis signé',
  acte: 'Acte',
  travaux: 'Travaux',
  cuisine: 'Cuisine',
  ameublement: 'Ameublement',
  location: 'Location',
}