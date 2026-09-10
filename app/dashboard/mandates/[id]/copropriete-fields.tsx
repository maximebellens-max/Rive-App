'use client'

import { useState } from 'react'
import type { Copropriete } from '@/lib/rive/mandates'

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent'
const labelClass = 'text-sm font-medium text-neutral-700'

// Les champs de la copropriété (charges, syndic, fonds travaux…) n'ont pas
// de sens sur une maison individuelle — masqués tant que la case n'est pas
// cochée plutôt que laissés vides et inutiles sous les yeux, comme pour les
// autres champs conditionnels de l'app (voir LeadEditForm : critères selon
// catégorie, conjoint selon situation familiale).
export default function CoproprieteFields({ defaultChecked, copro }: { defaultChecked: boolean; copro: Copropriete }) {
  const [checked, setChecked] = useState(defaultChecked)

  return (
    <>
      <label className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
        <input
          type="checkbox"
          name="en_copropriete"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="h-4 w-4"
        />
        Bien en copropriété
      </label>
      {checked && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Nombre de lots de la copropriété</label>
            <input name="copro_total_lots" defaultValue={copro.total_lots ?? ''} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Charges annuelles (€)</label>
            <input name="copro_charges_annuelles" defaultValue={copro.charges_annuelles ?? ''} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Fonds travaux (€)</label>
            <input name="copro_fonds_travaux" defaultValue={copro.fonds_travaux ?? ''} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Syndic</label>
            <input name="copro_syndic_nom" defaultValue={copro.syndic_nom ?? ''} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Contact du syndic</label>
            <input name="copro_syndic_contact" defaultValue={copro.syndic_contact ?? ''} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Procédures en cours</label>
            <input
              name="copro_procedures_en_cours"
              placeholder="Aucune, ou en préciser la nature"
              defaultValue={copro.procedures_en_cours ?? ''}
              className={inputClass}
            />
          </div>
        </div>
      )}
    </>
  )
}