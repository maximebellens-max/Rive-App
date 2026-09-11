'use client'

import { useTransition } from 'react'
import { deleteInvestment } from '@/app/actions/investments'
import Button from '../../_components/button'

export default function DeleteInvestmentButton({ investmentId }: { investmentId: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="danger"
      disabled={pending}
      confirmLabel="Confirmer la suppression"
      onClick={() => startTransition(() => deleteInvestment(investmentId))}
    >
      {pending ? 'Suppression…' : 'Supprimer'}
    </Button>
  )
}