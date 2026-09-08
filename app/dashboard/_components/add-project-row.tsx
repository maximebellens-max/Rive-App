'use client'

// Ligne "+ Ajouter" partagée par les tableaux de suivi denses (Ameublement,
// Cuisine, Travaux) : recherche d'un prospect existant puis création d'une
// ligne vide qui se règle ensuite directement dans le tableau.
import { useState, useTransition } from 'react'
import LeadCombobox, { type LeadOption } from './lead-combobox'

export default function AddProjectRow({
  leadOptions,
  colSpan,
  onCreate,
}: {
  leadOptions: LeadOption[]
  colSpan: number
  onCreate: (leadId: string) => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [, startTransition] = useTransition()

  if (!open) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-3 py-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs font-medium text-accent hover:underline"
          >
            + Ajouter un dossier
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-2">
        <form
          className="flex max-w-sm items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const leadId = String(formData.get('lead_id') || '')
            if (!leadId) return
            setPending(true)
            startTransition(async () => {
              await onCreate(leadId)
              setPending(false)
              setOpen(false)
            })
          }}
        >
          <div className="flex-1">
            <LeadCombobox options={leadOptions} />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? '…' : 'Ajouter'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="shrink-0 rounded-lg px-2 py-2 text-xs text-neutral-500 hover:bg-neutral-100"
          >
            ✕
          </button>
        </form>
      </td>
    </tr>
  )
}