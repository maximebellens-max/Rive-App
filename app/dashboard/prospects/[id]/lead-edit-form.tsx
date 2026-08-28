'use client'

import { useActionState } from 'react'
import { updateLead, type LeadFormState } from '@/app/actions/leads'

type Lead = {
  id: string
  name: string
  phone: string
  email: string
  category: string | null
  source: string
  campaign: string
  critere_type: string
  critere_lieu: string
  budget: number | null
  pieces_min: number | null
  surface_min: number | null
  financement: string
  rendement_vise: number | null
  action_label: string
  action_date: string | null
  notes: string
  civility: string
  address: string
  birth_date: string | null
  birth_place: string
  nationality: string
  marital_status: string
}

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'
const labelClass = 'text-sm font-medium text-neutral-700'

export default function LeadEditForm({ lead }: { lead: Lead }) {
  const updateWithId = updateLead.bind(null, lead.id)
  const [state, action, pending] = useActionState<LeadFormState, FormData>(updateWithId, undefined)

  return (
    <form action={action} className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-neutral-900">Identité</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Nom</label>
            <input name="name" defaultValue={lead.name} className={inputClass} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Catégorie</label>
            <select name="category" defaultValue={lead.category ?? ''} className={inputClass}>
              <option value="">—</option>
              <option value="acheteur">Acheteur</option>
              <option value="vendeur">Vendeur</option>
              <option value="investisseur">Investisseur</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Téléphone</label>
            <input name="phone" defaultValue={lead.phone} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Email</label>
            <input name="email" type="email" defaultValue={lead.email} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Source</label>
            <input name="source" placeholder="Bouche à oreille, portail, réseau…" defaultValue={lead.source} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Campagne</label>
            <input name="campaign" defaultValue={lead.campaign} className={inputClass} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-neutral-100 pt-6">
        <h2 className="text-sm font-semibold text-neutral-900">Critères</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Type de bien recherché / concerné</label>
            <input name="critere_type" defaultValue={lead.critere_type} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Secteur / lieu</label>
            <input name="critere_lieu" defaultValue={lead.critere_lieu} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Budget (€)</label>
            <input name="budget" type="number" defaultValue={lead.budget ?? ''} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Financement</label>
            <select name="financement" defaultValue={lead.financement} className={inputClass}>
              <option value="">—</option>
              <option value="Cash (comptant)">Cash (comptant)</option>
              <option value="En cours">En cours</option>
              <option value="Validé">Validé</option>
              <option value="Refusé">Refusé</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Pièces min.</label>
            <input name="pieces_min" type="number" defaultValue={lead.pieces_min ?? ''} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Surface min. (m²)</label>
            <input name="surface_min" type="number" step="0.1" defaultValue={lead.surface_min ?? ''} className={inputClass} />
          </div>
          {lead.category === 'investisseur' && (
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Rendement visé (%)</label>
              <input name="rendement_vise" type="number" step="0.1" defaultValue={lead.rendement_vise ?? ''} className={inputClass} />
            </div>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-neutral-100 pt-6">
        <h2 className="text-sm font-semibold text-neutral-900">Suivi</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Prochaine action</label>
            <input name="action_label" placeholder="Rappeler, envoyer une offre…" defaultValue={lead.action_label} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Date</label>
            <input name="action_date" type="date" defaultValue={lead.action_date ?? ''} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea name="notes" defaultValue={lead.notes} rows={3} className={inputClass} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-neutral-100 pt-6">
        <h2 className="text-sm font-semibold text-neutral-900">État civil</h2>
        <p className="text-xs text-neutral-500">
          Saisi une fois ici, repris automatiquement comme mandant sur tout mandat lié à ce prospect.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Civilité</label>
            <select name="civility" defaultValue={lead.civility} className={inputClass}>
              <option value="Monsieur">Monsieur</option>
              <option value="Madame">Madame</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className={labelClass}>Adresse</label>
            <input name="address" defaultValue={lead.address} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Né(e) à</label>
            <input name="birth_place" defaultValue={lead.birth_place} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Date de naissance</label>
            <input name="birth_date" type="date" defaultValue={lead.birth_date ?? ''} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Nationalité</label>
            <input name="nationality" defaultValue={lead.nationality} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Situation familiale</label>
            <input name="marital_status" placeholder="Célibataire, marié(e)…" defaultValue={lead.marital_status} className={inputClass} />
          </div>
        </div>
      </section>

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
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}
