'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/rive/cn'

const DISMISSED_KEY = 'rive-install-dismissed'

// Minimal type pour l'événement non-standard `beforeinstallprompt` (Chrome/
// Edge/Android) — pas encore dans le lib.dom.d.ts de TypeScript.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari iOS n'a pas d'API standard : `navigator.standalone` est son
    // équivalent propriétaire pour détecter le lancement depuis l'écran
    // d'accueil.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

// Bandeau discret proposant d'installer Rive sur l'écran d'accueil.
// - Android/Chrome/Edge : capture l'événement natif `beforeinstallprompt`
//   et déclenche l'invite d'installation du navigateur au clic.
// - iOS/Safari : pas d'invite programmable côté navigateur, donc mode
//   d'emploi manuel ("Partager" → "Sur l'écran d'accueil").
// Rien ne s'affiche si l'appli tourne déjà en mode installé, ou si l'agent
// a déjà fermé le bandeau (mémorisé sur cet appareil).
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (isStandalone()) return
    try {
      if (localStorage.getItem(DISMISSED_KEY) === '1') return
    } catch {
      // Stockage indisponible (navigation privée...) : on affiche quand même,
      // au pire l'agent referme le bandeau à chaque visite.
    }
    setDismissed(false)

    if (isIOS()) {
      setShowIOSHint(true)
      return
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Rien de grave si ça échoue : le bandeau réapparaîtra, sans casser la page.
    }
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (outcome === 'accepted') dismiss()
  }

  if (dismissed) return null
  if (!showIOSHint && !deferredPrompt) return null

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-accent-soft bg-accent-soft/60 px-4 py-2.5 text-sm text-neutral-800'
      )}
    >
      <span className="text-lg" aria-hidden>
        📲
      </span>
      {showIOSHint ? (
        <p className="flex-1">
          Installe Rive sur ton iPhone : appuie sur <strong>Partager</strong>, puis{' '}
          <strong>Sur l&apos;écran d&apos;accueil</strong>.
        </p>
      ) : (
        <p className="flex-1">Installe Rive sur cet appareil pour y accéder en un geste, comme une vraie appli.</p>
      )}
      {!showIOSHint && (
        <button
          onClick={install}
          className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink hover:bg-accent-hover"
        >
          Installer
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Fermer"
        className="shrink-0 text-neutral-500 hover:text-neutral-700"
      >
        ✕
      </button>
    </div>
  )
}