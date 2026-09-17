// Notifications push (Web Push API) — deuxième canal d'alerte en plus du
// WhatsApp (lib/rive/whatsapp-notify.ts), en parallèle et pas en
// remplacement pour l'instant (voir discussion PWA). Un appel par
// déclencheur métier, chacun avec son propre type (voir push-types.ts) pour
// que chaque agent puisse activer/désactiver individuellement chaque genre
// d'alerte dans Réglages, sans passer par WhatsApp ni email.
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendNotification, setVapidDetails, WebPushError } from 'web-push'
import { isPushTypeEnabled, type PushType } from './push-types'

let vapidReady = false

// Configure la librairie web-push une seule fois (elle garde l'état en
// mémoire pour toute la durée de vie du process) — renvoie false si les
// clés VAPID ne sont pas configurées (ex. environnement de développement
// local sans .env complet), auquel cas l'envoi est silencieusement ignoré
// plutôt que de faire planter l'appelant.
function ensureVapid(): boolean {
  if (vapidReady) return true
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false
  setVapidDetails(`mailto:${process.env.VAPID_SUBJECT_EMAIL || 'contact@hevrest.fr'}`, publicKey, privateKey)
  vapidReady = true
  return true
}

type PushPayload = { title: string; body: string; url?: string }

async function sendToProfileIds(
  supabase: SupabaseClient,
  profileIds: string[],
  type: PushType,
  payload: PushPayload
) {
  if (!ensureVapid() || !profileIds.length) return

  const { data: profiles } = await supabase.from('profiles').select('id, push_prefs').in('id', profileIds)
  const eligibleIds = (profiles ?? [])
    .filter((p: { push_prefs: Record<string, unknown> | null }) => isPushTypeEnabled(p.push_prefs, type))
    .map((p: { id: string }) => p.id)
  if (!eligibleIds.length) return

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('profile_id', eligibleIds)
  if (!subs?.length) return

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/dashboard',
  })

  await Promise.all(
    subs.map(async (sub: { id: string; endpoint: string; p256dh: string; auth: string }) => {
      try {
        await sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, message)
      } catch (err) {
        // Abonnement expiré ou révoqué (désinstallation de l'app,
        // notifications désactivées au niveau système, changement de
        // navigateur...) : le push service renvoie 404/410. On le supprime
        // plutôt que de retenter indéfiniment à chaque prochaine alerte.
        if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    })
  )
}

async function teamProfileIds(supabase: SupabaseClient, agencyId: string): Promise<string[]> {
  const { data } = await supabase.from('profiles').select('id').eq('agency_id', agencyId)
  return (data ?? []).map((p: { id: string }) => p.id)
}

// Agent assigné si renseigné, sinon toute l'équipe — même logique de repli
// que côté WhatsApp (voir recipientsForAssignee dans whatsapp-notify.ts),
// réimplémentée ici plutôt que partagée : les critères d'éligibilité
// diffèrent (préférence par type + abonnement navigateur ici, numéro +
// case à cocher globale côté WhatsApp).
export async function notifyPushForAssignee(
  supabase: SupabaseClient,
  agencyId: string,
  assignedTo: string | null,
  type: PushType,
  payload: PushPayload
) {
  const ids = assignedTo ? [assignedTo] : await teamProfileIds(supabase, agencyId)
  await sendToProfileIds(supabase, ids, type, payload)
}

// Toujours toute l'équipe, quel que soit l'agent assigné — pour les mêmes
// événements que notifyTeamAlertWhatsApp (nouveau prospect, chantiers,
// rapport hebdomadaire, vœux de fin d'année).
export async function notifyPushTeam(supabase: SupabaseClient, agencyId: string, type: PushType, payload: PushPayload) {
  await sendToProfileIds(supabase, await teamProfileIds(supabase, agencyId), type, payload)
}