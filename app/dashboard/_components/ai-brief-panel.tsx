'use client'

// Panneau "assistant IA" partagé par les 3 usages du prototype (brief
// d'estimation, briefing pré-RDV, message de relance) : génère le texte
// directement via l'API Claude, depuis Rive — plus de copier/coller vers un
// chat externe. Le résultat reste éditable et s'enregistre avec la fiche.
import { useState, useTransition } from 'react'
import { generateAIText } from '@/app/actions/ai'

export default function AIBriefPanel({
  title,
  prompt,
  initialValue,
  onSave,
  generateLabel = 'Générer avec l’IA',
}: {
  title: string
  prompt: string
  initialValue: string
  onSave: (text: string) => void | Promise<void>
  generateLabel?: string
}) {
  const [value, setValue] = useState(initialValue)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function generate() {
    setError(null)
    startTransition(async () => {
      const res = await generateAIText(prompt)
      if (res.error) {
        setError(res.error)
        return
      }
      if (res.text) setValue(res.text)
    })
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
        onClick={generate}
        disabled={pending}
        className="w-fit rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
      >
        {pending ? 'Génération…' : `✨ ${generateLabel}`}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Le texte généré apparaîtra ici — modifiable avant enregistrement."
        rows={5}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
      />
      <button
        type="button"
        onClick={save}
        disabled={pending || !value}
        className="w-fit rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60"
      >
        {saved ? 'Enregistré ✓' : 'Enregistrer'}
      </button>
    </div>
  )
}
