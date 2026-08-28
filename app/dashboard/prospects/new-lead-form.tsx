'use client'

import { useActionState, useRef, useEffect } from 'react'
import { createLead, type LeadFormState } from '@/app/actions/leads'

export default function NewLeadForm() {
  const [state, action, pending] = useActionState<LeadFormState, FormData>(
    createLead,
    undefined
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!pending && !state?.error) {
      formRef.current?.reset()
    }
  }, [pending, state])

  return (
    <form
      ref={formRef}
      action={action}
      className="grid grid-cols-1 gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <h2 className="text-sm font-medium text-neutral-700">
          Ajouter un prospect
        </h2>
      </div>

      <input
        name="name"
        placeholder="Nom"
        required
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
      <select
        name="category"
        defaultValue="acheteur"
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      >
        <option value="acheteur">Acheteur</option>
        <option value="vendeur">Vendeur</option>
        <option value="investisseur">Investisseur</option>
      </select>
      <input
        name="phone"
        placeholder="Téléphone"
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
      <input
        name="email"
        type="email"
        placeholder="Email"
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
      <input
        name="critere_lieu"
        placeholder="Secteur recherché"
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent sm:col-span-2"
      />

      {state?.error && (
        <p className="text-sm text-danger sm:col-span-2" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-60 sm:col-span-2 sm:w-fit"
      >
        {pending ? 'Ajout…' : 'Ajouter'}
      </button>
    </form>
  )
}
