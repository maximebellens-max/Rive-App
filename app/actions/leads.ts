'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { initialPositions, firstColumnId } from '@/lib/rive/pipeline-positions'
import { notifyMatchesForLeadId } from '@/lib/rive/match-notify'
import { notifyNewLead } from '@/lib/rive/new-lead-notify'
import { guessCivility } from '@/lib/rive/civility'

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

  // Le nom de famille n'est plus obligatoire (un prospect saisi rapidement
  // n'a parfois qu'un prénom pour l'instant) — le prénom, lui, reste
  // nécessaire pour identifier la fiche.
  if (!firstName) {
    return { error: 'Le prénom du prospect est obligatoire.' }
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
      civility: guessCivility(firstName) ?? 'Monsieur',
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

  if (category) revalidatePath(`/dashboard/pipelines/${category}`)
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
  if (!first) return { error: 'Le prénom du client est obligatoire.' }

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
      civility: guessCivility(first) ?? 'Monsieur',
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

  return { lead: newLead as { id: string; name: string } }
}

export async function updateLead(
  leadId: string,
  _prevState: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const firstName = str(formData, 'first_name')
  const lastName = str(formData, 'last_name')
  if (!firstName) return { error: 'Le prénom du prospect est obligatoire.' }

  const newCategory = str(formData, 'category') || null

  // Uniquement pour savoir si la catégorie change (voir plus bas) — ne sert
  // PLUS à recalculer "positions" ici : le faire à partir d'une lecture
  // faite en tout début d'action, puis réécrire l'objet entier, pouvait
  // écraser un déplacement de carte concurrent (glisser-déposer sur le
  // tableau) qui aurait modifié "positions" entre-temps — c'est ce qui
  // faisait disparaître certains prospects du tableau après un simple
  // enregistrement de fiche. La fiche ne touche donc plus du tout à
  // "positions" quand la catégorie ne change pas.
  const { data: existing } = await supabase.from('leads').select('category').eq('id', leadId).single()

  const { error } = await supabase
    .from('leads')
    .update({
      first_name: str(formData, 'first_name'),
      last_name: lastName,
      // Agent responsable — voir le select "Agent responsable" du formulaire.
      // '' (option "Non assigné") est envoyé comme null, ce qui rend le
      // prospect visible par toute l'équipe (voir kanban-board.tsx) plutôt
      // que de le laisser assigné à l'ancien agent malgré lui.
      assigned_to: str(formData, 'assigned_to') || null,
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
      // Agents supplémentaires impliqués sur ce dossier, en plus de l'agent
      // responsable — purement informatif (voir migration 046), n'affecte ni
      // l'onglet Aujourd'hui ni le filtre "agent" ni les commissions.
      collaborator_ids: formData.getAll('collaborator_ids').map(String).filter(Boolean),
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  if (error) return { error: 'Impossible d’enregistrer les modifications.' }

  // Uniquement si la catégorie a réellement changé : retire la position sur
  // l'ancien tableau et ajoute la 1ère colonne du nouveau, en un seul UPDATE
  // atomique côté SQL (voir migration 049) — jamais de lecture puis
  // réécriture de l'objet "positions" entier ici non plus.
  if (existing && existing.category !== newCategory) {
    const newColumnId = newCategory ? await firstColumnId(supabase, agencyId, newCategory) : null
    const { error: reconcileError } = await supabase.rpc('reconcile_lead_category_position', {
      p_lead_id: leadId,
      p_old_board_type: existing.category,
      p_new_board_type: newCategory,
      p_new_column_id: newColumnId,
    })
    if (reconcileError) console.error('[updateLead] échec de la réconciliation de position', reconcileError)
  }

  await notifyMatchesForLeadId(supabase, agencyId, leadId)

  revalidatePath(`/dashboard/prospects/${leadId}`)
  // '/dashboard/pipelines', 'layout' ne correspond à aucun fichier
  // layout.tsx réel (il n'y en a pas à cet endroit, seulement
  // app/dashboard/pipelines/[boardType]/page.tsx) : cet appel ne
  // revalidait donc RIEN en pratique. C'est ce qui faisait qu'un prospect
  // réassigné à un autre agent depuis sa fiche restait visible dans le
  // tableau qu'on avait déjà ouvert : la modification était bien
  // enregistrée en base, mais le tableau conservait sa version en cache
  // tant qu'on ne le rechargeait pas complètement à la main. Cible
  // maintenant explicitement le fichier de page réel, avec le bon type
  // 'page' (comme le fait déjà revalidateBoard() dans
  // app/actions/pipelines.ts), ce qui revalide bien tous les tableaux
  // (catégorie et personnalisés) déjà visités.
  revalidatePath('/dashboard/pipelines/[boardType]', 'page')
  // Un changement d'agent responsable change ce qui apparaît dans l'onglet
  // Aujourd'hui de chacun (voir app/dashboard/page.tsx).
  revalidatePath('/dashboard')
  return undefined
}

// Champs qu'un seul appel peut modifier sans repasser par le formulaire
// complet — utilisé par l'assistant IA (lib/rive/assistant-agent.ts), qui ne
// doit JAMAIS passer par updateLead ci-dessus pour une modification
// partielle : updateLead réécrit TOUS les champs de la fiche à partir d'un
// FormData complet, donc un appel avec un seul champ renseigné écraserait
// silencieusement tous les autres (téléphone, notes, critères...) avec des
// valeurs vides. Liste volontairement restreinte aux champs simples et sans
// effet de bord (ni "category", qui doit passer par la réconciliation de
// position ci-dessus, ni "assigned_to", trop sensible pour une modification
// vocale/chat non confirmée).
const ASSISTANT_EDITABLE_FIELDS = new Set([
  'phone',
  'email',
  'budget',
  'financement',
  'critere_type',
  'critere_lieu',
  'pieces_min',
  'surface_min',
  'action_label',
  'action_date',
  'notes',
])
const ASSISTANT_NUMBER_FIELDS = new Set(['budget', 'pieces_min', 'surface_min'])

export async function updateLeadField(
  leadId: string,
  field: string,
  value: string
): Promise<{ error?: string; ok?: boolean }> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }
  if (!ASSISTANT_EDITABLE_FIELDS.has(field)) return { error: `Le champ "${field}" ne peut pas être modifié de cette façon.` }

  let parsedValue: string | number | null = value.trim()
  if (ASSISTANT_NUMBER_FIELDS.has(field)) {
    if (parsedValue === '') {
      parsedValue = null
    } else {
      const n = Number(parsedValue)
      if (isNaN(n)) return { error: `"${value}" n'est pas un nombre valide pour le champ "${field}".` }
      parsedValue = n
    }
  } else if (field === 'action_date') {
    parsedValue = parsedValue || null
  }

  // .eq('agency_id', ...) en plus de l'id : garde-fou explicite pour qu'un
  // id de prospect mal résolu ne puisse jamais toucher la fiche d'une autre
  // agence, même par erreur de raisonnement du modèle.
  const { error } = await supabase
    .from('leads')
    .update({ [field]: parsedValue, updated_at: new Date().toISOString() })
    .eq('id', leadId)
    .eq('agency_id', agencyId)
  if (error) return { error: 'Impossible de mettre à jour ce champ.' }

  revalidatePath(`/dashboard/prospects/${leadId}`)
  revalidatePath('/dashboard/pipelines/[boardType]', 'page')
  return { ok: true }
}

export async function deleteLead(leadId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  const { data: lead } = await supabase.from('leads').select('category').eq('id', leadId).maybeSingle()

  await supabase.from('leads').delete().eq('id', leadId)
  revalidatePath('/dashboard/pipelines/[boardType]', 'page')
  redirect(lead?.category ? `/dashboard/pipelines/${lead.category}` : '/dashboard')
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

  revalidatePath('/dashboard/pipelines/[boardType]', 'page')
}

export async function bulkAssignLeads(leadIds: string[], assignedTo: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId || !leadIds.length || !assignedTo) return

  await supabase.from('leads').update({ assigned_to: assignedTo }).eq('agency_id', agencyId).in('id', leadIds)

  revalidatePath('/dashboard/pipelines/[boardType]', 'page')
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