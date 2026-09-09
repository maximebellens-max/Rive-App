import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import InvestmentEditForm from './investment-edit-form'
import DeleteInvestmentButton from './delete-investment-button'

export default async function InvestmentDetailPage({ params }: PageProps<'/dashboard/investments/[id]'>) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('invest_projects')
    .select(
      'id, capacite_emprunt, date_mandat, echeance_notaire_debut, echeance_notaire_fin, date_compromis, date_acte, apporteur, ca_ht, commission_apporteur_pct, notes, leads ( id, name )'
    )
    .eq('id', id)
    .single()
  if (!project) notFound()

  // lead_id est une relation simple (un seul prospect par projet) : Supabase/PostgREST
  // renvoie donc `leads` comme un objet unique, pas un tableau. Le caster en tableau et
  // lire [0] renvoyait toujours undefined → "Prospect supprimé" s'affichait même quand
  // le prospect existait bien.
  const lead = project.leads as unknown as { id: string; name: string } | null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/investments" className="text-sm text-neutral-500 hover:underline">
            ← Projets en cours
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{lead?.name || 'Prospect supprimé'}</h1>
          {lead && (
            <Link href={`/dashboard/prospects/${lead.id}`} className="mt-1 block text-sm text-neutral-500 hover:underline">
              Voir la fiche prospect →
            </Link>
          )}
        </div>
        <DeleteInvestmentButton investmentId={project.id} />
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm">
        <InvestmentEditForm
          project={{
            id: project.id,
            capacite_emprunt: project.capacite_emprunt,
            date_mandat: project.date_mandat,
            echeance_notaire_debut: project.echeance_notaire_debut,
            echeance_notaire_fin: project.echeance_notaire_fin,
            date_compromis: project.date_compromis,
            date_acte: project.date_acte,
            apporteur: project.apporteur,
            ca_ht: project.ca_ht,
            commission_apporteur_pct: project.commission_apporteur_pct,
            notes: project.notes,
          }}
        />
      </div>
    </div>
  )
}