'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
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

function num(formData: FormData, key: string): number | null {
  const v = formData.get(key)
  if (!v || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

export type InvestmentFormState = { error?: string } | undefined

// Ajout rapide : on ne demande que le prospect concerné, le reste (dates,
// montants, apporteur...) se complète ensuite depuis la fiche détail.
export async function createInvestment(_prevState: InvestmentFormState, formData: FormData): Promise<InvestmentFormState> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const leadId = str(formData, 'lead_id')
  if (!leadId) return { error: 'Choisis un prospect.' }

  const { error } = await supabase.from('invest_projects').insert({ agency_id: agencyId, lead_id: leadId })
  if (error) return { error: 'Impossible de créer le projet.' }

  revalidatePath('/dashboard/investments')
}

export async function updateInvestment(
  investmentId: string,
  _prevState: InvestmentFormState,
  formData: FormData
): Promise<InvestmentFormState> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const { error } = await supabase
    .from('invest_projects')
    .update({
      capacite_emprunt: num(formData, 'capacite_emprunt'),
      date_mandat: str(formData, 'date_mandat') || null,
      echeance_notaire_debut: str(formData, 'echeance_notaire_debut') || null,
      echeance_notaire_fin: str(formData, 'echeance_notaire_fin') || null,
      date_compromis: str(formData, 'date_compromis') || null,
      date_acte: str(formData, 'date_acte') || null,
      apporteur: str(formData, 'apporteur'),
      ca_ht: num(formData, 'ca_ht'),
      commission_apporteur_pct: num(formData, 'commission_apporteur_pct'),
      notes: str(formData, 'notes'),
    })
    .eq('id', investmentId)

  if (error) return { error: 'Impossible d’enregistrer les modifications.' }

  revalidatePath(`/dashboard/investments/${investmentId}`)
  revalidatePath('/dashboard/investments')
  return undefined
}

export async function deleteInvestment(investmentId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('invest_projects').delete().eq('id', investmentId)
  revalidatePath('/dashboard/investments')
  redirect('/dashboard/investments')
}

// Un dossier n'a de ligne créée qu'une seule fois par tableau de suivi — si
// l'agent fait des allers-retours entre étapes (ou si la ligne existait déjà
// avant le passage par ce stage), on ne duplique rien.
async function ensureRow(
  supabase: SupabaseClient,
  table: string,
  agencyId: string,
  leadId: string,
  extra: Record<string, unknown> = {}
) {
  const { count } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('lead_id', leadId)
  if (count) return

  await supabase.from(table).insert({ agency_id: agencyId, lead_id: leadId, ...extra })
}

export async function moveInvestmentStage(investmentId: string, stage: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  const { data: project } = await supabase
    .from('invest_projects')
    .select('lead_id, notes')
    .eq('id', investmentId)
    .eq('agency_id', agencyId)
    .single()

  await supabase.from('invest_projects').update({ stage }).eq('id', investmentId)

  // En passant en "Travaux", le dossier rejoint automatiquement les 3
  // tableaux de "Suivi de chantier" (Ameublement, Cuisine, Travaux), en
  // reportant les notes déjà saisies sur le projet investisseur dans le
  // commentaire (works_projects n'a pas de champ commentaire équivalent).
  // En passant en "Location", il rejoint le pipeline Location (rental_listings).
  if (project?.lead_id) {
    const notes = project.notes || ''
    if (stage === 'travaux') {
      await Promise.all([
        ensureRow(supabase, 'furnishing_projects', agencyId, project.lead_id, { commentaire: notes }),
        ensureRow(supabase, 'kitchen_projects', agencyId, project.lead_id, { commentaire: notes }),
        ensureRow(supabase, 'works_projects', agencyId, project.lead_id),
      ])
      revalidatePath('/dashboard/ameublement')
      revalidatePath('/dashboard/cuisine')
      revalidatePath('/dashboard/travaux')
    } else if (stage === 'location') {
      await ensureRow(supabase, 'rental_listings', agencyId, project.lead_id, { commentaire: notes })
      revalidatePath('/dashboard/locations')
    }
  }

  revalidatePath('/dashboard/investments')
}