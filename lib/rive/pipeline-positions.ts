// Aide serveur partagée : calcule/ajuste la position d'un prospect dans le
// tableau Kanban de sa catégorie (Vendeur/Acheteur/Investisseur). Utilisé par
// les server actions de app/actions/leads.ts et app/actions/pipelines.ts.
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

// Colonne d'un tableau retrouvée par son nom plutôt que par sa position —
// utile pour une étape par défaut précise (ex. "RDV 2 finalisé" sur
// Vendeurs) qui peut se décaler si l'agence a ajouté ses propres colonnes.
export async function columnIdByName(
  supabase: SupabaseClient,
  agencyId: string,
  boardType: string,
  name: string
): Promise<string | null> {
  const { data } = await supabase
    .from('pipeline_columns')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('board_type', boardType)
    .eq('name', name)
    .maybeSingle()
  return data?.id ?? null
}

// Colonne de repli pour un prospect qui n'est PAS un lead neuf à contacter :
// ajouté directement plus loin dans son pipeline (ex : quick-add sur une
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

// Positions initiales d'un nouveau prospect : la 1ère colonne du tableau de
// sa catégorie (Vendeur/Acheteur/Investisseur) si elle est renseignée — plus
// de tableau "Prospects" séparé à alimenter en double depuis qu'il a été
// retiré (un lead sans catégorie n'apparaît alors sur aucun tableau tant
// qu'elle n'est pas précisée).
export async function initialPositions(
  supabase: SupabaseClient,
  agencyId: string,
  category: string | null
): Promise<Record<string, string>> {
  const positions: Record<string, string> = {}
  if (category) {
    const catCol = await firstColumnId(supabase, agencyId, category)
    if (catCol) positions[category] = catCol
  }
  return positions
}

// Recalcule les positions quand la catégorie d'un prospect change : retire sa
// position sur l'ancien tableau de catégorie, ajoute la 1ère colonne du
// nouveau tableau (si elle n'y est pas déjà).
export async function reconcilePositionsOnCategoryChange(
  supabase: SupabaseClient,
  agencyId: string,
  currentPositions: Record<string, string>,
  oldCategory: string | null,
  newCategory: string | null
): Promise<Record<string, string>> {
  const positions = { ...currentPositions }

  if (oldCategory !== newCategory) {
    if (oldCategory) delete positions[oldCategory]
    if (newCategory && !positions[newCategory]) {
      const col = await firstColumnId(supabase, agencyId, newCategory)
      if (col) positions[newCategory] = col
    }
  }

  return positions
}