import { createClient } from '@/lib/supabase/server'
import NewMandateForm from './new-mandate-form'

export default async function NewMandatePage({ searchParams }: PageProps<'/dashboard/mandates/new'>) {
  const params = await searchParams
  const draft = params?.draft === '1'

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