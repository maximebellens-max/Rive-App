'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function str(formData: FormData, key: string): string {
  return String(formData.get(key) || '').trim()
}

async function getAgencyId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, agencyId: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  return { supabase, agencyId: profile?.agency_id ?? null }
}

export async function addMandateParty(mandateId: string, formData: FormData) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  const { count } = await supabase
    .from('mandate_parties')
    .select('*', { count: 'exact', head: true })
    .eq('mandate_id', mandateId)

  await supabase.from('mandate_parties').insert({
    agency_id: agencyId,
    mandate_id: mandateId,
    position: count ?? 0,
    civility: str(formData, 'civility') || 'Monsieur',
    first_name: str(formData, 'first_name'),
    last_name: str(formData, 'last_name'),
    address: str(formData, 'address'),
    birth_date: str(formData, 'birth_date') || null,
    birth_place: str(formData, 'birth_place'),
    nationality: str(formData, 'nationality'),
    marital_status: str(formData, 'marital_status'),
    phone: str(formData, 'phone'),
    email: str(formData, 'email'),
  })

  revalidatePath(`/dashboard/mandates/${mandateId}`)
}

export async function removeMandateParty(mandateId: string, partyId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('mandate_parties').delete().eq('id', partyId)
  revalidatePath(`/dashboard/mandates/${mandateId}`)
}
