'use client'

import { useEffect, useState } from 'react'

// 3 états qui bouclent au clic : système (suit le réglage du téléphone/
// ordinateur) → clair → sombre → système. La palette elle-même (les deux
// jeux de tokens couleur) existe déjà dans globals.css ; ce composant ne
// fait que poser/retirer l'attribut data-theme sur <html> et retenir le
// choix dans localStorage (par appareil — pas besoin de le synchroniser
// entre appareils pour une préférence d'affichage).
type ThemeMode = 'system' | 'light' | 'dark'
const STORAGE_KEY = 'rive-theme'

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
}

const MODE_LABEL: Record<ThemeMode, string> = {
  system: 'Thème : automatique — cliquer pour passer en clair',
  light: 'Thème : clair — cliquer pour passer en sombre',
  dark: 'Thème : sombre — cliquer pour repasser en automatique',
}

function applyTheme(mode: ThemeMode) {
  if (mode === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', mode)
  }
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('system')
  const [mounted, setMounted] = useState(false)

  // Lit la préférence enregistrée après le montage seulement, pour que le
  // premier rendu client corresponde exactement au rendu serveur (aucune
  // préférence connue côté serveur) et évite un avertissement d'hydratation.
  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'light' || stored === 'dark' || stored === 'system') setMode(stored)
    } catch {
      // localStorage indisponible (navigation privée, etc.) : reste en mode système.
    }
  }, [])

  function cycle() {
    const next = NEXT_MODE[mode]
    setMode(next)
    applyTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Pas grave si la préférence ne persiste pas d'une session à l'autre.
    }
  }

  // Le thème lui-même est déjà posé sans flash par le script inline dans
  // app/layout.tsx ; ce placeholder évite seulement un flash d'ICÔNE
  // incohérente le temps que l'effet ci-dessus lise localStorage.
  if (!mounted) {
    return <span className="block h-8 w-8" aria-hidden="true" />
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={MODE_LABEL[mode]}
      title={MODE_LABEL[mode]}
      className="rounded-lg border border-neutral-300 p-1.5 text-neutral-600 hover:bg-neutral-100"
    >
      {mode === 'light' && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            strokeLinecap="round"
          />
        </svg>
      )}
      {mode === 'dark' && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {mode === 'system' && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 18v3" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}