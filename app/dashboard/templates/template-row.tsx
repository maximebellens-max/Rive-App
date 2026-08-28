'use client'

import { useState, useTransition } from 'react'
import { updateTemplate, deleteTemplate } from '@/app/actions/templates'

type Template = { id: string; name: string; channel: string; subject: string; body: string }

const inputClass = 'rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900'

export default function TemplateRow({ template }: { template: Template }) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [, startTransition] = useTransition()
  const updateWithId = updateTemplate.bind(null, template.id)

  if (editing) {
    return (
      <form
        action={(formData: FormData) => {
          startTransition(() => {
            updateWithId(undefined, formData)
          })
          setEditing(false)
        }}
        className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input name="name" defaultValue={template.name} className={inputClass} required />
          <select name="channel" defaultValue={template.channel} className={inputClass}>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </select>
        </div>
        <input name="subject" defaultValue={template.subject} placeholder="Objet (email)" className={inputClass} />
        <textarea name="body" defaultValue={template.body} rows={4} className={inputClass} />
        <div className="flex gap-2">
          <button type="submit" className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white">
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
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-neutral-900">
            {template.name}{' '}
            <span className="text-xs font-normal text-neutral-400">{template.channel === 'email' ? 'Email' : 'SMS'}</span>
          </p>
          {template.subject && <p className="text-sm text-neutral-500">{template.subject}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => setEditing(true)} className="text-sm text-neutral-500 hover:underline">
            Modifier
          </button>
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-sm text-red-500 hover:underline"
            >
              Supprimer
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startTransition(() => deleteTemplate(template.id))}
              className="rounded-lg bg-red-600 px-2 py-1 text-xs text-white"
            >
              Confirmer ?
            </button>
          )}
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm text-neutral-600">{template.body}</p>
    </div>
  )
}
