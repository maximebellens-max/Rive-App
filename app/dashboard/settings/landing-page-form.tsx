'use client'

import { useActionState } from 'react'
import { createLandingPage, type LandingPageState } from '@/app/actions/landing-pages'

const inputClass =
  'rounded-lg border border-neutral-300 bg-surface px-3 py-2 text-base outline-none focus:border-accent focus:ring-1 focus:ring-accent'

export default function LandingPageForm({ members }: { members: { id: string; full_name: string }[] }) {
  const [state, action, pending] = useActionState<LandingPageState, FormData>(createLandingPage, undefined)

  return (
    <form action={action} className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 p-4">
      <p className="text-xs font-medium text-neutral-700">Ajouter une landing page</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input name="label" placeholder="Nom (ex. Investisseurs Géorgie)" required className={inputClass} />
        <input name="url" type="url" placeholder="URL de la page (facultatif)" className={inputClass} />
        <select name="category" defaultValue="" required className={inputClass}>
          <option value="" disabled>
            — Tableau de destination —
          </option>
          <option value="vendeur">Vendeurs</option>
          <option value="acheteur">Acheteurs</option>
          <option value="investisseur_france">Investisseurs France</option>
          <option value="investisseur_dubai">Investisseurs Dubaï</option>
          <option value="investisseur_georgie">Investisseurs Géorgie</option>
        </select>
        <select name="owner_id" defaultValue="" className={inputClass}>
          <option value="">— Propriétaire (facultatif) —</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name || 'Sans nom'}
            </option>
          ))}
        </select>
      </div>
      {state?.error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? 'Ajout…' : 'Ajouter'}
      </button>
    </form>
  )
}