'use client'

import { useActionState, useRef, useEffect } from 'react'
import { createLocation, type LocationFormState } from '@/app/actions/locations'
import LeadCombobox, { type LeadOption } from '../_components/lead-combobox'

export default function NewLocationForm({ leadOptions }: { leadOptions: LeadOption[] }) {
  const [state, action, pending] = useActionState<LocationFormState, FormData>(createLocation, undefined)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!pending && !state?.error) formRef.current?.reset()
  }, [pending, state])

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-surface p-4 shadow-sm"
    >
      <div className="flex w-72 flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700">Nouvelle mise en location — client concerné</label>
        <LeadCombobox options={leadOptions} placeholder="Rechercher un prospect…" />
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