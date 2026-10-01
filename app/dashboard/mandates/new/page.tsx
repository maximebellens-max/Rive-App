import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccessContext } from '@/lib/rive/access'
import NewMandateForm from './new-mandate-form'

export default async function NewMandatePage({ searchParams }: PageProps<'/dashboard/mandates/new'>) {
  const params = await searchParams
  const draft = params?.draft === '1'

  // La génération d'un mandat réel reste pour l'instant réservée à Hevrest
  // (voir canGenerateMandates dans app/actions/mandates.ts) — une agence
  // cliente atterrissant ici sans le savoir est redirigée vers le parcours
  // qu'elle a réellement, l'estimation, plutôt que de voir un formulaire
  // dont la soumission échouerait silencieusement.
  if (!draft) {
    const { isInterne } = await getAccessContext()
    if (!isInterne) redirect('/dashboard/mandates/new?draft=1')
  }

  const supabase = await createClient()
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, category, critere_type, critere_lieu, budget, surface_min')
    .order('name')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{draft ? 'Nouvelle estimation' : 'Nouveau mandat'}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {draft
            ? "Démarre une estimation avant tout engagement — tu la transformeras en mandat signé le moment venu."
            : 'Renseigne les infos de base, tu complèteras le reste ensuite.'}
        </p>
      </div>
      <div className="max-w-2xl rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm">
        <NewMandateForm leads={leads ?? []} draft={draft} />
      </div>
    </div>
  )
}