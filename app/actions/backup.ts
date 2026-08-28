'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { DELETE_ORDER, INSERT_ORDER, isRiveBackup } from '@/lib/rive/backup'

const CHUNK_SIZE = 500

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export type ImportBackupResult = { error?: string; success?: boolean }

export async function importBackup(json: string): Promise<ImportBackupResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée, reconnecte-toi.' }

  const { data: profile } = await supabase.from('profiles').select('agency_id, role').eq('id', user.id).single()
  const agencyId = profile?.agency_id
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }
  if (profile.role !== 'owner') {
    return { error: 'Seul le propriétaire de l’agence peut importer une sauvegarde.' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { error: 'Fichier invalide — impossible de le lire.' }
  }

  if (!isRiveBackup(parsed)) {
    return { error: 'Ce fichier ne ressemble pas à une sauvegarde Rive valide.' }
  }

  // 1. Supprime toutes les données actuelles de l'agence (des tables enfants
  //    vers les tables parentes, pour respecter les clés étrangères).
  for (const table of DELETE_ORDER) {
    const { error } = await supabase.from(table).delete().eq('agency_id', agencyId)
    if (error) return { error: `Échec de la suppression des données existantes (${table}).` }
  }

  // 2. Réinsère les données de la sauvegarde (des tables parentes vers les
  //    tables enfants), en forçant agency_id sur l'agence courante — jamais
  //    celle du fichier, pour ne jamais pouvoir écrire dans une autre agence.
  for (const table of INSERT_ORDER) {
    const rows = parsed.tables[table] ?? []
    if (rows.length === 0) continue

    const scopedRows = rows.map((row) => ({ ...row, agency_id: agencyId }))

    for (const batch of chunk(scopedRows, CHUNK_SIZE)) {
      const { error } = await supabase.from(table).insert(batch)
      if (error) return { error: `Échec de la restauration des données (${table}).` }
    }
  }

  // 3. Restaure les réglages de l'agence (identité légale, numérotation des
  //    mandats, etc.), sans jamais toucher à id / created_at.
  if (parsed.agency) {
    const { id: _id, created_at: _createdAt, ...agencyFields } = parsed.agency as Record<string, unknown>
    void _id
    void _createdAt
    const { error } = await supabase.from('agencies').update(agencyFields).eq('id', agencyId)
    if (error) return { error: 'Les données ont été restaurées, mais les réglages de l’agence n’ont pas pu être mis à jour.' }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
