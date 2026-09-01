'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FEATURE_KEYS, type Features } from '@/lib/rive/mandates'
import { maybeCreateCommissionForMandate } from '@/lib/rive/automation'
import { initialPositions } from '@/lib/rive/pipeline-positions'

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
  // Un mandat "brouillon" (créé depuis la page Estimations, avant tout
  // engagement signé) n'exige pas encore une adresse complète — le bien peut
  // n'être identifié que par un secteur à ce stade.
  const isDraft = str(formData, 'is_draft') === 'true'

  const address = str(formData, 'address')
  if (type === 'vente' && !isDraft && !address) {
    return { error: "L'adresse du bien est obligatoire pour un mandat de vente." }
  }

  let leadId = str(formData, 'lead_id') || null
  let newLeadCreated = false

  // Nouveau client créé à la volée depuis le formulaire (au lieu de passer
  // par l'onglet Prospects) : rejoint automatiquement le pipeline de sa
  // catégorie, déduite du type de mandat (vente → vendeur, recherche →
  // acheteur).
  if (!leadId) {
    const newLeadFirstName = str(formData, 'new_lead_first_name')
    const newLeadLastName = str(formData, 'new_lead_last_name')
    if (newLeadFirstName || newLeadLastName) {
      const category = type === 'recherche' ? 'acheteur' : 'vendeur'
      const positions = await initialPositions(supabase, agencyId, category)
      const { data: newLead } = await supabase
        .from('leads')
        .insert({
          agency_id: agencyId,
          assigned_to: userId,
          name: `${newLeadFirstName} ${newLeadLastName}`.trim(),
          phone: str(formData, 'new_lead_phone'),
          email: str(formData, 'new_lead_email'),
          category,
          civility: str(formData, 'new_lead_civility') || 'Monsieur',
          positions,
        })
        .select('id')
        .single()
      leadId = newLead?.id ?? null
      newLeadCreated = !!leadId
    }
  }

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
      annual_energy_cost: num(formData, 'annual_energy_cost'),
      property_tax: num(formData, 'property_tax'),
      other_charges: num(formData, 'other_charges'),
      other_charges_note: str(formData, 'other_charges_note'),
      notes: str(formData, 'notes'),
      is_draft: isDraft,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: 'Impossible de créer le mandat.' }
  }

  // Reprend automatiquement l'état civil du prospect lié comme mandant, pour
  // éviter de ressaisir ce qui est déjà sur sa fiche (que ce soit un
  // prospect existant ou celui qu'on vient de créer ci-dessus).
  if (leadId) {
    const { data: lead } = await supabase
      .from('leads')
      .select('name, phone, email, civility, address, birth_date, birth_place, nationality, marital_status')
      .eq('id', leadId)
      .single()

    if (lead?.name) {
      const [firstName, ...rest] = lead.name.trim().split(/\s+/)
      await supabase.from('mandate_parties').insert({
        agency_id: agencyId,
        mandate_id: data.id,
        position: 0,
        civility: lead.civility || 'Monsieur',
        first_name: firstName || '',
        last_name: rest.join(' '),
        address: lead.address || '',
        birth_date: lead.birth_date || null,
        birth_place: lead.birth_place || '',
        nationality: lead.nationality || '',
        marital_status: lead.marital_status || '',
        phone: lead.phone || '',
        email: lead.email || '',
      })
    }
  }

  if (newLeadCreated) revalidatePath('/dashboard/prospects')
  revalidatePath(isDraft ? '/dashboard/estimations' : '/dashboard/mandates')
  redirect(`/dashboard/mandates/${data.id}`)
}

export async function updateMandate(
  mandateId: string,
  _prevState: MandateFormState,
  formData: FormData
): Promise<MandateFormState> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const { data: before } = await supabase
    .from('mandates')
    .select('stage, type, price, sold_date')
    .eq('id', mandateId)
    .single()

  const newStage = str(formData, 'stage') || 'en_cours'
  const justSold = newStage === 'vendu' && before?.stage !== 'vendu'
  const soldDate = str(formData, 'sold_date') || (justSold ? before?.sold_date || new Date().toISOString().slice(0, 10) : null)

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
      sold_date: soldDate,
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
      annual_energy_cost: num(formData, 'annual_energy_cost'),
      property_tax: num(formData, 'property_tax'),
      other_charges: num(formData, 'other_charges'),
      other_charges_note: str(formData, 'other_charges_note'),
      ai_summary: str(formData, 'ai_summary'),
      notes: str(formData, 'notes'),
      stage: newStage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', mandateId)

  if (error) return { error: 'Impossible d’enregistrer les modifications.' }

  // Une commission est créée automatiquement la première fois qu'un mandat
  // passe à l'étape "Vendu" — inutile de la ressaisir à la main.
  if (justSold && before) {
    await maybeCreateCommissionForMandate(supabase, {
      id: mandateId,
      agency_id: agencyId,
      type: before.type,
      price: num(formData, 'price') ?? before.price,
    })
    revalidatePath('/dashboard/commissions')
  }

  revalidatePath(`/dashboard/mandates/${mandateId}`)
  revalidatePath('/dashboard/mandates')
  revalidatePath('/dashboard/estimations')
  return undefined
}

// Déplacement rapide depuis le tableau Kanban des mandats (en_cours /
// compromis_signe / vendu) — même logique de création de commission que
// updateMandate quand l'étape "Vendu" est atteinte.
export async function moveMandateStage(mandateId: string, stage: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  const { data: before } = await supabase
    .from('mandates')
    .select('stage, type, price, sold_date')
    .eq('id', mandateId)
    .single()
  if (!before) return

  const justSold = stage === 'vendu' && before.stage !== 'vendu'
  const soldDate = justSold ? before.sold_date || new Date().toISOString().slice(0, 10) : before.sold_date

  await supabase
    .from('mandates')
    .update({ stage, sold_date: soldDate, is_draft: false, updated_at: new Date().toISOString() })
    .eq('id', mandateId)

  if (justSold) {
    await maybeCreateCommissionForMandate(supabase, {
      id: mandateId,
      agency_id: agencyId,
      type: before.type,
      price: before.price,
    })
    revalidatePath('/dashboard/commissions')
  }

  revalidatePath('/dashboard/mandates')
  revalidatePath(`/dashboard/mandates/${mandateId}`)
}

// Fait passer un brouillon d'estimation au statut de mandat réel : dévoile
// alors le prix, l'exclusivité/durée et le suivi sur la fiche. La bascule se
// fait aussi automatiquement quand le prospect lié atteint la dernière
// colonne de son pipeline (signature) — utile ici pour les biens sans
// prospect lié, ou pour la déclencher manuellement plus tôt.
export async function activateMandateDraft(mandateId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase
    .from('mandates')
    .update({ is_draft: false, updated_at: new Date().toISOString() })
    .eq('id', mandateId)

  revalidatePath(`/dashboard/mandates/${mandateId}`)
  revalidatePath('/dashboard/mandates')
  revalidatePath('/dashboard/estimations')
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
    is_active_listing: formData.get('is_active_listing') === 'on',
  })

  revalidatePath(`/dashboard/mandates/${mandateId}`)
}

export async function removeDvfComparable(mandateId: string, comparableId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('dvf_comparables').delete().eq('id', comparableId)
  revalidatePath(`/dashboard/mandates/${mandateId}`)
}