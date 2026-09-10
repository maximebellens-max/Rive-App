'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { nextColumnColor, CATEGORY_BOARD_TYPES, BOARD_LABELS, type BoardType } from '@/lib/rive/pipelines'
import { ensureMandateDraftForLead, activateMandateForLead } from '@/lib/rive/automation'
import { notifyNewLead } from '@/lib/rive/new-lead-notify'
import { guessCivility } from '@/lib/rive/civility'

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
  revalidatePath(`/dashboard/pipelines/${boardType}`)
}

export async function moveLeadCard(leadId: string, boardType: BoardType, columnId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  const { data: lead } = await supabase
    .from('leads')
    .select('id, agency_id, category, name, critere_lieu, critere_type, surface_min, budget, positions')
    .eq('id', leadId)
    .single()
  if (!lead) return

  const positions = { ...((lead.positions as Record<string, string>) ?? {}), [boardType]: columnId }

  await supabase.from('leads').update({ positions }).eq('id', leadId)

  // Chaîne d'automatisation : entrer dans l'avant-dernière colonne (étape
  // estimation) crée un brouillon de mandat ; entrer dans la dernière colonne
  // (mandat signé) l'active. Uniquement sur les pipelines Vendeur/Investisseur.
  if (boardType === 'vendeur' || boardType === 'investisseur') {
    const { data: columns } = await supabase
      .from('pipeline_columns')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('board_type', boardType)
      .order('position', { ascending: true })

    const ids = (columns ?? []).map((c) => c.id)
    const idx = ids.indexOf(columnId)
    if (idx >= 0 && idx === ids.length - 1) {
      await activateMandateForLead(supabase, lead)
      revalidatePath('/dashboard/mandates')
    } else if (idx >= 0 && idx === ids.length - 2) {
      await ensureMandateDraftForLead(supabase, lead)
    }
  }

  revalidateBoard(boardType)
}

export async function quickAddLead(boardType: BoardType, columnId: string, formData: FormData) {
  const { supabase, agencyId, userId } = await getAgencyId()
  if (!agencyId) return

  const raw = str(formData, 'name')
  if (!raw) return

  // "leads.name" est une colonne calculée (first_name + last_name) : on ne
  // peut pas y écrire directement. Le champ rapide ne comporte qu'une seule
  // case "Prénom Nom" — on la découpe au 1er espace, comme pour la fiche
  // mandat (app/actions/mandates.ts).
  const [firstName, ...rest] = raw.split(/\s+/)
  const lastName = rest.join(' ')

  const positions: Record<string, string> = { [boardType]: columnId }

  const category = CATEGORY_BOARD_TYPES.has(boardType) ? boardType : null

  const { data: newLead } = await supabase
    .from('leads')
    .insert({
      agency_id: agencyId,
      assigned_to: userId,
      first_name: firstName,
      last_name: lastName,
      civility: guessCivility(firstName) ?? 'Monsieur',
      // Seuls les 3 tableaux de catégorie fixent leads.category (contrainte en
      // base) — un tableau personnalisé ne catégorise jamais le prospect.
      category,
      positions,
    })
    .select('id, name')
    .single()

  if (newLead?.id) {
    await notifyNewLead(supabase, agencyId, {
      id: newLead.id,
      name: newLead.name,
      category,
      source: `Ajout direct — ${BOARD_LABELS[boardType] ?? 'tableau personnalisé'}`,
      ownerId: userId,
    })
  }

  revalidateBoard(boardType)
}

export async function renamePipelineColumn(columnId: string, boardType: BoardType, name: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId || !name.trim()) return
  await supabase.from('pipeline_columns').update({ name: name.trim() }).eq('id', columnId).eq('agency_id', agencyId)
  revalidateBoard(boardType)
}

// Écrit désormais un override PERSONNEL (profiles.column_colors), pas la
// couleur partagée de la colonne (pipeline_columns.color, qui reste la
// couleur "par défaut" de l'agence pour qui n'a pas fait son propre choix) —
// chaque agent personnalise ses tableaux sans changer ceux des autres.
export async function recolorPipelineColumn(columnId: string, boardType: BoardType, color: string) {
  const { supabase, agencyId, userId } = await getAgencyId()
  if (!agencyId || !userId) return

  const { data: profile } = await supabase.from('profiles').select('column_colors').eq('id', userId).single()
  const columnColors = { ...((profile?.column_colors as Record<string, string>) ?? {}), [columnId]: color }

  await supabase.from('profiles').update({ column_colors: columnColors }).eq('id', userId)
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

  const { data: target } = await supabase
    .from('pipeline_columns')
    .select('is_default')
    .eq('id', columnId)
    .eq('agency_id', agencyId)
    .maybeSingle()

  if (target?.is_default) {
    return { error: 'Cette étape par défaut ne peut pas être supprimée, pour éviter de mélanger le pipeline.' }
  }

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

  if (affected && affected.length > 0) {
    // Un seul aller-retour pour tous les prospects concernés, au lieu d'un
    // update par prospect.
    const updates = affected.map((lead) => ({
      id: lead.id,
      positions: { ...((lead.positions as Record<string, string>) ?? {}), [boardType]: fallbackId },
    }))
    await supabase.from('leads').upsert(updates)
  }

  await supabase.from('pipeline_columns').delete().eq('id', columnId).eq('agency_id', agencyId)
  revalidateBoard(boardType)
  return undefined
}

// Raccourci "✓ Traité" — depuis la fiche prospect ou le widget "Nouveaux
// prospects à contacter" de l'onglet Aujourd'hui, fait avancer le prospect de
// la 1ère à la 2ème colonne de SON tableau de catégorie (vendeur/acheteur/
// investisseur — déjà le sien depuis sa création, pas de changement de
// tableau). Ne fait rien s'il a déjà été déplacé ailleurs à la main, pour ne
// jamais faire reculer un prospect déjà avancé dans le pipeline.
export async function markLeadContacted(leadId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  const { data: lead } = await supabase.from('leads').select('id, category, positions').eq('id', leadId).single()
  if (!lead?.category) return

  const boardType = lead.category as BoardType
  const { data: columns } = await supabase
    .from('pipeline_columns')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('board_type', boardType)
    .order('position', { ascending: true })

  const ids = (columns ?? []).map((c) => c.id)
  if (ids.length < 2) return

  const currentColumnId = (lead.positions as Record<string, string> | null)?.[boardType]
  if (currentColumnId !== ids[0]) return

  await moveLeadCard(leadId, boardType, ids[1])
  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/prospects/${leadId}`)
}