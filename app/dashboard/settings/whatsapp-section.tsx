'use client'

import { useActionState } from 'react'
import { updateMyWhatsAppNumber, type WhatsAppFormState } from '@/app/actions/team'

export default function WhatsAppSection({
  whatsappNumber,
  whatsappAlertsEnabled,
  whatsappSenderPhoneNumberId,
}: {
  whatsappNumber: string
  whatsappAlertsEnabled: boolean
  whatsappSenderPhoneNumberId: string
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
        <div className="flex flex-col gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <label htmlFor="whatsapp_sender_phone_number_id" className="text-sm font-medium text-neutral-700">
            Envoyer mes alertes depuis mon propre numéro (optionnel)
          </label>
          <p className="text-xs text-neutral-500">
            Si tu as ton propre numéro professionnel WhatsApp enregistré sous le compte WhatsApp Business de
            l&apos;agence, colle ici son <span className="font-medium">Phone Number ID</span> (Meta Business Suite →
            WhatsApp Manager → API Setup, à côté de ton numéro). Laisse vide pour utiliser le numéro partagé de
            l&apos;agence.
          </p>
          <input
            id="whatsapp_sender_phone_number_id"
            name="whatsapp_sender_phone_number_id"
            defaultValue={whatsappSenderPhoneNumberId}
            placeholder="Ex. 123456789012345"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
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