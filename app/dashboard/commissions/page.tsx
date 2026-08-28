import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatEUR, formatDate } from '@/lib/rive/mandates'
import { monthlySignedCounts, conversionRate } from '@/lib/rive/commissions'
import CommissionsView from './commissions-view'
import NewCommissionForm from './new-commission-form'
import type { StageCard } from '../_components/stage-kanban'

export default async function CommissionsPage() {
  const supabase = await createClient()

  const { data: commissions } = await supabase
    .from('commissions')
    .select('id, amount, paid_date, notes, created_at, mandates ( id, address, property_type, type )')
    .order('created_at', { ascending: false })

  const { data: signedMandates } = await supabase
    .from('mandates')
    .select('id, type, signed_date, created_at, stage')
    .not('signed_date', 'is', null)

  const { count: vendeurLeadsCount } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('category', 'vendeur')

  const { data: vendusWithoutCommission } = await supabase
    .from('mandates')
    .select('id, address, property_type, price')
    .eq('stage', 'vendu')
    .eq('is_draft', false)

  const commissionMandateIds = new Set((commissions ?? []).map((c) => (c.mandates as unknown as { id: string } | null)?.id))
  const options = (vendusWithoutCommission ?? [])
    .filter((m) => !commissionMandateIds.has(m.id))
    .map((m) => ({ id: m.id, label: `${m.address || m.property_type || 'Mandat'} — ${formatEUR(m.price)}` }))

  const paid = (commissions ?? []).filter((c) => c.paid_date)
  const pending = (commissions ?? []).filter((c) => !c.paid_date)
  const totalPaid = paid.reduce((sum, c) => sum + (c.amount || 0), 0)
  const totalPending = pending.reduce((sum, c) => sum + (c.amount || 0), 0)
  const mandatesSignedCount = (signedMandates ?? []).filter((m) => m.stage === 'vendu').length
  const conversion = conversionRate(mandatesSignedCount, vendeurLeadsCount ?? 0)
  const bars = monthlySignedCounts(signedMandates ?? [])
  const maxBar = Math.max(1, ...bars.map((b) => b.count))

  const cards: StageCard[] = (commissions ?? []).map((c) => {
    const mandate = c.mandates as unknown as { id: string; address: string; property_type: string; type: string } | null
    return {
      id: c.id,
      title: mandate?.address || mandate?.property_type || 'Mandat',
      subtitle: c.amount ? formatEUR(c.amount) : 'Montant à définir',
      meta: c.paid_date ? 'paye' : 'attente',
      href: `/dashboard/commissions/${c.id}`,
    }
  })

  const table = (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium">Mandat</th>
            <th className="px-4 py-3 font-medium">Montant</th>
            <th className="px-4 py-3 font-medium">Statut</th>
            <th className="px-4 py-3 font-medium">Date de paiement</th>
          </tr>
        </thead>
        <tbody>
          {!commissions?.length && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                Aucune commission pour l&apos;instant.
              </td>
            </tr>
          )}
          {commissions?.map((c) => {
            const mandate = c.mandates as unknown as { id: string; address: string; property_type: string } | null
            return (
              <tr key={c.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/commissions/${c.id}`} className="font-medium text-neutral-900 hover:underline">
                    {mandate?.address || mandate?.property_type || 'Mandat'}
                  </Link>
                </td>
                <td className="px-4 py-3 tabular-nums text-neutral-600">{c.amount ? formatEUR(c.amount) : '—'}</td>
                <td className="px-4 py-3 text-neutral-600">{c.paid_date ? 'Payé' : 'En attente'}</td>
                <td className="px-4 py-3 text-neutral-600">{c.paid_date ? formatDate(c.paid_date) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Commissions</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {commissions?.length ?? 0} commission{(commissions?.length ?? 0) > 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Payé" value={formatEUR(totalPaid)} sub={`${paid.length} commission${paid.length > 1 ? 's' : ''}`} />
        <StatTile
          label="En attente"
          value={formatEUR(totalPending)}
          sub={`${pending.length} commission${pending.length > 1 ? 's' : ''}`}
        />
        <StatTile label="Mandats signés" value={String(mandatesSignedCount)} />
        <StatTile label="Taux de conversion" value={`${conversion}%`} sub="vendeurs → mandats" />
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-900">Mandats signés par mois</h2>
        <div className="mt-4 flex flex-col gap-2">
          {bars.map((b) => (
            <div key={b.month} className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-xs text-neutral-500">{b.label}</span>
              <div className="h-2.5 flex-1 rounded-full bg-neutral-100">
                <div
                  className="h-2.5 rounded-full bg-neutral-900"
                  style={{ width: `${(b.count / maxBar) * 100}%` }}
                />
              </div>
              <span className="w-4 shrink-0 text-right text-xs tabular-nums text-neutral-500">{b.count}</span>
            </div>
          ))}
        </div>
      </div>

      <NewCommissionForm options={options} />

      <CommissionsView table={table} cards={cards} />
    </div>
  )
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-neutral-400">{sub}</p>}
    </div>
  )
}
