'use client'

import { useTransition } from 'react'
import { activateMandateDraft } from '@/app/actions/mandates'

export default function ActivateMandateButton({ mandateId }: { mandateId: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => activateMandateDraft(mandateId))}
      className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
    >
      {pending ? 'Passage en mandat…' : 'Passer au mandat signé'}
    </button>
  )
}