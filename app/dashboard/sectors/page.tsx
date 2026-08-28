import { createClient } from '@/lib/supabase/server'
import { sectorStats } from '@/lib/rive/analytics'

export default async function SectorsPage() {
  const supabase = await createClient()

  const { data: mandates } = await supabase
    .from('mandates')
    .select('address')
    .eq('type', 'vente')
    .eq('is_draft', false)
    .neq('stage', 'vendu')

  const { data: leads } = await supabase
    .from('leads')
    .select('critere_lieu')
    .in('category', ['acheteur', 'investisseur'])
    .not('critere_lieu', 'eq', '')

  const stats = sectorStats(mandates ?? [], leads ?? [])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Secteurs</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Offre (biens en vente actifs) et demande (recherches en cours) par commune.
        </p>
      </div>

      {!stats.length ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-white py-16 text-center shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Pas encore de données</h2>
          <p className="max-w-sm text-sm text-neutral-500">
            Renseigne des adresses sur tes mandats de vente et des secteurs recherchés sur tes prospects pour voir
            apparaître la répartition par commune.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.sector} className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-neutral-900">{s.sector}</h2>
              <p className="text-sm text-neutral-500">
                🏠 {s.biens} bien{s.biens > 1 ? 's' : ''} en vente
              </p>
              <p className="text-sm text-neutral-500">
                🔍 {s.recherches} recherche{s.recherches > 1 ? 's' : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
