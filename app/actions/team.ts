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
