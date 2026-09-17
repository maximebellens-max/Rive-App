'use client'

import { useEffect } from 'react'

// Enregistre le service worker (public/sw.js) dès qu'une page se charge,
// quelle que soit la page (landing, login, dashboard) — nécessaire pour que
// l'appli soit installable (icône sur l'écran d'accueil) dès la première
// visite. Ne rend rien à l'écran : composant purement fonctionnel.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('[pwa] Échec de l’enregistrement du service worker :', err)
    })
  }, [])

  return null
}