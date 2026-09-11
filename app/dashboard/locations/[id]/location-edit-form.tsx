'use client'

import { useActionState } from 'react'
import { updateLocation, type LocationFormState, type Tenant } from '@/app/actions/locations'
import TenantsEditor from './tenants-editor'

type Listing = {
  id: string
  assigned_to: string | null
  type_location: string
  honoraires_bailleur: number | null
  honoraires_locataire: number | null
  locataires: Tenant[]
  dossier_url: string
  commentaire: string
}

type Member = { id: string; full_name: string }

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent'
const labelClass = 'text-sm font-medium text-neutral-700'

export default function LocationEditForm({ listing, members }: { listing: Listing; members: Member[] }) {
  const updateWithId = updateLocation.bind(null, listing.id)
  const [state, action, pending] = useActionState<LocationFormState, FormData>(updateWithId, undefined)

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Type de location</label>
          <select name="type_location" defaultValue={listing.type_location} className={inputClass}>
            <option value="longue_duree">Longue durée</option>
            <option value="colocation">Colocation</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Agent en charge</label>
          <select name="assigned_to" defaultValue={listing.assigned_to ?? ''} className={inputClass}>
            <option value="">—</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name || 'Sans nom'}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Honoraires bailleur (H.T)</label>
          <input
            name="honoraires_bailleur"
            type="number"
            defaultValue={listing.honoraires_bailleur ?? ''}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Honoraires locataire (H.T)</label>
          <input
            name="honoraires_locataire"
            type="number"
            defaultValue={listing.honoraires_locataire ?? ''}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className={labelClass}>Lien du dossier</label>
          <input
            name="dossier_url"
            type="url"
            placeholder="https://drive.google.com/…"
            defaultValue={listing.dossier_url}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className={labelClass}>Commentaire</label>
          <textarea name="commentaire" defaultValue={listing.commentaire} rows={2} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <TenantsEditor initial={listing.locataires} />
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