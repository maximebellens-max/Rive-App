'use client'

import { useState, useTransition } from 'react'
import { renameBoard, deleteBoard } from '@/app/actions/boards'
import Button from '../_components/button'

export default function BoardHeader({ boardId, name, count }: { boardId: string; name: string; count: number }) {
  const [, startTransition] = useTransition()
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
        <Button
          variant="danger"
          size="sm"
          confirmLabel="Confirmer la suppression ?"
          className="shrink-0"
          onClick={() => {
            startTransition(async () => {
              const res = await deleteBoard(boardId)
              if (res?.error) {
                setError(res.error)
                setTimeout(() => setError(null), 3000)
              }
            })
          }}
        >
          Supprimer le tableau
        </Button>
      </div>
      <p className="text-sm text-neutral-500">
        {count} prospect{count > 1 ? 's' : ''}
        {error && <span className="ml-2 text-danger">{error}</span>}
      </p>
    </div>
  )
}