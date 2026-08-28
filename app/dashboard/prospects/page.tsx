import { createClient } from '@/lib/supabase/server'
import NewLeadForm from './new-lead-form'
import KanbanBoard from '../pipelines/kanban-board'
import { leadPriorityScore } from '@/lib/rive/pipelines'

export default async function ProspectsPage() {
  const supabase = await createClient()

  const { data: columns } = await supabase
    .from('pipeline_columns')
    .select('id, name, color, is_default')
    .eq('board_type', 'prospects')
    .order('position', { ascending: true })

  const { data: leads } = await supabase
    .from('leads')
    .select(
      'id, name, category, phone, email, critere_lieu, critere_type, budget, financement, action_date, created_at, positions'
    )
    .order('created_at', { ascending: false })

  const leadIds = (leads ?? []).map((l) => l.id)
  const { data: historyRows } = leadIds.length
    ? await supabase
        .from('lead_history_entries')
        .select('lead_id, entry_date')
        .in('lead_id', leadIds)
        .order('entry_date', { ascending: false })
    : { data: [] as { lead_id: string; entry_date: string }[] }

  const lastHistory: Record<string, string> = {}
  for (const row of historyRows ?? []) {
    if (!lastHistory[row.lead_id]) lastHistory[row.lead_id] = row.entry_date
  }

  const cards = (leads ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    category: l.category,
    phone: l.phone,
    email: l.email,
    critere_lieu: l.critere_lieu,
    critere_type: l.critere_type,
    budget: l.budget,
    financement: l.financement,
    action_date: l.action_date,
    columnId: (l.positions as Record<string, string>)?.prospects ?? null,
    score: leadPriorityScore({
      budget: l.budget,
      financement: l.financement,
      critere_lieu: l.critere_lieu,
      phone: l.phone,
      action_date: l.action_date,
      created_at: l.created_at,
      last_history_date: lastHistory[l.id] ?? null,
    }),
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Prospects</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {leads?.length ?? 0} prospect{(leads?.length ?? 0) > 1 ? 's' : ''}
        </p>
      </div>

      <NewLeadForm />

      <KanbanBoard boardType="prospects" columns={columns ?? []} cards={cards} />
    </div>
  )
}
