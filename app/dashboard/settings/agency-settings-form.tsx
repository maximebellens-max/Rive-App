'use client'

import { useActionState } from 'react'
import { updateAgencySettings, type AgencySettingsState } from '@/app/actions/agency'

type Agency = {
  name: string
  legal_form: string
  share_capital: number | null
  siren: string
  rcs_city: string
  address: string
  phone: string
  email: string
  legal_rep_civility: string
  legal_rep_first_name: string
  legal_rep_last_name: string
  carte_pro_number: string
  carte_pro_date: string | null
  carte_pro_cci: string
  insurer_name: string
  insurer_address: string
  insurer_policy_number: string
  next_mandate_number: number
}

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent'
const labelClass = 'text-sm font-medium text-neutral-700'

export default function AgencySettingsForm({ agency }: { agency: Agency }) {
  const [state, action, pending] = useActionState<AgencySettingsState, FormData>(
    updateAgencySettings,
    undefined
  )

  return (
    <form action={action} className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-neutral-900">Identité de l&apos;agence</h2>
        <p className="text-xs text-neutral-500">
          Ces informations apparaissent telles quelles sur chaque mandat généré (mentions obligatoires).
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Nom commercial</label>
            <input name="name" defaultValue={agency.name} className={inputClass} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Forme juridique</label>
            <input name="legal_form" placeholder="Société par Actions simplifiée" defaultValue={agency.legal_form} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Capital social (€)</label>
            <input name="share_capital" type="number" defaultValue={agency.share_capital ?? ''} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>SIREN</label>
            <input name="siren" defaultValue={agency.siren} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Ville du RCS</label>
            <input name="rcs_city" defaultValue={agency.rcs_city} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className={labelClass}>Adresse du siège social</label>
            <input name="address" defaultValue={agency.address} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Téléphone</label>
            <input name="phone" defaultValue={agency.phone} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Email</label>
            <input name="email" type="email" defaultValue={agency.email} className={inputClass} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-neutral-100 pt-6">
        <h2 className="text-sm font-semibold text-neutral-900">Représentant légal</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Civilité</label>
            <select name="legal_rep_civility" defaultValue={agency.legal_rep_civility} className={inputClass}>
              <option value="Monsieur">Monsieur</option>
              <option value="Madame">Madame</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Prénom</label>
            <input name="legal_rep_first_name" defaultValue={agency.legal_rep_first_name} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Nom</label>
            <input name="legal_rep_last_name" defaultValue={agency.legal_rep_last_name} className={inputClass} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-neutral-100 pt-6">
        <h2 className="text-sm font-semibold text-neutral-900">Carte professionnelle</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Numéro</label>
            <input name="carte_pro_number" defaultValue={agency.carte_pro_number} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Date de délivrance</label>
            <input name="carte_pro_date" type="date" defaultValue={agency.carte_pro_date ?? ''} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>CCI de délivrance</label>
            <input name="carte_pro_cci" placeholder="Haute-Savoie" defaultValue={agency.carte_pro_cci} className={inputClass} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-neutral-100 pt-6">
        <h2 className="text-sm font-semibold text-neutral-900">Assurance responsabilité civile professionnelle</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Assureur</label>
            <input name="insurer_name" defaultValue={agency.insurer_name} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Adresse de l&apos;assureur</label>
            <input name="insurer_address" defaultValue={agency.insurer_address} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>N° de police</label>
            <input name="insurer_policy_number" defaultValue={agency.insurer_policy_number} className={inputClass} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-neutral-100 pt-6">
        <h2 className="text-sm font-semibold text-neutral-900">Registre des mandats</h2>
        <div className="flex flex-col gap-1.5 sm:w-64">
          <label className={labelClass}>Prochain numéro à attribuer</label>
          <input
            name="next_mandate_number"
            type="number"
            min={1}
            defaultValue={agency.next_mandate_number}
            className={inputClass}
          />
          <p className="text-xs text-neutral-400">
            À ajuster une seule fois pour prolonger la numérotation d&apos;un outil précédent sans créer de trou.
          </p>
        </div>
      </section>

      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && <p className="text-sm text-good">Enregistré.</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}
