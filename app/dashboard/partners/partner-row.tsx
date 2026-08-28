'use client'

import { useState, useTransition } from 'react'
import { updatePartner, deletePartner } from '@/app/actions/partners'
import { PARTNER_ROLES } from '@/lib/rive/templates'

type Partner = { id: string; name: string; role: string; phone: string; email: string; notes: string }

const inputClass = 'rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-accent'

export default function PartnerRow({ partner }: { partner: Partner }) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [, startTransition] = useTransition()

  if (editing) {
    return (
      <form
        action={(formData: FormData) => {
          startTransition(() => updatePartner(partner.id, formData))
          setEditing(false)
        }}
        className="grid grid-cols-1 gap-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-2"
      >
        <input name="name" defaultValue={partner.name} className={inputClass} required />
        <select name="role" defaultValue={partner.role} className={inputClass}>
          {PARTNER_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input name="phone" defaultValue={partner.phone} className={inputClass} />
        <input name="email" defaultValue={partner.email} className={inputClass} />
        <input name="notes" defaultValue={partner.notes} className={`${inputClass} sm:col-span-2`} />
        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white">
            Enregistrer
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-sm text-neutral-500">
            Annuler
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div>
        <p className="font-medium text-neutral-900">{partner.name}</p>
        <p className="text-sm text-neutral-500">
          {partner.role}
          {partner.phone ? ` · ${partner.phone}` : ''}
          {partner.email ? ` · ${partner.email}` : ''}
        </p>
        {partner.notes && <p className="mt-1 text-xs text-neutral-400">{partner.notes}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={() => setEditing(true)} className="text-sm text-neutral-500 hover:underline">
          Modifier
        </button>
        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-sm text-danger hover:underline"
          >
            Supprimer
          </button>
        ) : (
          <button
            type="button"
            onClick={() => startTransition(() => deletePartner(partner.id))}
            className="rounded-lg bg-danger px-2 py-1 text-xs text-white"
          >
            Confirmer ?
          </button>
        )}
      </div>
    </div>
  )
}
