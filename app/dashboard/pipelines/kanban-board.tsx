'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  moveLeadCard,
  quickAddLead,
  renamePipelineColumn,
  recolorPipelineColumn,
  addPipelineColumn,
  deletePipelineColumn,
} from '@/app/actions/pipelines'
import {
  COLUMN_COLORS,
  COLUMN_COLOR_HEX,
  CATEGORY_LABEL,
  priorityTier,
  PRIORITY_TIER_LABEL,
  PRIORITY_TIER_CLASS,
  columnSuggestsAppointment,
  type BoardType,
} from '@/lib/rive/pipelines'

export type PipelineColumn = { id: string; name: string; color: string }
export type PipelineCard = {
  id: string
  name: string
  category: string | null
  phone: string
  email: string
  critere_lieu: string
  critere_type: string
  budget: number | null
  financement: string
  action_date: string | null
  columnId: string | null
  score: number
}

function formatBudget(n: number | null): string {
  if (!n) return ''
  return new Intl.NumberFormat('fr-FR').format(n) + ' €'
}

export default function KanbanBoard({
  boardType,
  columns,
  cards,
}: {
  boardType: BoardType
  columns: PipelineColumn[]
  cards: PipelineCard[]
}) {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [override, setOverride] = useState<Record<string, string>>({})
  const [, startTransition] = useTransition()
  const router = useRouter()

  const effectiveColumnId = (card: PipelineCard) => override[card.id] ?? card.columnId

  const grouped = useMemo(
    () =>
      columns.map((column) => ({
        column,
        cards: cards
          .filter((c) => effectiveColumnId(c) === column.id)
          .sort((a, b) => b.score - a.score),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, cards, override]
  )

  function handleDrop(leadId: string, columnId: string) {
    const card = cards.find((c) => c.id === leadId)
    if (!card || effectiveColumnId(card) === columnId) return
    setOverride((prev) => ({ ...prev, [leadId]: columnId }))
    startTransition(() => {
      moveLeadCard(leadId, boardType, columnId)
    })
    const col = columns.find((c) => c.id === columnId)
    if (col && columnSuggestsAppointment(col.name) && !card.action_date) {
      router.push(`/dashboard/prospects/${leadId}`)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <div className="flex rounded-lg border border-neutral-300 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`rounded px-2.5 py-1 font-medium ${viewMode === 'kanban' ? 'bg-neutral-900 text-white' : 'text-neutral-600'}`}
          >
            Kanban
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`rounded px-2.5 py-1 font-medium ${viewMode === 'list' ? 'bg-neutral-900 text-white' : 'text-neutral-600'}`}
          >
            Liste
          </button>
        </div>
      </div>

      <div className={viewMode === 'kanban' ? 'flex gap-4 overflow-x-auto pb-2' : 'flex flex-col gap-4'}>
        {grouped.map(({ column, cards: colCards }) => (
          <ColumnBlock
            key={column.id}
            column={column}
            cards={colCards}
            boardType={boardType}
            wide={viewMode === 'list'}
            onDrop={(leadId) => handleDrop(leadId, column.id)}
          />
        ))}
        <AddColumnForm boardType={boardType} />
      </div>
    </div>
  )
}

function ColumnBlock({
  column,
  cards,
  boardType,
  wide,
  onDrop,
}: {
  column: PipelineColumn
  cards: PipelineCard[]
  boardType: BoardType
  wide: boolean
  onDrop: (leadId: string) => void
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
        const leadId = e.dataTransfer.getData('text/plain')
        if (leadId) onDrop(leadId)
      }}
      className={`flex shrink-0 flex-col gap-2 rounded-2xl border bg-neutral-50 p-3 ${
        wide ? 'w-full' : 'w-72'
      } ${dragOver ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200'}`}
    >
      <ColumnHeader column={column} boardType={boardType} count={cards.length} />

      <div className="flex flex-col gap-2">
        {cards.map((card) => (
          <CardItem key={card.id} card={card} />
        ))}
        {!cards.length && <p className="px-1 py-2 text-xs text-neutral-400">Aucun prospect ici.</p>}
      </div>

      <QuickAddForm boardType={boardType} columnId={column.id} />
    </div>
  )
}

function ColumnHeader({ column, boardType, count }: { column: PipelineColumn; boardType: BoardType; count: number }) {
  const [, startTransition] = useTransition()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: COLUMN_COLOR_HEX[column.color] ?? '#64748b' }}
          aria-label="Changer la couleur"
        />
        {pickerOpen && (
          <div className="absolute left-0 top-4 z-10 flex gap-1 rounded-lg border border-neutral-200 bg-white p-1.5 shadow-md">
            {COLUMN_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setPickerOpen(false)
                  startTransition(() => recolorPipelineColumn(column.id, boardType, c))
                }}
                className="h-4 w-4 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: COLUMN_COLOR_HEX[c] }}
                aria-label={c}
              />
            ))}
          </div>
        )}
      </div>

      <input
        defaultValue={column.name}
        onBlur={(e) => {
          const name = e.target.value.trim()
          if (name && name !== column.name) startTransition(() => renamePipelineColumn(column.id, boardType, name))
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        className="min-w-0 flex-1 truncate bg-transparent text-sm font-semibold text-neutral-900 outline-none focus:underline"
      />
      <span className="shrink-0 text-xs text-neutral-400">{count}</span>

      {!confirmingDelete ? (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="shrink-0 text-xs text-neutral-300 hover:text-red-500"
          aria-label="Supprimer la colonne"
        >
          ✕
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            startTransition(async () => {
              const res = await deletePipelineColumn(column.id, boardType)
              if (res?.error) {
                setDeleteError(res.error)
                setTimeout(() => setDeleteError(null), 3000)
              }
              setConfirmingDelete(false)
            })
          }}
          className="shrink-0 rounded bg-red-600 px-1.5 py-0.5 text-xs text-white"
        >
          Confirmer ?
        </button>
      )}
      {deleteError && <span className="absolute right-0 top-6 text-xs text-red-600">{deleteError}</span>}
    </div>
  )
}

function AddColumnForm({ boardType }: { boardType: BoardType }) {
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-fit shrink-0 rounded-2xl border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 hover:border-neutral-400 hover:text-neutral-700"
      >
        + Ajouter une étape
      </button>
    )
  }

  return (
    <form
      ref={formRef}
      action={(formData: FormData) => {
        const name = String(formData.get('name') || '').trim()
        if (name) startTransition(() => addPipelineColumn(boardType, name))
        setOpen(false)
      }}
      className="flex h-fit shrink-0 flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-3"
    >
      <input
        name="name"
        autoFocus
        placeholder="Nom de l'étape"
        className="w-56 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900"
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      <button type="submit" className="w-fit rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white">
        Ajouter
      </button>
    </form>
  )
}

function QuickAddForm({ boardType, columnId }: { boardType: BoardType; columnId: string }) {
  const [, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={formRef}
      action={(formData: FormData) => {
        startTransition(async () => {
          await quickAddLead(boardType, columnId, formData)
          formRef.current?.reset()
        })
      }}
    >
      <input
        name="name"
        placeholder="+ Ajouter un prospect…"
        className="w-full rounded-lg border border-transparent bg-white px-2.5 py-1.5 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-300"
      />
    </form>
  )
}

function CardItem({ card }: { card: PipelineCard }) {
  const tier = priorityTier(card.score)
  return (
    <Link
      href={`/dashboard/prospects/${card.id}`}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', card.id)}
      className="flex cursor-grab flex-col gap-1.5 rounded-xl border border-neutral-200 bg-white p-3 text-sm shadow-sm active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-neutral-900">{card.name}</span>
        <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_TIER_CLASS[tier]}`}>
          {PRIORITY_TIER_LABEL[tier]}
        </span>
      </div>
      {card.category && <span className="text-xs text-neutral-500">{CATEGORY_LABEL[card.category]}</span>}
      {card.critere_lieu && <span className="text-xs text-neutral-500">📍 {card.critere_lieu}</span>}
      {card.budget ? <span className="text-xs text-neutral-500">💰 {formatBudget(card.budget)}</span> : null}
    </Link>
  )
}
