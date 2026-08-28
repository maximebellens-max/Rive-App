'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { initialPositions, reconcilePositionsOnCategoryChange } from '@/lib/rive/pipeline-positions'

export type LeadFormState = { error?: string } | undefined

function str(formData: FormData, key: string): string {
  return String(formData.get(key) || '').trim()
}

function num(formData: FormData, key: string): number | null {
  const v = formData.get(key)
  if (!v || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

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

export async function createLead(
  _prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const name = str(formData, 'name')
  const phone = str(formData, 'phone')
  const email = str(formData, 'email')
  const category = str(formData, 'category') || null
  const critereLieu = str(formData, 'critere_lieu')

  if (!name) {
    return { error: 'Le nom du prospect est obligatoire.' }
  }
  if (category && !['acheteur', 'vendeur', 'investisseur'].includes(category)) {
    return { error: 'Catégorie invalide.' }
  }

  const { supabase, agencyId, userId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const positions = await initialPositions(supabase, agencyId, category)

  const { error: insertError } = await supabase.from('leads').insert({
    agency_id: agencyId,
    assigned_to: userId,
    name,
    phone,
    email,
    category,
    critere_lieu: critereLieu,
    positions,
  })

  if (insertError) {
    return { error: "Impossible d'ajouter le prospect." }
  }

  revalidatePath('/dashboard/prospects')
}

export async function updateLead(
  leadId: string,
  _prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const name = str(formData, 'name')
  if (!name) return { error: 'Le nom du prospect est obligatoire.' }

  const newCategory = str(formData, 'category') || null

  const { data: existing } = await supabase
    .from('leads')
    .select('category, positions')
    .eq('id', leadId)
    .single()

  const positions = existing
    ? await reconcilePositionsOnCategoryChange(
        supabase,
        agencyId,
        (existing.positions as Record<string, string>) ?? {},
        existing.category,
        newCategory
      )
    : undefined

  const { error } = await supabase
    .from('leads')
    .update({
      name,
      ...(positions ? { positions } : {}),
      phone: str(formData, 'phone'),
      email: str(formData, 'email'),
      category: str(formData, 'category') || null,
      source: str(formData, 'source'),
      campaign: str(formData, 'campaign'),
      critere_type: str(formData, 'critere_type'),
      critere_lieu: str(formData, 'critere_lieu'),
      budget: num(formData, 'budget'),
      pieces_min: num(formData, 'pieces_min'),
      surface_min: num(formData, 'surface_min'),
      financement: str(formData, 'financement'),
      rendement_vise: num(formData, 'rendement_vise'),
      action_label: str(formData, 'action_label'),
      action_date: str(formData, 'action_date') || null,
      notes: str(formData, 'notes'),
      civility: str(formData, 'civility') || 'Monsieur',
      address: str(formData, 'address'),
      birth_date: str(formData, 'birth_date') || null,
      birth_place: str(formData, 'birth_place'),
      nationality: str(formData, 'nationality'),
      marital_status: str(formData, 'marital_status'),
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  if (error) return { error: 'Impossible d’enregistrer les modifications.' }

  revalidatePath(`/dashboard/prospects/${leadId}`)
  revalidatePath('/dashboard/prospects')
  return undefined
}

export async function deleteLead(leadId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('leads').delete().eq('id', leadId)
  revalidatePath('/dashboard/prospects')
  redirect('/dashboard/prospects')
}

export async function addLeadHistoryEntry(leadId: string, formData: FormData) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  const text = str(formData, 'text')
  if (!text) return

  await supabase.from('lead_history_entries').insert({
    agency_id: agencyId,
    lead_id: leadId,
    entry_date: str(formData, 'entry_date') || new Date().toISOString().slice(0, 10),
    text,
  })

  revalidatePath(`/dashboard/prospects/${leadId}`)
}

// Ajout/modification rapide d'un rendez-vous depuis la vue Aujourd'hui —
// réutilise simplement les champs action_label/action_date du lead (il n'y a
// pas d'entité "rendez-vous" séparée, comme dans le prototype).
export async function setLeadAppointment(formData: FormData) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  const leadId = str(formData, 'lead_id')
  if (!leadId) return

  await supabase
    .from('leads')
    .update({
      action_label: str(formData, 'action_label'),
      action_date: str(formData, 'action_date') || null,
    })
    .eq('id', leadId)

  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/prospects/${leadId}`)
}

export async function removeLeadHistoryEntry(leadId: string, entryId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('lead_history_entries').delete().eq('id', entryId)
  revalidatePath(`/dashboard/prospects/${leadId}`)
}
