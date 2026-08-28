'use client'

import { useActionState } from 'react'
import { updateCommission, type CommissionFormState } from '@/app/actions/commissions'

type Commission = { id: string; amount: number | null; paid_date: string | null; notes: string }

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'
const labelClass = 'text-sm font-medium text-neutral-700'

export default function CommissionEditForm({ commission }: { commission: Commission }) {
  const updateWithId = updateCommission.bind(null, commission.id)
  const [state, action, pending] = useActionState<CommissionFormState, FormData>(updateWithId, undefined)

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Montant (€)</label>
          <input name="amount" type="number" defaultValue={commission.amount ?? ''} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Date de paiement</label>
          <input name="paid_date" type="date" defaultValue={commission.paid_date ?? ''} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className={labelClass}>Notes</label>
          <textarea name="notes" defaultValue={commission.notes} rows={3} className={inputClass} />
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
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}
