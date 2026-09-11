'use client'

import { useTransition } from 'react'
import { deleteCommission } from '@/app/actions/commissions'
import Button from '../../_components/button'

export default function DeleteCommissionButton({ commissionId }: { commissionId: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="danger"
      disabled={pending}
      confirmLabel="Confirmer la suppression"
      onClick={() => startTransition(() => deleteCommission(commissionId))}
    >
      {pending ? 'Suppression…' : 'Supprimer'}
    </Button>
  )
}