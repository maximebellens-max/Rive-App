'use server'

// Actions liées aux notifications push (voir Réglages → Notifications, et
// public/sw.js pour la réception côté navigateur). Contrairement aux autres
// server actions de ce dossier, subscribeToPush/unsubscribeFromPush sont
// appelées directement en JavaScript depuis le composant client (pas via un
// <form action=...>) : l'abonnement au push est piloté par l'API
// PushManager du navigateur, pas par une soumission de formulaire.
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { PUSH_TYPES } from '@/lib/rive/push-types'

async function getProfileContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, userId: null, agencyId: null }

  const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
  return { supabase, userId: user.id, agencyId: profile?.agency_id ?? null }
}

export async function subscribeToPush(subscription: {
  endpoint: string
  p256dh: string
  auth: string
}): Promise<{ error?: string }> {
  const { supabase, userId, agencyId } = await getProfileContext()
  if (!userId || !agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      agency_id: agencyId,
      profile_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
    { onConflict: 'endpoint' }
  )
  if (error) return { error: "Impossible d'enregistrer l'abonnement." }
  return {}
}

export async function unsubscribeFromPush(endpoint: string): Promise<{ error?: string }> {
  const { supabase, userId } = await getProfileContext()
  if (!userId) return { error: 'Session expirée, reconnecte-toi.' }

  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('profile_id', userId)
  if (error) return { error: 'Impossible de désactiver les notifications.' }
  return {}
}

export type PushPrefsFormState = { error?: string; success?: boolean } | undefined

export async function updatePushPrefs(_prevState: PushPrefsFormState, formData: FormData): Promise<PushPrefsFormState> {
  const { supabase, userId } = await getProfileContext()
  if (!userId) return { error: 'Session expirée, reconnecte-toi.' }

  // Une case cochée envoie "on", une case décochée n'envoie rien du tout
  // (comportement standard des formulaires HTML) — donc "absent du
  // formData" = décochée = false, "on" = true. On enregistre les 16 clés
  // explicitement (plutôt que de ne stocker que les désactivations) pour
  // que la préférence de chaque agent reste lisible telle quelle en base.
  const prefs: Record<string, boolean> = {}
  for (const type of PUSH_TYPES) {
    prefs[type] = formData.get(`pref_${type}`) === 'on'
  }

  const { error } = await supabase.from('profiles').update({ push_prefs: prefs }).eq('id', userId)
  if (error) return { error: 'Impossible d’enregistrer tes préférences.' }

  revalidatePath('/dashboard/settings')
  return { success: true }
}