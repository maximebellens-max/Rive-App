'use client'

import { useRef, useState, useTransition } from 'react'
import { importBackup } from '@/app/actions/backup'

export default function BackupSection({ isOwner }: { isOwner: boolean }) {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const confirmed = window.confirm(
      'Importer cette sauvegarde va remplacer toutes les données actuelles de Rive (prospects, mandats, commissions…). Continuer ?'
    )
    if (!confirmed) {
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      startTransition(async () => {
        const res = await importBackup(text)
        if (res.error) {
          setMessage({ type: 'error', text: res.error })
        } else {
          setMessage({ type: 'success', text: 'Sauvegarde importée.' })
        }
        if (fileInputRef.current) fileInputRef.current.value = ''
      })
    }
    reader.onerror = () => setMessage({ type: 'error', text: 'Erreur de lecture du fichier.' })
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-neutral-900">Sauvegarde</h2>
      <p className="text-sm text-neutral-500">
        Exporte l&apos;ensemble des données de l&apos;agence (prospects, mandats, commissions,
        contacts, modèles…) dans un fichier JSON, ou restaure une sauvegarde précédente.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href="/dashboard/settings/backup/export"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Exporter mes données
        </a>
        {isOwner && (
          <label className="cursor-pointer rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100">
            {pending ? 'Import en cours…' : 'Importer une sauvegarde'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              disabled={pending}
              className="hidden"
            />
          </label>
        )}
      </div>
      {message && (
        <p className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>{message.text}</p>
      )}
    </div>
  )
}
