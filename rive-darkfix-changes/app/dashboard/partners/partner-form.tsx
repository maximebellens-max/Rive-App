'use client'

import { useActionState, useRef, useEffect } from 'react'
import { createPartner, type PartnerFormState } from '@/app/actions/partners'
import { PARTNER_ROLES } from '@/lib/rive/templates'

export default function PartnerForm() {
  const [state, action, pending] = useActionState<PartnerFormState, FormData>(createPartner, undefined)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!pending && !state?.error) formRef.current?.reset()
  }, [pending, state])

  return (
    <form
      ref={formRef}
      action={action}
      className="grid grid-cols-1 gap-3 rounded-2xl border border-neutral-200 bg-surface p-5 shadow-sm sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <h2 className="text-sm font-medium text-neutral-700">Ajouter un contact pro</h2>
      </div>
      <input
        name="name"
        placeholder="Nom"
        required
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <select
        name="role"
        defaultValue={PARTNER_ROLES[0]}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent"
      >
        {PARTNER_ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <input
        name="phone"
        placeholder="Téléphone"
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <input
        name="email"
        type="email"
        placeholder="Email"
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <input
        name="notes"
        placeholder="Notes"
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent sm:col-span-2"
      />
      {state?.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60 sm:col-span-2 sm:w-fit"
      >
        {pending ? 'Ajout…' : 'Ajouter'}
      </button>
    </form>
  )
}
