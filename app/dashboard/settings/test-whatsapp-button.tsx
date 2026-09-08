'use client'

import { useActionState } from 'react'
import { sendTestWhatsAppAction, type WhatsAppDiagnosticState } from '@/app/actions/team'

export default function TestWhatsAppButton() {
  const [state, action, pending] = useActionState<WhatsAppDiagnosticState, FormData>(sendTestWhatsAppAction, undefined)

  return (
    <form action={action} className="flex flex-col items-start gap-1.5">
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
      >
        {pending ? 'Envoi…' : 'Envoyer un WhatsApp de test'}
      </button>
      {state?.error && <span className="text-xs text-danger">{state.error}</span>}
      {state?.success && <span className="text-xs text-good">{state.success}</span>}
    </form>
  )
}