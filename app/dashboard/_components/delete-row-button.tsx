'use client'

// Bouton de suppression de ligne partagé par les tableaux de suivi denses —
// même logique de double-clic (croix puis confirmation) que la suppression
// de colonne de pipeline, pour éviter les suppressions accidentelles.
// Délègue maintenant au composant Button partagé (variante "danger"), qui
// porte cette même logique de confirmation en 2 temps.
import { useTransition } from 'react'
import Button from './button'

export default function DeleteRowButton({ onDelete }: { onDelete: () => void | Promise<void> }) {
  const [, startTransition] = useTransition()

  return (
    <Button
      variant="danger"
      size="sm"
      confirmLabel="Confirmer ?"
      aria-label="Supprimer cette ligne"
      className="!px-1.5 !py-0.5"
      onClick={() => startTransition(() => onDelete())}
    >
      ✕
    </Button>
  )
}