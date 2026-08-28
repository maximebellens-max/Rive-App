'use client'

import { useState, useTransition } from 'react'
import { deleteLead } from '@/app/actions/leads'

export default function DeleteLeadButton({ leadId }: { leadId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-danger px-3 py-1.5 text-sm text-danger hover:bg-danger-soft"
      >
        Supprimer
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => deleteLead(leadId))}
      className="rounded-lg border border-danger bg-danger px-3 py-1.5 text-sm text-white hover:bg-danger-hover disabled:opacity-60"
    >
      {pending ? 'Suppression…' : 'Confirmer la suppression'}
    </button>
  )
}
