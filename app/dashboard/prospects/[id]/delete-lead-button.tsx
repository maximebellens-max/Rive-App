'use client'

import { useTransition } from 'react'
import { deleteLead } from '@/app/actions/leads'
import Button from '../../_components/button'

export default function DeleteLeadButton({ leadId }: { leadId: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="danger"
      disabled={pending}
      confirmLabel="Confirmer la suppression"
      onClick={() => startTransition(() => deleteLead(leadId))}
    >
      {pending ? 'Suppression…' : 'Supprimer'}
    </Button>
  )
}