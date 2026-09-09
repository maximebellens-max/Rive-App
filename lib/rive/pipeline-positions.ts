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

export async function lastColumnId(
  supabase: SupabaseClient,
  agencyId: string,
  boardType: string
): Promise<string | null> {
  const { data } = await supabase
    .from('pipeline_columns')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('board_type', boardType)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

// La colonne "Client actif" du tableau Prospects (une étape par défaut parmi
// les autres, pas un tableau séparé) : un prospect y bascule automatiquement
// dès qu'un mandat (vente ou recherche) est signé/activé pour lui. Recherchée
// par son nom plutôt que par sa position, car une agence peut avoir ajouté
// ses propres étapes après elle sur ce même tableau.
export async function clientColumnId(supabase: SupabaseClient, agencyId: string): Promise<string | null> {
  const { data } = await supabase
    .from('pipeline_columns')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('board_type', 'prospects')
    .eq('name', 'Client actif')
    .maybeSingle()
  return data?.id ?? null
}

// Colonne de repli pour un prospect qui n'est PAS un lead neuf à contacter :
// ajouté directement plus loin dans un autre pipeline (ex : quick-add sur une
// colonne "Mandat en cours" du tableau Vendeur), ou créé à la volée depuis un
// mandat déjà en cours. On évite sa 1ère colonne (qui alimente le widget
// "Nouveaux prospects à contacter" côté Aujourd'hui et le fait ressortir à
// tort comme neuf) au profit de sa 3ème colonne par défaut ("Qualifié") — ou
// à défaut la dernière colonne disponible, si l'agence a un tableau plus
// court.
export async function engagedColumnId(
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
  const cols = data ?? []
  if (!cols.length) return null
  return cols[Math.min(2, cols.length - 1)].id
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