'use client'

import { useState, useTransition } from 'react'
import { removeAllDvfComparables } from '@/app/actions/mandates'

export default function ClearComparablesButton({ mandateId }: { mandateId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs text-neutral-500 hover:text-danger hover:underline"
      >
        Tout supprimer
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => removeAllDvfComparables(mandateId))}
      className="text-xs font-medium text-danger hover:underline disabled:opacity-60"
    >
      {pending ? 'Suppression…' : 'Confirmer — supprimer tous les comparables ?'}
    </button>
  )
}