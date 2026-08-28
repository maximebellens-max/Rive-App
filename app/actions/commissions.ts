'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
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

export type CommissionFormState = { error?: string } | undefined

// Ajout manuel — relie une commission à un mandat existant (vendu) qui n'en a
// pas encore, pour les cas non couverts par la création automatique.
export async function createCommission(_prevState: CommissionFormState, formData: FormData): Promise<CommissionFormState> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const mandateId = str(formData, 'mandate_id')
  if (!mandateId) return { error: 'Choisis un mandat.' }

  const { error } = await supabase.from('commissions').insert({
    agency_id: agencyId,
    mandate_id: mandateId,
    amount: num(formData, 'amount'),
    notes: str(formData, 'notes'),
  })

  if (error) return { error: 'Impossible de créer la commission.' }

  revalidatePath('/dashboard/commissions')
}

export async function updateCommission(commissionId: string, _prevState: CommissionFormState, formData: FormData): Promise<CommissionFormState> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const { error } = await supabase
    .from('commissions')
    .update({
      amount: num(formData, 'amount'),
      paid_date: str(formData, 'paid_date') || null,
      notes: str(formData, 'notes'),
    })
    .eq('id', commissionId)

  if (error) return { error: 'Impossible d’enregistrer les modifications.' }

  revalidatePath(`/dashboard/commissions/${commissionId}`)
  revalidatePath('/dashboard/commissions')
  return undefined
}

export async function deleteCommission(commissionId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('commissions').delete().eq('id', commissionId)
  revalidatePath('/dashboard/commissions')
  redirect('/dashboard/commissions')
}

// Glisser-déposer sur le Kanban : "attente" efface la date de paiement, "paye"
// la fixe à aujourd'hui si elle n'est pas déjà renseignée.
export async function moveCommissionStage(commissionId: string, stage: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  if (stage === 'paye') {
    const { data: existing } = await supabase.from('commissions').select('paid_date').eq('id', commissionId).single()
    await supabase
      .from('commissions')
      .update({ paid_date: existing?.paid_date || new Date().toISOString().slice(0, 10) })
      .eq('id', commissionId)
  } else {
    await supabase.from('commissions').update({ paid_date: null }).eq('id', commissionId)
  }

  revalidatePath('/dashboard/commissions')
}
