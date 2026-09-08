'use client'

// Bouton de suppression de ligne partagé par les tableaux de suivi denses —
// même logique de double-clic (croix puis confirmation) que la suppression
// de colonne de pipeline, pour éviter les suppressions accidentelles.
import { useState, useTransition } from 'react'

export default function DeleteRowButton({ onDelete }: { onDelete: () => void | Promise<void> }) {
  const [confirming, setConfirming] = useState(false)
  const [, startTransition] = useTransition()

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Supprimer cette ligne"
        className="rounded px-1.5 py-0.5 text-xs text-neutral-300 hover:bg-danger-soft hover:text-danger"
      >
        ✕
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(() => {
          onDelete()
        })
        setConfirming(false)
      }}
      className="rounded bg-danger px-1.5 py-0.5 text-[10px] font-medium text-white"
    >
      Confirmer ?
    </button>
  )
}