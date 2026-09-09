'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { initialPositions, reconcilePositionsOnCategoryChange } from '@/lib/rive/pipeline-positions'
import { notifyMatchesForLeadId } from '@/lib/rive/match-notify'
import { notifyNewLead } from '@/lib/rive/new-lead-notify'

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
  const firstName = str(formData, 'first_name')
  const lastName = str(formData, 'last_name')
  const phone = str(formData, 'phone')
  const email = str(formData, 'email')
  const category = str(formData, 'category') || null
  const critereLieu = str(formData, 'critere_lieu')

  if (!lastName) {
    return { error: 'Le nom du prospect est obligatoire.' }
  }
  if (category && !['acheteur', 'vendeur', 'investisseur'].includes(category)) {
    return { error: 'Catégorie invalide.' }
  }

  const { supabase, agencyId, userId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const positions = await initialPositions(supabase, agencyId, category)

  const { data: newLead, error: insertError } = await supabase
    .from('leads')
    .insert({
      agency_id: agencyId,
      assigned_to: userId,
      first_name: firstName,
      last_name: lastName,
      phone,
      email,
      category,
      critere_lieu: critereLieu,
      positions,
    })
    .select('id')
    .single()

  if (insertError) {
    return { error: "Impossible d'ajouter le prospect." }
  }

  if (newLead?.id) {
    await notifyNewLead(supabase, agencyId, {
      id: newLead.id,
      name: [firstName, lastName].filter(Boolean).join(' '),
      category,
      source: 'Saisie manuelle',
      ownerId: userId,
    })
  }

  revalidatePath('/dashboard/prospects')
}

// Création rapide depuis un tableau de suivi (Ameublement, Cuisine, Travaux,
// Projets investisseur, Location) : mêmes règles que createLead, mais sans
// FormData (appelée directement depuis le combobox) et renvoie le nouveau
// prospect pour l'y sélectionner aussitôt.
export async function createLeadQuick(
  firstName: string,
  lastName: string
): Promise<{ error: string } | { lead: { id: string; name: string } }> {
  const first = firstName.trim()
  const last = lastName.trim()
  if (!last) return { error: 'Le nom du client est obligatoire.' }

  const { supabase, agencyId, userId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const positions = await initialPositions(supabase, agencyId, null)

  const { data: newLead, error } = await supabase
    .from('leads')
    .insert({
      agency_id: agencyId,
      assigned_to: userId,
      first_name: first,
      last_name: last,
      positions,
    })
    .select('id, name')
    .single()

  if (error || !newLead) return { error: 'Impossible de créer le client.' }

  await notifyNewLead(supabase, agencyId, {
    id: newLead.id,
    name: newLead.name,
    category: null,
    source: 'Saisie manuelle',
    ownerId: userId,
  })

  revalidatePath('/dashboard/prospects')
  return { lead: newLead as { id: string; name: string } }
}

export async function updateLead(
  leadId: string,
  _prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const lastName = str(formData, 'last_name')
  if (!lastName) return { error: 'Le nom du prospect est obligatoire.' }

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
      first_name: str(formData, 'first_name'),
      last_name: lastName,
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
      // Le formulaire n'affiche (et donc n'envoie) les champs conjoint que si
      // "Marié(e)" ou "Pacsé(e)" est sélectionné ; ils sont donc vidés ici dès
      // que la situation familiale change pour autre chose, ce qui est le
      // comportement voulu.
      spouse_first_name: str(formData, 'spouse_first_name'),
      spouse_last_name: str(formData, 'spouse_last_name'),
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  if (error) return { error: 'Impossible d’enregistrer les modifications.' }

  await notifyMatchesForLeadId(supabase, agencyId, leadId)

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

// Actions groupées depuis la sélection multiple (vue kanban/liste) :
// suppression et réassignation d'un lot de prospects en une fois. Bornées à
// l'agence de l'utilisateur connecté par sécurité, même si les ids viennent
// du client — pas de redirect ici, contrairement à deleteLead, puisqu'on
// reste sur la même page (kanban ou liste des prospects).
export async function bulkDeleteLeads(leadIds: string[]) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId || !leadIds.length) return

  await supabase.from('leads').delete().eq('agency_id', agencyId).in('id', leadIds)

  revalidatePath('/dashboard/prospects')
  revalidatePath('/dashboard/pipelines', 'layout')
}

export async function bulkAssignLeads(leadIds: string[], assignedTo: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId || !leadIds.length || !assignedTo) return

  await supabase.from('leads').update({ assigned_to: assignedTo }).eq('agency_id', agencyId).in('id', leadIds)

  revalidatePath('/dashboard/prospects')
  revalidatePath('/dashboard/pipelines', 'layout')
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

export async function removeLeadHistoryEntry(leadId: string, entryId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('lead_history_entries').delete().eq('id', entryId)
  revalidatePath(`/dashboard/prospects/${leadId}`)
}