'use client'

import { useEffect, useRef, useState } from 'react'

// Petit indicateur "✓ Enregistré" affiché brièvement sur un bouton juste
// après la fin d'un enregistrement (transition pending: true -> false) —
// pour confirmer que le clic a bien été pris en compte, sans que l'agent
// ait à deviner si "rien ne s'affiche" veut dire "c'est bon" ou "ça n'a pas
// marché". Utilisé avec le `pending` déjà renvoyé par useActionState sur
// chaque formulaire (voir lead-edit-form.tsx, mandate-edit-form.tsx…).
export function useSavedFlash(pending: boolean, durationMs = 2000): boolean {
  const [justSaved, setJustSaved] = useState(false)
  const wasPending = useRef(false)

  useEffect(() => {
    if (wasPending.current && !pending) {
      setJustSaved(true)
      const t = setTimeout(() => setJustSaved(false), durationMs)
      wasPending.current = pending
      return () => clearTimeout(t)
    }
    wasPending.current = pending
  }, [pending, durationMs])

  return justSaved
}