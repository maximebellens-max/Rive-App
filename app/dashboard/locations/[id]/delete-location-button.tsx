'use client'

import { useTransition } from 'react'
import { deleteLocation } from '@/app/actions/locations'
import Button from '../../_components/button'

export default function DeleteLocationButton({ locationId }: { locationId: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="danger"
      disabled={pending}
      confirmLabel="Confirmer la suppression"
      onClick={() => startTransition(() => deleteLocation(locationId))}
    >
      {pending ? 'Suppression…' : 'Supprimer'}
    </Button>
  )
}