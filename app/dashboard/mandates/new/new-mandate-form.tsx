'use client'

import { useActionState, useState } from 'react'
import { createMandate, type MandateFormState } from '@/app/actions/mandates'

type Lead = {
  id: string
  name: string
  category: string | null
  critere_type: string
  critere_lieu: string
  budget: number | null
  surface_min: number | null
}

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent'

export default function NewMandateForm({ leads }: { leads: Lead[] }) {
  const [state, action, pending] = useActionState<MandateFormState, FormData>(
    createMandate,
    undefined
  )

  const [address, setAddress] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [surface, setSurface] = useState('')
  const [price, setPrice] = useState('')

  function handleLeadChange(leadId: string) {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return
    // Pré-remplit depuis les critères déjà saisis sur la fiche du prospect,
    // pour éviter de ressaisir ce qu'on connaît déjà. Reste modifiable.
    setAddress(lead.critere_lieu || '')
    setPropertyType(lead.critere_type || '')
    setSurface(lead.surface_min ? String(lead.surface_min) : '')
    setPrice(lead.budget ? String(lead.budget) : '')
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700">Type de mandat</label>
          <select name="kind" defaultValue="vente_exclusif" className={inputClass}>
            <option value="vente_exclusif">Vente — Exclusif</option>
            <option value="vente_simple">Vente — Simple</option>
            <option value="recherche">Recherche (mandat acheteur)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700">Client lié</label>
          <select
            name="lead_id"
            defaultValue=""
            onChange={(e) => handleLeadChange(e.target.value)}
            className={inputClass}
          >
            <option value="">Aucun</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
                {l.category ? ` (${l.category})` : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-neutral-400">
            Choisir un prospect pré-remplit l&apos;adresse, le type de bien, la surface et le prix depuis sa
            fiche.
          </p>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-sm font-medium text-neutral-700">Adresse du bien</label>
          <input
            name="address"
            placeholder="12 rue de la Paix, Annemasse"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700">Type de bien</label>
          <input
            name="property_type"
            placeholder="Appartement, maison…"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700">Surface (m²)</label>
          <input
            name="surface"
            type="number"
            step="0.1"
            value={surface}
            onChange={(e) => setSurface(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700">Prix (€)</label>
          <input
            name="price"
            type="number"
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? 'Création…' : 'Créer le mandat'}
      </button>
      <p className="text-xs text-neutral-400">
        Si un client est lié, ses nom, téléphone et email seront repris automatiquement comme mandant sur le
        mandat. Les autres champs (exclusivité, comparables, estimation…) se renseignent depuis la fiche du
        mandat.
      </p>
    </form>
  )
}
