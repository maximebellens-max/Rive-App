'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { syncLeadNextAction, todayStr } from '@/lib/rive/appointments'

async function getAgencyId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, agencyId: null, userId: null }

  const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single()

  return { supabase, agencyId: profile?.agency_id ?? null, userId: user.id }
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) || '').trim()
}

export type AppointmentFormState = { error?: string } | undefined

// Point d'entrée unique pour ajouter un rendez-vous, utilisé par le
// calendrier (app/dashboard/month-calendar.tsx) — plus de second formulaire
// séparé au-dessus du calendrier. Un lead peut désormais avoir plusieurs
// rendez-vous ; leads.action_label/action_date (utilisés ailleurs dans
// l'app) sont recalculés après coup pour rester le "prochain rendez-vous"
// du prospect. Le prospect est optionnel (RDV interne, visite sans dossier
// particulier...) : on ne synchronise action_label/action_date que si un
// prospect est bien attaché.
export async function createAppointment(
  _prevState: AppointmentFormState,
  formData: FormData
): Promise<AppointmentFormState> {
  const { supabase, agencyId, userId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const leadId = str(formData, 'lead_id')
  const date = str(formData, 'appointment_date')
  const time = str(formData, 'appointment_time')
  const label = str(formData, 'label')
  const lieu = str(formData, 'lieu')
  const participantIds = formData.getAll('participant_ids').map(String).filter(Boolean)

  if (!date) return { error: 'Choisis une date.' }

  const { error } = await supabase.from('appointments').insert({
    agency_id: agencyId,
    lead_id: leadId || null,
    label: label || 'Rendez-vous',
    lieu,
    appointment_date: date,
    appointment_time: time || null,
    created_by: userId,
    participant_ids: participantIds,
  })

  if (error) return { error: "Impossible d'ajouter le rendez-vous." }

  if (leadId) {
    await syncLeadNextAction(supabase, leadId, todayStr())
    revalidatePath(`/dashboard/prospects/${leadId}`)
  }

  revalidatePath('/dashboard')
  return undefined
}

export async function deleteAppointment(appointmentId: string, leadId: string | null) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('appointments').delete().eq('id', appointmentId).eq('agency_id', agencyId)

  if (leadId) {
    await syncLeadNextAction(supabase, leadId, todayStr())
    revalidatePath(`/dashboard/prospects/${leadId}`)
  }

  revalidatePath('/dashboard')
}