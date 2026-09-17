'use client'

// Notifications push directement depuis l'app installée (voir
// app/dashboard/_components/install-prompt.tsx pour l'installation, et
// public/sw.js pour la réception). Deux parties bien séparées :
// 1. Activer/désactiver les notifications SUR CET APPAREIL — piloté par
//    l'API PushManager du navigateur, jamais par un formulaire classique.
// 2. Les 16 types de notification (voir lib/rive/push-types.ts), à cocher
//    individuellement — ce réglage est un attribut du compte (profiles.
//    push_prefs), pas de l'appareil : il s'applique à tous les appareils où
//    l'agent active les notifications.
import { useActionState, useEffect, useState, useTransition } from 'react'
import { subscribeToPush, unsubscribeFromPush, updatePushPrefs, type PushPrefsFormState } from '@/app/actions/push'
import { PUSH_TYPE_GROUPS, PUSH_TYPE_LABELS, type PushType } from '@/lib/rive/push-types'

// L'API PushManager attend la clé VAPID publique sous forme de Uint8Array
// (Base64 URL-safe décodé), pas telle quelle — conversion standard, la même
// que celle documentée par tous les tutoriels Web Push.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

type DeviceState = 'checking' | 'unsupported' | 'subscribed' | 'unsubscribed'

export default function PushSection({
  vapidPublicKey,
  prefs,
}: {
  vapidPublicKey: string
  prefs: Record<string, boolean>
}) {
  const [deviceState, setDeviceState] = useState<DeviceState>('checking')
  const [deviceError, setDeviceError] = useState<string | null>(null)
  const [devicePending, startDeviceTransition] = useTransition()

  const [prefsState, prefsAction, prefsPending] = useActionState<PushPrefsFormState, FormData>(
    updatePushPrefs,
    undefined
  )

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setDeviceState('unsupported')
      return
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setDeviceState(sub ? 'subscribed' : 'unsubscribed'))
      .catch(() => setDeviceState('unsubscribed'))
  }, [])

  function handleSubscribe() {
    setDeviceError(null)

    if (!vapidPublicKey) {
      setDeviceError("Les notifications push ne sont pas encore configurées côté serveur.")
      return
    }
    if (Notification.permission === 'denied') {
      setDeviceError(
        'Les notifications sont bloquées pour Rive dans les réglages de ton navigateur ou de ton téléphone — autorise-les puis réessaie.'
      )
      return
    }

    startDeviceTransition(async () => {
      try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setDeviceError('Autorisation refusée.')
          return
        }
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        })
        const json = sub.toJSON()
        const res = await subscribeToPush({
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh || '',
          auth: json.keys?.auth || '',
        })
        if (res?.error) {
          setDeviceError(res.error)
          return
        }
        setDeviceState('subscribed')
      } catch {
        setDeviceError("Impossible d'activer les notifications sur cet appareil.")
      }
    })
  }

  function handleUnsubscribe() {
    setDeviceError(null)
    startDeviceTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          const endpoint = sub.endpoint
          await sub.unsubscribe()
          await unsubscribeFromPush(endpoint)
        }
        setDeviceState('unsubscribed')
      } catch {
        setDeviceError('Impossible de désactiver les notifications sur cet appareil.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Sur cet appareil</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Les notifications s'activent séparément sur chaque appareil où Rive est installée. En parallèle du
            WhatsApp et de l'email pour l'instant, pas à la place.
          </p>
        </div>

        {deviceState === 'unsupported' && (
          <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
            Ton navigateur ne prend pas en charge les notifications push. Sur iPhone, installe d'abord Rive sur
            l'écran d'accueil (voir le bandeau d'installation) — Safari ne les propose pas depuis un simple onglet.
          </p>
        )}

        {deviceState === 'checking' && <p className="text-xs text-neutral-400">Vérification…</p>}

        {deviceState === 'unsubscribed' && (
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={devicePending}
            className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50"
          >
            {devicePending ? 'Activation…' : 'Activer les notifications'}
          </button>
        )}

        {deviceState === 'subscribed' && (
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-good-soft px-3 py-2 text-xs font-medium text-good">
              Notifications activées sur cet appareil.
            </span>
            <button
              type="button"
              onClick={handleUnsubscribe}
              disabled={devicePending}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
            >
              {devicePending ? 'Désactivation…' : 'Désactiver'}
            </button>
          </div>
        )}

        {deviceError && <p className="text-xs text-danger">{deviceError}</p>}
      </div>

      <div className="flex flex-col gap-3 border-t border-neutral-200 pt-5">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Que veux-tu recevoir ?</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Tout est activé par défaut. Décoche ce qui ne t'intéresse pas — ce réglage s'applique à tous tes
            appareils.
          </p>
        </div>

        <form action={prefsAction} className="flex flex-col gap-4">
          {PUSH_TYPE_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{group.label}</span>
              {group.types.map((type: PushType) => (
                <label key={type} className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    name={`pref_${type}`}
                    defaultChecked={prefs[type] !== false}
                    className="rounded border-neutral-300"
                  />
                  {PUSH_TYPE_LABELS[type]}
                </label>
              ))}
            </div>
          ))}

          {prefsState?.error && <p className="text-xs text-danger">{prefsState.error}</p>}
          {prefsState?.success && <p className="text-xs text-good">Enregistré.</p>}

          <button
            type="submit"
            disabled={prefsPending}
            className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50"
          >
            Enregistrer
          </button>
        </form>
      </div>
    </div>
  )
}