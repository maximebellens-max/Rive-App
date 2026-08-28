import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import KanbanBoard from '../kanban-board'
import BoardHeader from '../board-header'
import { leadPriorityScore, BOARD_LABELS, CATEGORY_BOARD_TYPES } from '@/lib/rive/pipelines'

export default async function PipelineBoardPage({ params }: PageProps<'/dashboard/pipelines/[boardType]'>) {
  const { boardType: bt } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
  if (!profile?.agency_id) notFound()

  const isFixedCategoryBoard = CATEGORY_BOARD_TYPES.has(bt)

  let boardName: string
  let isCustom = false

  if (isFixedCategoryBoard) {
    boardName = BOARD_LABELS[bt]
  } else {
    const { data: board } = await supabase
      .from('boards')
      .select('id, name, kind')
      .eq('id', bt)
      .eq('agency_id', profile.agency_id)
      .maybeSingle()
    if (!board) notFound()
    boardName = board.name
    isCustom = board.kind === 'custom'
  }

  const { data: columns } = await supabase
    .from('pipeline_columns')
    .select('id, name, color, is_default')
    .eq('board_type', bt)
    .order('position', { ascending: true })

  // Les tableaux de catégorie n'affichent que les prospects de cette
  // catégorie. Les tableaux personnalisés sont une vue additionnelle sur
  // l'ensemble des prospects de l'agence : un prospect peut y figurer en
  // plus de son tableau de catégorie habituel.
  const leadsQuery = isFixedCategoryBoard
    ? supabase
        .from('leads')
        .select(
          'id, name, category, phone, email, critere_lieu, critere_type, budget, financement, action_date, created_at, positions'
        )
        .eq('category', bt)
    : supabase
        .from('leads')
        .select(
          'id, name, category, phone, email, critere_lieu, critere_type, budget, financement, action_date, created_at, positions'
        )

  const { data: leadsRaw } = await leadsQuery

  const leads = isFixedCategoryBoard
    ? (leadsRaw ?? [])
    : (leadsRaw ?? []).filter(
        (l) => l.positions && Object.prototype.hasOwnProperty.call(l.positions as Record<string, string>, bt)
      )

  const leadIds = leads.map((l) => l.id)
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

  const cards = leads.map((l) => ({
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
    columnId: (l.positions as Record<string, string>)?.[bt] ?? null,
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
      {isCustom ? (
        <BoardHeader boardId={bt} name={boardName} count={cards.length} />
      ) : (
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{boardName}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {cards.length} prospect{cards.length > 1 ? 's' : ''}
          </p>
        </div>
      )}
      <KanbanBoard boardType={bt} columns={columns ?? []} cards={cards} />
    </div>
  )
}
