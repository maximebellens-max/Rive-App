'use client'

import { useActionState, useRef, useEffect } from 'react'
import { createCommission, type CommissionFormState } from '@/app/actions/commissions'

type MandateOption = { id: string; label: string }

export default function NewCommissionForm({ options }: { options: MandateOption[] }) {
  const [state, action, pending] = useActionState<CommissionFormState, FormData>(createCommission, undefined)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!pending && !state?.error) formRef.current?.reset()
  }, [pending, state])

  if (!options.length) return null

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-surface p-4 shadow-sm"
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700">Rattacher une commission à un mandat vendu</label>
        <select
          name="mandate_id"
          required
          className="w-72 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent"
        >
          <option value="">— Choisir un mandat —</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700">Montant (€)</label>
        <input
          name="amount"
          type="number"
          className="w-32 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
      {state?.error && <p className="w-full text-sm text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? 'Ajout…' : 'Ajouter'}
      </button>
    </form>
  )
}
