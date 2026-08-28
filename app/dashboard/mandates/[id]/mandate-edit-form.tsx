'use client'

import { useActionState } from 'react'
import { updateMandate, type MandateFormState } from '@/app/actions/mandates'
import { CONDITION_LEVELS, DPE_LEVELS, FEATURE_KEYS } from '@/lib/rive/mandates'

type Mandate = {
  id: string
  type: string
  address: string
  property_type: string
  surface: number | null
  pieces: number | null
  price: number | null
  remaining_loan: number | null
  signed_date: string | null
  sold_date: string | null
  exclusivity: string
  duration_months: number | null
  tacit_renewal: boolean
  renewal_notice_days: number
  condition: string
  dpe: string
  floor: number | null
  has_elevator: boolean
  features: Record<string, boolean> | null
  year_built: number | null
  recent_works: string
  estimated_rent: number | null
  notes: string
  stage: string
}

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'
const labelClass = 'text-sm font-medium text-neutral-700'

export default function MandateEditForm({ mandate }: { mandate: Mandate }) {
  const updateWithId = updateMandate.bind(null, mandate.id)
  const [state, action, pending] = useActionState<MandateFormState, FormData>(
    updateWithId,
    undefined
  )

  return (
    <form action={action} className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-neutral-900">Bien</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className={labelClass}>Adresse</label>
            <input name="address" defaultValue={mandate.address} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Type de bien</label>
            <input name="property_type" defaultValue={mandate.property_type} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Surface (m²)</label>
            <input name="surface" type="number" step="0.1" defaultValue={mandate.surface ?? ''} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Pièces</label>
            <input name="pieces" type="number" defaultValue={mandate.pieces ?? ''} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Étage</label>
            <input name="floor" type="number" defaultValue={mandate.floor ?? ''} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>État</label>
            <select name="condition" defaultValue={mandate.condition} className={inputClass}>
              <option value="">—</option>
              {CONDITION_LEVELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>DPE</label>
            <select name="dpe" defaultValue={mandate.dpe} className={inputClass}>
              <option value="">—</option>
              {DPE_LEVELS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.value}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Année de construction</label>
            <input name="year_built" type="number" defaultValue={mandate.year_built ?? ''} className={inputClass} />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" name="has_elevator" defaultChecked={mandate.has_elevator} className="h-4 w-4" />
            Ascenseur
          </label>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className={labelClass}>Travaux récents</label>
            <input name="recent_works" defaultValue={mandate.recent_works} className={inputClass} />
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          {FEATURE_KEYS.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                name={`feature_${f.key}`}
                defaultChecked={!!mandate.features?.[f.key]}
                className="h-4 w-4"
              />
              {f.label}
            </label>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-neutral-100 pt-6">
        <h2 className="text-sm font-semibold text-neutral-900">Prix & financier</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Prix (€)</label>
            <input name="price" type="number" defaultValue={mandate.price ?? ''} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Capital restant dû (€)</label>
            <input name="remaining_loan" type="number" defaultValue={mandate.remaining_loan ?? ''} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Loyer mensuel estimé (€)</label>
            <input name="estimated_rent" type="number" defaultValue={mandate.estimated_rent ?? ''} className={inputClass} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-neutral-100 pt-6">
        <h2 className="text-sm font-semibold text-neutral-900">Exclusivité & durée</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Exclusivité</label>
            <select name="exclusivity" defaultValue={mandate.exclusivity} className={inputClass}>
              <option value="">—</option>
              <option value="exclusif">Exclusif</option>
              <option value="simple">Simple</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Date de signature</label>
            <input name="signed_date" type="date" defaultValue={mandate.signed_date ?? ''} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Durée (mois)</label>
            <input name="duration_months" type="number" defaultValue={mandate.duration_months ?? ''} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Préavis de renouvellement (jours)</label>
            <input
              name="renewal_notice_days"
              type="number"
              defaultValue={mandate.renewal_notice_days ?? 15}
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" name="tacit_renewal" defaultChecked={mandate.tacit_renewal} className="h-4 w-4" />
            Reconduction tacite
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-neutral-100 pt-6">
        <h2 className="text-sm font-semibold text-neutral-900">Suivi</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Étape</label>
            <select name="stage" defaultValue={mandate.stage} className={inputClass}>
              <option value="en_cours">En cours</option>
              <option value="compromis_signe">Compromis signé</option>
              <option value="vendu">Vendu</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Date de vente</label>
            <input name="sold_date" type="date" defaultValue={mandate.sold_date ?? ''} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea name="notes" defaultValue={mandate.notes} rows={3} className={inputClass} />
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
