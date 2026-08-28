'use client'

import { useActionState } from 'react'
import { createMandate, type MandateFormState } from '@/app/actions/mandates'

type Lead = { id: string; name: string; category: string | null }

export default function NewMandateForm({ leads }: { leads: Lead[] }) {
  const [state, action, pending] = useActionState<MandateFormState, FormData>(
    createMandate,
    undefined
  )

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700">Type de mandat</label>
          <select
            name="type"
            defaultValue="vente"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          >
            <option value="vente">Vente (bien à vendre)</option>
            <option value="recherche">Recherche (mandat acheteur)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700">Client lié (optionnel)</label>
          <select
            name="lead_id"
            defaultValue=""
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          >
            <option value="">Aucun</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
                {l.category ? ` (${l.category})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-sm font-medium text-neutral-700">Adresse du bien</label>
          <input
            name="address"
            placeholder="12 rue de la Paix, Annemasse"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700">Type de bien</label>
          <input
            name="property_type"
            placeholder="Appartement, maison…"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700">Prix (€)</label>
          <input
            name="price"
            type="number"
            step="1"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60"
      >
        {pending ? 'Création…' : 'Créer le mandat'}
      </button>
      <p className="text-xs text-neutral-400">
        Les autres champs (exclusivité, comparables, estimation…) se renseignent depuis la fiche du mandat.
      </p>
    </form>
  )
}
