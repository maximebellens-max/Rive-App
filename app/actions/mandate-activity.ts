'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { DIFFUSION_PORTALS } from '@/lib/rive/diffusion'

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

function revalidateMandate(mandateId: string) {
  revalidatePath(`/dashboard/mandates/${mandateId}`)
}

// ---------- Visites ----------
export async function addMandateVisit(mandateId: string, formData: FormData) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  const leadId = str(formData, 'lead_id') || null
  await supabase.from('mandate_visits').insert({
    agency_id: agencyId,
    mandate_id: mandateId,
    lead_id: leadId,
    buyer_name: leadId ? '' : str(formData, 'buyer_name'),
    visit_date: str(formData, 'visit_date') || null,
    feedback: str(formData, 'feedback'),
  })

  revalidateMandate(mandateId)
}

export async function removeMandateVisit(mandateId: string, visitId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('mandate_visits').delete().eq('id', visitId)
  revalidateMandate(mandateId)
}

// ---------- Offres ----------
export async function addMandateOffer(mandateId: string, formData: FormData) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  const leadId = str(formData, 'lead_id') || null
  await supabase.from('mandate_offers').insert({
    agency_id: agencyId,
    mandate_id: mandateId,
    lead_id: leadId,
    buyer_name: leadId ? '' : str(formData, 'buyer_name'),
    amount: num(formData, 'amount'),
    offer_date: str(formData, 'offer_date') || null,
  })

  revalidateMandate(mandateId)
}

export async function updateOfferStatus(mandateId: string, offerId: string, status: 'accepted' | 'rejected') {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('mandate_offers').update({ status }).eq('id', offerId)
  revalidateMandate(mandateId)
}

export async function removeMandateOffer(mandateId: string, offerId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('mandate_offers').delete().eq('id', offerId)
  revalidateMandate(mandateId)
}

// ---------- Diffusion ----------
export async function updateDiffusion(mandateId: string, formData: FormData) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  const diffusion: Record<string, string> = {}
  for (const portal of DIFFUSION_PORTALS) {
    const date = str(formData, `portal_${portal}`)
    if (date) diffusion[portal] = date
  }

  await supabase
    .from('mandates')
    .update({
      diffusion,
      ad_platform: str(formData, 'ad_platform'),
      ad_campaign: str(formData, 'ad_campaign'),
      ad_date: str(formData, 'ad_date') || null,
    })
    .eq('id', mandateId)

  revalidateMandate(mandateId)
}
