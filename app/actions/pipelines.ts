'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { firstColumnId } from '@/lib/rive/pipeline-positions'
import { nextColumnColor, type BoardType } from '@/lib/rive/pipelines'

async function getAgencyId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, agencyId: null, userId: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  return { supabase, agencyId: profile?.agency_id ?? null, userId: user.id }
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) || '').trim()
}

function revalidateBoard(boardType: BoardType) {
  revalidatePath(boardType === 'prospects' ? '/dashboard/prospects' : `/dashboard/pipelines/${boardType}`)
}

export async function moveLeadCard(leadId: string, boardType: BoardType, columnId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  const { data: lead } = await supabase.from('leads').select('positions').eq('id', leadId).single()
  if (!lead) return

  const positions = { ...((lead.positions as Record<string, string>) ?? {}), [boardType]: columnId }
  await supabase.from('leads').update({ positions }).eq('id', leadId)
  revalidateBoard(boardType)
}

export async function quickAddLead(boardType: BoardType, columnId: string, formData: FormData) {
  const { supabase, agencyId, userId } = await getAgencyId()
  if (!agencyId) return

  const name = str(formData, 'name')
  if (!name) return

  const positions: Record<string, string> = {}
  if (boardType === 'prospects') {
    positions.prospects = columnId
  } else {
    positions[boardType] = columnId
    const prospectsCol = await firstColumnId(supabase, agencyId, 'prospects')
    if (prospectsCol) positions.prospects = prospectsCol
  }

  await supabase.from('leads').insert({
    agency_id: agencyId,
    assigned_to: userId,
    name,
    category: boardType === 'prospects' ? null : boardType,
    positions,
  })

  revalidateBoard(boardType)
}

export async function renamePipelineColumn(columnId: string, boardType: BoardType, name: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId || !name.trim()) return
  await supabase.from('pipeline_columns').update({ name: name.trim() }).eq('id', columnId).eq('agency_id', agencyId)
  revalidateBoard(boardType)
}

export async function recolorPipelineColumn(columnId: string, boardType: BoardType, color: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return
  await supabase.from('pipeline_columns').update({ color }).eq('id', columnId).eq('agency_id', agencyId)
  revalidateBoard(boardType)
}

export async function addPipelineColumn(boardType: BoardType, name: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId || !name.trim()) return

  const { count } = await supabase
    .from('pipeline_columns')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('board_type', boardType)

  await supabase.from('pipeline_columns').insert({
    agency_id: agencyId,
    board_type: boardType,
    name: name.trim(),
    color: nextColumnColor(count ?? 0),
    position: count ?? 0,
  })

  revalidateBoard(boardType)
}

export type DeleteColumnResult = { error?: string } | undefined

export async function deletePipelineColumn(columnId: string, boardType: BoardType): Promise<DeleteColumnResult> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const { data: siblings } = await supabase
    .from('pipeline_columns')
    .select('id, position')
    .eq('agency_id', agencyId)
    .eq('board_type', boardType)
    .neq('id', columnId)
    .order('position', { ascending: true })

  if (!siblings || siblings.length === 0) {
    return { error: 'Impossible de supprimer la dernière colonne du tableau.' }
  }

  const fallbackId = siblings[0].id

  const { data: affected } = await supabase
    .from('leads')
    .select('id, positions')
    .eq('agency_id', agencyId)
    .contains('positions', { [boardType]: columnId })

  for (const lead of affected ?? []) {
    const positions = { ...((lead.positions as Record<string, string>) ?? {}), [boardType]: fallbackId }
    await supabase.from('leads').update({ positions }).eq('id', lead.id)
  }

  await supabase.from('pipeline_columns').delete().eq('id', columnId).eq('agency_id', agencyId)
  revalidateBoard(boardType)
  return undefined
}
