'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type LeadFormState = { error?: string } | undefined

export async function createLead(
  _prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const name = String(formData.get('name') || '').trim()
  const phone = String(formData.get('phone') || '').trim()
  const email = String(formData.get('email') || '').trim()
  const category = String(formData.get('category') || '')
  const critereLieu = String(formData.get('critere_lieu') || '').trim()

  if (!name) {
    return { error: 'Le nom du prospect est obligatoire.' }
  }
  if (!['acheteur', 'vendeur', 'investisseur'].includes(category)) {
    return { error: 'Catégorie invalide.' }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Session expirée, reconnecte-toi.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { error: 'Impossible de retrouver ton agence.' }
  }

  const { error: insertError } = await supabase.from('leads').insert({
    agency_id: profile.agency_id,
    assigned_to: user.id,
    name,
    phone,
    email,
    category,
    critere_lieu: critereLieu,
  })

  if (insertError) {
    return { error: "Impossible d'ajouter le prospect." }
  }

  revalidatePath('/dashboard/prospects')
}
