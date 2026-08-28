'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FEATURE_KEYS, type Features } from '@/lib/rive/mandates'

export type MandateFormState = { error?: string } | undefined

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

function readFeatures(formData: FormData): Features {
  const features: Features = {}
  for (const f of FEATURE_KEYS) {
    features[f.key] = formData.get(`feature_${f.key}`) === 'on'
  }
  return features
}

function num(formData: FormData, key: string): number | null {
  const v = formData.get(key)
  if (!v || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) || '').trim()
}

export async function createMandate(
  _prevState: MandateFormState,
  formData: FormData
): Promise<MandateFormState> {
  const { supabase, agencyId, userId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const kind = str(formData, 'kind') || 'vente_exclusif'
  const type = kind === 'recherche' ? 'recherche' : 'vente'
  const exclusivity = kind === 'vente_simple' ? 'simple' : kind === 'vente_exclusif' ? 'exclusif' : ''

  const address = str(formData, 'address')
  if (type === 'vente' && !address) {
    return { error: "L'adresse du bien est obligatoire pour un mandat de vente." }
  }

  const leadId = str(formData, 'lead_id') || null

  const { data, error } = await supabase
    .from('mandates')
    .insert({
      agency_id: agencyId,
      lead_id: leadId,
      assigned_to: userId,
      type,
      address,
      property_type: str(formData, 'property_type'),
      surface: num(formData, 'surface'),
      pieces: num(formData, 'pieces'),
      price: num(formData, 'price'),
      remaining_loan: num(formData, 'remaining_loan'),
      signed_date: str(formData, 'signed_date') || null,
      exclusivity,
      duration_months: num(formData, 'duration_months'),
      tacit_renewal: formData.get('tacit_renewal') === 'on',
      renewal_notice_days: num(formData, 'renewal_notice_days') ?? 15,
      condition: str(formData, 'condition'),
      dpe: str(formData, 'dpe'),
      floor: num(formData, 'floor'),
      has_elevator: formData.get('has_elevator') === 'on',
      features: readFeatures(formData),
      year_built: num(formData, 'year_built'),
      recent_works: str(formData, 'recent_works'),
      estimated_rent: num(formData, 'estimated_rent'),
      notes: str(formData, 'notes'),
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: 'Impossible de créer le mandat.' }
  }

  revalidatePath('/dashboard/mandates')
  redirect(`/dashboard/mandates/${data.id}`)
}

export async function updateMandate(
  mandateId: string,
  _prevState: MandateFormState,
  formData: FormData
): Promise<MandateFormState> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const { error } = await supabase
    .from('mandates')
    .update({
      address: str(formData, 'address'),
      property_type: str(formData, 'property_type'),
      surface: num(formData, 'surface'),
      pieces: num(formData, 'pieces'),
      price: num(formData, 'price'),
      remaining_loan: num(formData, 'remaining_loan'),
      signed_date: str(formData, 'signed_date') || null,
      sold_date: str(formData, 'sold_date') || null,
      exclusivity: str(formData, 'exclusivity'),
      duration_months: num(formData, 'duration_months'),
      tacit_renewal: formData.get('tacit_renewal') === 'on',
      renewal_notice_days: num(formData, 'renewal_notice_days') ?? 15,
      condition: str(formData, 'condition'),
      dpe: str(formData, 'dpe'),
      floor: num(formData, 'floor'),
      has_elevator: formData.get('has_elevator') === 'on',
      features: readFeatures(formData),
      year_built: num(formData, 'year_built'),
      recent_works: str(formData, 'recent_works'),
      estimated_rent: num(formData, 'estimated_rent'),
      ai_summary: str(formData, 'ai_summary'),
      notes: str(formData, 'notes'),
      stage: str(formData, 'stage') || 'en_cours',
      updated_at: new Date().toISOString(),
    })
    .eq('id', mandateId)

  if (error) return { error: 'Impossible d’enregistrer les modifications.' }

  revalidatePath(`/dashboard/mandates/${mandateId}`)
  revalidatePath('/dashboard/mandates')
  return undefined
}

export async function deleteMandate(mandateId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('mandates').delete().eq('id', mandateId)
  revalidatePath('/dashboard/mandates')
  redirect('/dashboard/mandates')
}

export async function addDvfComparable(mandateId: string, formData: FormData) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('dvf_comparables').insert({
    agency_id: agencyId,
    mandate_id: mandateId,
    address: str(formData, 'address'),
    sale_date: str(formData, 'sale_date') || null,
    surface: num(formData, 'surface'),
    price: num(formData, 'price'),
  })

  revalidatePath(`/dashboard/mandates/${mandateId}`)
}

export async function removeDvfComparable(mandateId: string, comparableId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('dvf_comparables').delete().eq('id', comparableId)
  revalidatePath(`/dashboard/mandates/${mandateId}`)
}
