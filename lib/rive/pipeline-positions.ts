// Aide serveur partagée : calcule/ajuste la position d'un prospect dans les
// tableaux Kanban (Prospects + tableau de sa catégorie). Utilisé par les
// server actions de app/actions/leads.ts et app/actions/pipelines.ts.
import type { SupabaseClient } from '@supabase/supabase-js'

export async function firstColumnId(
  supabase: SupabaseClient,
  agencyId: string,
  boardType: string
): Promise<string | null> {
  const { data } = await supabase
    .from('pipeline_columns')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('board_type', boardType)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

// Positions initiales d'un nouveau prospect : toujours sur Prospects (1ère
// colonne), et sur le tableau de sa catégorie si elle est renseignée.
export async function initialPositions(
  supabase: SupabaseClient,
  agencyId: string,
  category: string | null
): Promise<Record<string, string>> {
  const positions: Record<string, string> = {}
  const prospectsCol = await firstColumnId(supabase, agencyId, 'prospects')
  if (prospectsCol) positions.prospects = prospectsCol
  if (category) {
    const catCol = await firstColumnId(supabase, agencyId, category)
    if (catCol) positions[category] = catCol
  }
  return positions
}

// Recalcule les positions quand la catégorie d'un prospect change : retire sa
// position sur l'ancien tableau de catégorie, ajoute la 1ère colonne du
// nouveau tableau (si elle n'y est pas déjà), et garantit toujours une
// position sur Prospects.
export async function reconcilePositionsOnCategoryChange(
  supabase: SupabaseClient,
  agencyId: string,
  currentPositions: Record<string, string>,
  oldCategory: string | null,
  newCategory: string | null
): Promise<Record<string, string>> {
  const positions = { ...currentPositions }

  if (!positions.prospects) {
    const prospectsCol = await firstColumnId(supabase, agencyId, 'prospects')
    if (prospectsCol) positions.prospects = prospectsCol
  }

  if (oldCategory !== newCategory) {
    if (oldCategory) delete positions[oldCategory]
    if (newCategory && !positions[newCategory]) {
      const col = await firstColumnId(supabase, agencyId, newCategory)
      if (col) positions[newCategory] = col
    }
  }

  return positions
}
