'use client'

import { useActionState } from 'react'
import { updateMyWhatsAppNumber, type WhatsAppFormState } from '@/app/actions/team'

export default function WhatsAppSection({
  whatsappNumber,
  whatsappAlertsEnabled,
}: {
  whatsappNumber: string
  whatsappAlertsEnabled: boolean
}) {
  const [state, action, pending] = useActionState<WhatsAppFormState, FormData>(updateMyWhatsAppNumber, undefined)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Alertes WhatsApp</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Reçois un message WhatsApp sur ton téléphone pour les événements importants : nouveau prospect, rendez-vous
          du jour, mandat proche de son échéance de renouvellement. Ce réglage est personnel — chacun active ses
          propres alertes.
        </p>
      </div>

      {state?.error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{state.error}</p>}
      {state?.success && <p className="rounded-lg bg-good-soft px-3 py-2 text-xs text-good">Enregistré.</p>}

      <form action={action} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="whatsapp_number" className="text-sm font-medium text-neutral-700">
            Ton numéro WhatsApp
          </label>
          <input
            id="whatsapp_number"
            name="whatsapp_number"
            defaultValue={whatsappNumber}
            placeholder="Ex. 33612345678 (indicatif pays, sans le 0 initial, sans espace)"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            name="whatsapp_alerts_enabled"
            defaultChecked={whatsappAlertsEnabled}
            className="rounded border-neutral-300"
          />
          Recevoir les alertes WhatsApp
        </label>
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-50"
        >
          Enregistrer
        </button>
      </form>
    </div>
  )
}