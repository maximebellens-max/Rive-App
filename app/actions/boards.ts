'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function getAgencyId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, agencyId: null }

  const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
  return { supabase, agencyId: profile?.agency_id ?? null }
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) || '').trim()
}

// Crée un tableau Kanban personnalisé (au-delà des 4 tableaux fixes), avec
// une colonne de départ, et redirige directement dessus — repris à l'identique
// du prototype (createBoard).
export async function createBoard(formData: FormData) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  const name = str(formData, 'name')
  if (!name) return

  const { count } = await supabase
    .from('boards')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('kind', 'custom')

  const { data: board } = await supabase
    .from('boards')
    .insert({ agency_id: agencyId, name, kind: 'custom', position: count ?? 0 })
    .select('id')
    .single()

  if (!board) return

  await supabase.from('pipeline_columns').insert({
    agency_id: agencyId,
    board_type: board.id,
    name: 'Nouveau',
    color: 'slate',
    position: 0,
  })

  revalidatePath('/dashboard', 'layout')
  redirect(`/dashboard/pipelines/${board.id}`)
}

export async function renameBoard(boardId: string, name: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId || !name.trim()) return

  await supabase
    .from('boards')
    .update({ name: name.trim() })
    .eq('id', boardId)
    .eq('agency_id', agencyId)
    .eq('kind', 'custom')

  revalidatePath('/dashboard', 'layout')
  revalidatePath(`/dashboard/pipelines/${boardId}`)
}

export type DeleteBoardResult = { error?: string } | undefined

// Supprime un tableau personnalisé (jamais un tableau fixe — appliqué côté
// base par delete_board) : retire sa clé des positions de chaque prospect,
// supprime ses colonnes en cascade, puis le tableau lui-même.
export async function deleteBoard(boardId: string): Promise<DeleteBoardResult> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const { error } = await supabase.rpc('delete_board', { p_board_id: boardId })
  if (error) return { error: 'Impossible de supprimer ce tableau.' }

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard/prospects')
}
