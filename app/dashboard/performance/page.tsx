import { createClient } from '@/lib/supabase/server'
import { sourcePerformance } from '@/lib/rive/analytics'
import PerformanceTable from './performance-table'

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
        <PerformanceTable stats={stats} />
      )}
    </div>
  )
}