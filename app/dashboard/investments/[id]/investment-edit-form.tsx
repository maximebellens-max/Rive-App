'use client'

import { useActionState } from 'react'
import { updateInvestment, type InvestmentFormState } from '@/app/actions/investments'

type Project = {
  id: string
  capacite_emprunt: number | null
  date_mandat: string | null
  echeance_notaire_debut: string | null
  echeance_notaire_fin: string | null
  date_compromis: string | null
  date_acte: string | null
  apporteur: string
  ca_ht: number | null
  commission_apporteur_pct: number | null
  notes: string
}

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent'
const labelClass = 'text-sm font-medium text-neutral-700'

export default function InvestmentEditForm({ project }: { project: Project }) {
  const updateWithId = updateInvestment.bind(null, project.id)
  const [state, action, pending] = useActionState<InvestmentFormState, FormData>(updateWithId, undefined)

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>C.A (H.T)</label>
          <input name="ca_ht" type="number" defaultValue={project.ca_ht ?? ''} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Capacité d&apos;emprunt (€)</label>
          <input name="capacite_emprunt" type="number" defaultValue={project.capacite_emprunt ?? ''} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Apporteur</label>
          <input name="apporteur" type="text" defaultValue={project.apporteur} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Rémunération apporteur (%)</label>
          <input
            name="commission_apporteur_pct"
            type="number"
            defaultValue={project.commission_apporteur_pct ?? ''}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Date du mandat</label>
          <input name="date_mandat" type="date" defaultValue={project.date_mandat ?? ''} className={inputClass} />
        </div>
        <div />
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Échéance notaire — début</label>
          <input
            name="echeance_notaire_debut"
            type="date"
            defaultValue={project.echeance_notaire_debut ?? ''}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Échéance notaire — fin</label>
          <input
            name="echeance_notaire_fin"
            type="date"
            defaultValue={project.echeance_notaire_fin ?? ''}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Signature compromis</label>
          <input name="date_compromis" type="date" defaultValue={project.date_compromis ?? ''} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Signature de l&apos;acte</label>
          <input name="date_acte" type="date" defaultValue={project.date_acte ?? ''} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className={labelClass}>Notes</label>
          <textarea name="notes" defaultValue={project.notes} rows={3} className={inputClass} />
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
        className="w-fit rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}