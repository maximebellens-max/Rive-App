'use client'

// Kanban à colonnes fixes (non personnalisables), pour les tableaux dont
// l'étape est un champ métier structurant (mandats: en_cours/compromis_signe/
// vendu ; commissions: attente/payé) plutôt qu'une liste de colonnes libres.
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { COLUMN_COLOR_HEX } from '@/lib/rive/pipelines'

export type StageColumn = { value: string; label: string; color: string }
export type StageCard = { id: string; title: string; subtitle?: string; meta?: string; href: string }

export default function StageKanban({
  columns,
  cards,
  onMove,
}: {
  columns: StageColumn[]
  cards: StageCard[]
  onMove: (cardId: string, stage: string) => void | Promise<void>
}) {
  const [, startTransition] = useTransition()
  const [override, setOverride] = useState<Record<string, string>>({})

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {columns.map((col) => {
        const colCards = cards.filter((c) => (override[c.id] ?? c.meta) === col.value)
        return (
          <div key={col.value} className="flex w-72 shrink-0 flex-col gap-2">
            <div className="flex items-center gap-2 px-1">
              <span
                className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: COLUMN_COLOR_HEX[col.color] ?? '#64748b' }}
              />
              <span className="text-sm font-semibold text-neutral-900">{col.label}</span>
              <span className="text-xs text-neutral-400">{colCards.length}</span>
            </div>
            <DropZone
              onDropCard={(cardId) => {
                setOverride((prev) => ({ ...prev, [cardId]: col.value }))
                startTransition(() => {
                  onMove(cardId, col.value)
                })
              }}
            >
              {colCards.map((card) => (
                <Link
                  key={card.id}
                  href={card.href}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', card.id)}
                  className="flex cursor-grab flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-3 text-sm shadow-sm active:cursor-grabbing"
                >
                  <span className="font-medium text-neutral-900">{card.title}</span>
                  {card.subtitle && <span className="text-xs text-neutral-500">{card.subtitle}</span>}
                </Link>
              ))}
              {!colCards.length && <p className="px-1 py-2 text-xs text-neutral-400">Rien ici.</p>}
            </DropZone>
          </div>
        )
      })}
    </div>
  )
}

function DropZone({
  children,
  onDropCard,
}: {
  children: React.ReactNode
  onDropCard: (cardId: string) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const id = e.dataTransfer.getData('text/plain')
        if (id) onDropCard(id)
      }}
      className={`flex min-h-[3rem] flex-col gap-2 rounded-2xl border bg-neutral-50 p-2 ${
        dragOver ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200'
      }`}
    >
      {children}
    </div>
  )
}
