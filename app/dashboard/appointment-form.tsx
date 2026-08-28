'use client'

import { useRef, useTransition } from 'react'
import { setLeadAppointment } from '@/app/actions/leads'

type LeadOption = { id: string; name: string }

export default function AppointmentForm({ options }: { options: LeadOption[] }) {
  const [, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={formRef}
      action={(formData: FormData) => {
        startTransition(async () => {
          await setLeadAppointment(formData)
          formRef.current?.reset()
        })
      }}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700">Prospect</label>
        <select
          name="lead_id"
          required
          className="w-56 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        >
          <option value="">— Choisir —</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700">Action</label>
        <input
          name="action_label"
          placeholder="RDV, appel…"
          className="w-40 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700">Date</label>
        <input
          name="action_date"
          type="date"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>
      <button type="submit" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700">
        Enregistrer
      </button>
    </form>
  )
}
