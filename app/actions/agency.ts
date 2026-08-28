'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type AgencySettingsState = { error?: string; success?: boolean } | undefined

function str(formData: FormData, key: string): string {
  return String(formData.get(key) || '').trim()
}

function num(formData: FormData, key: string): number | null {
  const v = formData.get(key)
  if (!v || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

export async function updateAgencySettings(
  _prevState: AgencySettingsState,
  formData: FormData
): Promise<AgencySettingsState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée, reconnecte-toi.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) return { error: 'Agence introuvable.' }
  if (profile.role !== 'owner') {
    return { error: 'Seul le titulaire de l’agence peut modifier ces informations.' }
  }

  const { error } = await supabase
    .from('agencies')
    .update({
      name: str(formData, 'name'),
      legal_form: str(formData, 'legal_form'),
      share_capital: num(formData, 'share_capital'),
      siren: str(formData, 'siren'),
      rcs_city: str(formData, 'rcs_city'),
      address: str(formData, 'address'),
      phone: str(formData, 'phone'),
      email: str(formData, 'email'),
      legal_rep_civility: str(formData, 'legal_rep_civility'),
      legal_rep_first_name: str(formData, 'legal_rep_first_name'),
      legal_rep_last_name: str(formData, 'legal_rep_last_name'),
      carte_pro_number: str(formData, 'carte_pro_number'),
      carte_pro_date: str(formData, 'carte_pro_date') || null,
      carte_pro_cci: str(formData, 'carte_pro_cci'),
      insurer_name: str(formData, 'insurer_name'),
      insurer_address: str(formData, 'insurer_address'),
      insurer_policy_number: str(formData, 'insurer_policy_number'),
      next_mandate_number: num(formData, 'next_mandate_number') ?? 1,
    })
    .eq('id', profile.agency_id)

  if (error) return { error: 'Impossible d’enregistrer les modifications.' }

  revalidatePath('/dashboard/settings')
  return { success: true }
}
