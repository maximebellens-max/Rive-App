'use client'

// Panneau "assistant IA" partagé par les 3 usages du prototype (brief
// d'estimation, briefing pré-RDV, message de relance) : génère un prompt
// structuré à copier, et garde la réponse collée par l'agent avec la fiche.
import { useState, useTransition } from 'react'

export default function AIBriefPanel({
  title,
  prompt,
  initialValue,
  onSave,
  placeholder = 'Colle ici la réponse de l’IA…',
}: {
  title: string
  prompt: string
  initialValue: string
  onSave: (text: string) => void | Promise<void>
  placeholder?: string
}) {
  const [copied, setCopied] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [saved, setSaved] = useState(false)
  const [, startTransition] = useTransition()

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  function save() {
    startTransition(() => {
      onSave(value)
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
      <button
        type="button"
        onClick={copy}
        className="w-fit rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
      >
        {copied ? 'Copié ✓' : '🤖 Copier le brief pour l’IA'}
      </button>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={5}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
      />
      <button
        type="button"
        onClick={save}
        className="w-fit rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
      >
        {saved ? 'Enregistré ✓' : 'Enregistrer'}
      </button>
    </div>
  )
}
