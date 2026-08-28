'use client'

import { useActionState, useRef, useEffect, useState } from 'react'
import { createTemplate, type TemplateFormState } from '@/app/actions/templates'

export default function TemplateForm() {
  const [state, action, pending] = useActionState<TemplateFormState, FormData>(createTemplate, undefined)
  const formRef = useRef<HTMLFormElement>(null)
  const [channel, setChannel] = useState<'sms' | 'email'>('sms')

  useEffect(() => {
    if (!pending && !state?.error) formRef.current?.reset()
  }, [pending, state])

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-sm font-medium text-neutral-700">Nouveau modèle</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          name="name"
          placeholder="Nom du modèle"
          required
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <select
          name="channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value as 'sms' | 'email')}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        >
          <option value="sms">SMS</option>
          <option value="email">Email</option>
        </select>
      </div>
      {channel === 'email' && (
        <input
          name="subject"
          placeholder="Objet"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      )}
      <textarea
        name="body"
        placeholder="Contenu — variables disponibles : {{prenom}}, {{date}}, {{agent}}"
        rows={4}
        required
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60"
      >
        {pending ? 'Ajout…' : 'Ajouter'}
      </button>
    </form>
  )
}
