'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getOwnerContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, agencyId: null, userId: null, isOwner: false }

  const { data: profile } = await supabase.from('profiles').select('agency_id, role').eq('id', user.id).single()

  return {
    supabase,
    agencyId: profile?.agency_id ?? null,
    userId: user.id,
    isOwner: profile?.role === 'owner',
  }
}

export type InviteFormState = { error?: string } | undefined

export async function createInvite(_prevState: InviteFormState, formData: FormData): Promise<InviteFormState> {
  const { supabase, agencyId, isOwner } = await getOwnerContext()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }
  if (!isOwner) return { error: 'Seul le propriétaire de l’agence peut inviter un coéquipier.' }

  const email = String(formData.get('email') || '').trim().toLowerCase()
  if (!email || !email.includes('@')) return { error: 'Adresse email invalide.' }

  const { data: pending } = await supabase
    .from('agency_invites')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('email', email)
    .is('accepted_at', null)
    .maybeSingle()

  if (pending) return { error: 'Une invitation est déjà en attente pour cette adresse.' }

  const { error } = await supabase.from('agency_invites').insert({
    agency_id: agencyId,
    email,
  })

  if (error) return { error: 'Impossible de créer l’invitation.' }
  revalidatePath('/dashboard/settings')
}

export async function cancelInvite(inviteId: string) {
  const { supabase, agencyId, isOwner } = await getOwnerContext()
  if (!agencyId || !isOwner) return

  await supabase.from('agency_invites').delete().eq('id', inviteId).eq('agency_id', agencyId)
  revalidatePath('/dashboard/settings')
}

export async function removeTeamMember(profileId: string) {
  const { supabase, agencyId, isOwner, userId } = await getOwnerContext()
  if (!agencyId || !isOwner) return
  if (profileId === userId) return // on ne peut pas se retirer soi-même

  await supabase.from('profiles').delete().eq('id', profileId).eq('agency_id', agencyId)
  revalidatePath('/dashboard/settings')
}

export type WhatsAppFormState = { error?: string; success?: boolean } | undefined

// Chacun gère son propre numéro et son propre opt-in — pas de gestion par le
// propriétaire pour le compte d'un autre membre, le numéro WhatsApp est
// personnel.
export async function updateMyWhatsAppNumber(
  _prevState: WhatsAppFormState,
  formData: FormData
): Promise<WhatsAppFormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée, reconnecte-toi.' }

  // Ne garde que les chiffres (indicatif pays inclus, sans + ni espaces) —
  // c'est le format attendu par l'API WhatsApp pour le champ "to".
  const number = String(formData.get('whatsapp_number') || '').replace(/\D/g, '')
  const enabled = formData.get('whatsapp_alerts_enabled') === 'on'
  // Optionnel : le Phone Number ID (identifiant technique Meta, pas le
  // numéro lui-même) du numéro professionnel dédié de cet agent, une fois
  // enregistré sous la WABA de l'agence — si vide, ses alertes partent
  // depuis le numéro partagé de l'agence.
  const senderPhoneNumberId = String(formData.get('whatsapp_sender_phone_number_id') || '').trim()

  if (enabled && !number) {
    return { error: 'Renseigne ton numéro WhatsApp pour activer les alertes.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      whatsapp_number: number,
      whatsapp_alerts_enabled: enabled,
      whatsapp_sender_phone_number_id: senderPhoneNumberId,
    })
    .eq('id', user.id)

  if (error) return { error: 'Impossible d’enregistrer.' }

  revalidatePath('/dashboard/settings')
  return { success: true }
}