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

function str(formData: FormData, key: string): string {
  return String(formData.get(key) || '').trim()
}

export type PartnerFormState = { error?: string } | undefined

export async function createPartner(_prevState: PartnerFormState, formData: FormData): Promise<PartnerFormState> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const name = str(formData, 'name')
  if (!name) return { error: 'Le nom est obligatoire.' }

  const { error } = await supabase.from('partners').insert({
    agency_id: agencyId,
    name,
    role: str(formData, 'role'),
    phone: str(formData, 'phone'),
    email: str(formData, 'email'),
    notes: str(formData, 'notes'),
  })

  if (error) return { error: 'Impossible d’ajouter le contact.' }
  revalidatePath('/dashboard/partners')
}

export async function updatePartner(partnerId: string, formData: FormData) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase
    .from('partners')
    .update({
      name: str(formData, 'name'),
      role: str(formData, 'role'),
      phone: str(formData, 'phone'),
      email: str(formData, 'email'),
      notes: str(formData, 'notes'),
    })
    .eq('id', partnerId)

  revalidatePath('/dashboard/partners')
}

export async function deletePartner(partnerId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('partners').delete().eq('id', partnerId)
  revalidatePath('/dashboard/partners')
}
