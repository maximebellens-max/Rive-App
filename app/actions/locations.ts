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

function num(formData: FormData, key: string): number | null {
  const v = formData.get(key)
  if (!v || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

export type Tenant = { nom: string; statut: string }

// Le nombre de locataires varie (location seule vs colocation à plusieurs
// chambres) — la liste arrive en JSON depuis le champ caché de l'éditeur de
// locataires côté client, on la reparse ici en la validant plutôt que de lui
// faire confiance telle quelle.
function parseTenants(formData: FormData): Tenant[] {
  const raw = str(formData, 'locataires_json')
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((t) => t && typeof t.nom === 'string')
      .map((t) => ({ nom: String(t.nom).trim(), statut: String(t.statut || 'en_attente') }))
      .filter((t) => t.nom)
  } catch {
    return []
  }
}

export type LocationFormState = { error?: string } | undefined

// Ajout rapide : on ne demande que le prospect (bailleur/client) concerné, le
// reste se complète ensuite depuis la fiche détail.
export async function createLocation(_prevState: LocationFormState, formData: FormData): Promise<LocationFormState> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const leadId = str(formData, 'lead_id')
  if (!leadId) return { error: 'Choisis un prospect.' }

  const { error } = await supabase.from('rental_listings').insert({ agency_id: agencyId, lead_id: leadId })
  if (error) return { error: 'Impossible de créer la mise en location.' }

  revalidatePath('/dashboard/locations')
}

export async function updateLocation(
  locationId: string,
  _prevState: LocationFormState,
  formData: FormData
): Promise<LocationFormState> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const { error } = await supabase
    .from('rental_listings')
    .update({
      assigned_to: str(formData, 'assigned_to') || null,
      type_location: str(formData, 'type_location') || 'longue_duree',
      honoraires_bailleur: num(formData, 'honoraires_bailleur'),
      honoraires_locataire: num(formData, 'honoraires_locataire'),
      locataires: parseTenants(formData),
      dossier_url: str(formData, 'dossier_url'),
      commentaire: str(formData, 'commentaire'),
    })
    .eq('id', locationId)

  if (error) return { error: 'Impossible d’enregistrer les modifications.' }

  revalidatePath(`/dashboard/locations/${locationId}`)
  revalidatePath('/dashboard/locations')
  return undefined
}

export async function deleteLocation(locationId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('rental_listings').delete().eq('id', locationId)
  revalidatePath('/dashboard/locations')
  redirect('/dashboard/locations')
}

export async function moveLocationStage(locationId: string, stage: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('rental_listings').update({ stage }).eq('id', locationId)
  revalidatePath('/dashboard/locations')
}