'use client'

import { useState, useTransition } from 'react'
import { deleteCommission } from '@/app/actions/commissions'

export default function DeleteCommissionButton({ commissionId }: { commissionId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
      >
        Supprimer
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => deleteCommission(commissionId))}
      className="rounded-lg border border-red-600 bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60"
    >
      {pending ? 'Suppression…' : 'Confirmer la suppression'}
    </button>
  )
}
