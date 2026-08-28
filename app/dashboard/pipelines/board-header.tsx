'use client'

import { useState, useTransition } from 'react'
import { renameBoard, deleteBoard } from '@/app/actions/boards'

export default function BoardHeader({ boardId, name, count }: { boardId: string; name: string; count: number }) {
  const [, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          defaultValue={name}
          onBlur={(e) => {
            const value = e.target.value.trim()
            if (value && value !== name) startTransition(() => renameBoard(boardId, value))
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          aria-label="Nom du tableau"
          className="min-w-0 flex-1 truncate bg-transparent text-xl font-semibold tracking-tight text-neutral-900 outline-none focus:underline"
        />
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="shrink-0 text-xs text-neutral-400 hover:text-red-500"
          >
            Supprimer le tableau
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              startTransition(async () => {
                const res = await deleteBoard(boardId)
                if (res?.error) {
                  setError(res.error)
                  setConfirming(false)
                  setTimeout(() => setError(null), 3000)
                }
              })
            }}
            className="shrink-0 rounded bg-red-600 px-2 py-1 text-xs text-white"
          >
            Confirmer la suppression ?
          </button>
        )}
      </div>
      <p className="text-sm text-neutral-500">
        {count} prospect{count > 1 ? 's' : ''}
        {error && <span className="ml-2 text-red-600">{error}</span>}
      </p>
    </div>
  )
}
