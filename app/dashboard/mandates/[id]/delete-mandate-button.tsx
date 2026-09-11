'use client'

import { useTransition } from 'react'
import { deleteMandate } from '@/app/actions/mandates'
import Button from '../../_components/button'

export default function DeleteMandateButton({ mandateId }: { mandateId: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="danger"
      disabled={pending}
      confirmLabel="Confirmer la suppression"
      onClick={() => startTransition(() => deleteMandate(mandateId))}
    >
      {pending ? 'Suppression…' : 'Supprimer'}
    </Button>
  )
}