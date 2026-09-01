import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatEUR, formatDate } from '@/lib/rive/mandates'

// Les estimations en cours sont les mandats "brouillon" (is_draft = true) :
// créés soit automatiquement quand un lead entre dans l'avant-dernière
// colonne du pipeline Vendeur/Investisseur (étape "estimation"), soit
// directement depuis cette page. Ils restent invisibles du tableau des
// mandats tant qu'ils ne sont pas activés (mandat signé).
export default async function EstimationsPage() {
  const supabase = await createClient()

  const { data: mandates } = await supabase
    .from('mandates')
    .select('id, type, address, property_type, surface, price, created_at, leads ( name )')
    .eq('is_draft', true)
    .order('created_at', { ascending: false })

  const rows = (mandates ?? []).map((m) => ({
    ...m,
    leadName: (m.leads as unknown as { name: string } | null)?.name ?? null,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Estimations</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {rows.length} estimation{rows.length > 1 ? 's' : ''} en cours
          </p>
        </div>
        <Link
          href="/dashboard/mandates/new?draft=1"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Nouvelle estimation
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Bien</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Surface</th>
              <th className="px-4 py-3 font-medium">Prix indicatif</th>
              <th className="px-4 py-3 font-medium">Démarrée le</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  Aucune estimation en cours pour l&apos;instant.
                </td>
              </tr>
            )}
            {rows.map((m) => (
              <tr key={m.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/mandates/${m.id}`} className="font-medium text-neutral-900 hover:underline">
                    {m.address || m.property_type || 'Bien sans adresse'}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-600">{m.leadName || '—'}</td>
                <td className="px-4 py-3 text-neutral-600 capitalize">{m.type}</td>
                <td className="px-4 py-3 text-neutral-600">{m.surface ? `${m.surface} m²` : '—'}</td>
                <td className="px-4 py-3 tabular-nums text-neutral-600">{formatEUR(m.price)}</td>
                <td className="px-4 py-3 text-neutral-600">{formatDate(m.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}