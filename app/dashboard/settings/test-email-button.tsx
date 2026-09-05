'use client'

import { useActionState } from 'react'
import { sendTestEmailAction, type DiagnosticState } from '@/app/actions/meta'

export default function TestEmailButton() {
  const [state, action, pending] = useActionState<DiagnosticState, FormData>(sendTestEmailAction, undefined)

  return (
    <form action={action} className="flex flex-col items-start gap-1.5">
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
      >
        {pending ? 'Envoi…' : "Envoyer un email de test"}
      </button>
      {state?.error && <span className="text-xs text-danger">{state.error}</span>}
      {state?.success && <span className="text-xs text-good">{state.success}</span>}
    </form>
  )
}