'use server'

import { revalidatePath } from 'next/cache'
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

const VALID_CATEGORIES = new Set(['acheteur', 'vendeur', 'investisseur_france', 'investisseur_dubai', 'investisseur_georgie'])

export type LandingPageState = { error?: string } | undefined

export async function createLandingPage(_prevState: LandingPageState, formData: FormData): Promise<LandingPageState> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const label = String(formData.get('label') || '').trim()
  const url = String(formData.get('url') || '').trim()
  const category = String(formData.get('category') || '')
  const ownerId = String(formData.get('owner_id') || '') || null

  if (!label) return { error: 'Donne un nom à cette landing page.' }
  if (!VALID_CATEGORIES.has(category)) return { error: 'Choisis un tableau de destination.' }

  const { error } = await supabase.from('landing_pages').insert({
    agency_id: agencyId,
    label,
    url,
    category,
    owner_id: ownerId,
  })
  if (error) return { error: 'Échec de la création.' }

  revalidatePath('/dashboard/settings')
  return undefined
}

export async function updateLandingPage(
  landingPageId: string,
  _prevState: LandingPageState,
  formData: FormData
): Promise<LandingPageState> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const label = String(formData.get('label') || '').trim()
  const url = String(formData.get('url') || '').trim()
  const category = String(formData.get('category') || '')
  const ownerId = String(formData.get('owner_id') || '') || null

  if (!label) return { error: 'Donne un nom à cette landing page.' }
  if (!VALID_CATEGORIES.has(category)) return { error: 'Choisis un tableau de destination.' }

  const { error } = await supabase
    .from('landing_pages')
    .update({ label, url, category, owner_id: ownerId, updated_at: new Date().toISOString() })
    .eq('id', landingPageId)
    .eq('agency_id', agencyId)
  if (error) return { error: 'Échec de la mise à jour.' }

  revalidatePath('/dashboard/settings')
  return undefined
}

export async function deleteLandingPage(landingPageId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('landing_pages').delete().eq('id', landingPageId).eq('agency_id', agencyId)
  revalidatePath('/dashboard/settings')
}