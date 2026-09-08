'use server'

// Actions pour les 3 tableaux de suivi denses (Ameublement, Cuisine,
// Travaux) — édition en ligne, donc une seule action "update" générique par
// tableau qui applique un patch de champs plutôt qu'une action par champ.
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

// ---------- Ameublement ----------

export async function createFurnishingProject(leadId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId || !leadId) return
  await supabase.from('furnishing_projects').insert({ agency_id: agencyId, lead_id: leadId })
  revalidatePath('/dashboard/ameublement')
}

export async function updateFurnishingProject(id: string, patch: Record<string, unknown>) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return
  await supabase.from('furnishing_projects').update(patch).eq('id', id)
  revalidatePath('/dashboard/ameublement')
}

export async function deleteFurnishingProject(id: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return
  await supabase.from('furnishing_projects').delete().eq('id', id)
  revalidatePath('/dashboard/ameublement')
}

// ---------- Cuisine ----------

export async function createKitchenProject(leadId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId || !leadId) return
  await supabase.from('kitchen_projects').insert({ agency_id: agencyId, lead_id: leadId })
  revalidatePath('/dashboard/cuisine')
}

export async function updateKitchenProject(id: string, patch: Record<string, unknown>) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return
  await supabase.from('kitchen_projects').update(patch).eq('id', id)
  revalidatePath('/dashboard/cuisine')
}

export async function deleteKitchenProject(id: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return
  await supabase.from('kitchen_projects').delete().eq('id', id)
  revalidatePath('/dashboard/cuisine')
}

// ---------- Travaux ----------

export async function createWorksProject(leadId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId || !leadId) return
  await supabase.from('works_projects').insert({ agency_id: agencyId, lead_id: leadId })
  revalidatePath('/dashboard/travaux')
}

export async function updateWorksProject(id: string, patch: Record<string, unknown>) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return
  await supabase.from('works_projects').update(patch).eq('id', id)
  revalidatePath('/dashboard/travaux')
}

export async function deleteWorksProject(id: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return
  await supabase.from('works_projects').delete().eq('id', id)
  revalidatePath('/dashboard/travaux')
}