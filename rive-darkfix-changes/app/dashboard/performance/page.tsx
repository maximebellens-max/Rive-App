import { createClient } from '@/lib/supabase/server'
import { formatEUR } from '@/lib/rive/mandates'
import { sourcePerformance } from '@/lib/rive/analytics'

export default async function PerformancePage() {
  const supabase = await createClient()

  const [{ data: leads }, { data: mandates }, { data: commissions }] = await Promise.all([
    supabase.from('leads').select('id, source'),
    supabase.from('mandates').select('lead_id, stage, is_draft'),
    supabase.from('commissions').select('amount, mandates ( lead_id )'),
  ])

  const commissionsByLead = new Map<string, number>()
  for (const c of commissions ?? []) {
    const mandate = c.mandates as unknown as { lead_id: string | null } | null
    if (!mandate?.lead_id) continue
    commissionsByLead.set(mandate.lead_id, (commissionsByLead.get(mandate.lead_id) ?? 0) + (c.amount || 0))
  }

  const stats = sourcePerformance(leads ?? [], mandates ?? [], commissionsByLead)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Performance</h1>
        <p className="mt-1 text-sm text-neutral-500">Conversion et commissions générées par source de prospect.</p>
      </div>

      {!stats.length ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-surface py-16 text-center shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Pas encore de données</h2>
          <p className="max-w-sm text-sm text-neutral-500">
            Renseigne la source de tes prospects pour voir apparaître les performances par canal.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Leads</th>
                <th className="px-4 py-3 font-medium">Mandats</th>
                <th className="px-4 py-3 font-medium">Conversion</th>
                <th className="px-4 py-3 font-medium">Commissions</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.source} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-neutral-900">{s.source}</td>
                  <td className="px-4 py-3 tabular-nums text-neutral-600">{s.leads}</td>
                  <td className="px-4 py-3 tabular-nums text-neutral-600">{s.mandates}</td>
                  <td className="px-4 py-3 tabular-nums text-neutral-600">{s.conversion}%</td>
                  <td className="px-4 py-3 tabular-nums text-neutral-600">{formatEUR(s.commissions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
