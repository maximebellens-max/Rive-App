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
import { bulkDeleteLeads, bulkAssignLeads } from '@/app/actions/leads'
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

export type PipelineColumn = { id: string; name: string; color: string; is_default?: boolean }
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
  created_at: string
  columnId: string | null
  score: number
  aiScore: number | null
  aiReasoning: string
}

function formatBudget(n: number | null): string {
  if (!n) return ''
  return new Intl.NumberFormat('fr-FR').format(n) + ' €'
}

// Repère au premier coup d'œil un prospect tout juste arrivé (typiquement un
// lead Meta) sans avoir à ouvrir sa fiche — utile pour le rappeler au plus
// vite, l'essentiel du taux de transformation se jouant dans les toutes
// premières minutes.
function formatLeadAge(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `il y a ${days} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export type BoardMember = { id: string; full_name: string }

export default function KanbanBoard({
  boardType,
  columns,
  cards,
  members = [],
}: {
  boardType: BoardType
  columns: PipelineColumn[]
  cards: PipelineCard[]
  members?: BoardMember[]
}) {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [override, setOverride] = useState<Record<string, string>>({})
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()
  const router = useRouter()

  const effectiveColumnId = (card: PipelineCard) => override[card.id] ?? card.columnId

  function toggleSelectMode() {
    setSelectMode((v) => !v)
    setSelected(new Set())
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
    setSelectMode(false)
  }

  const grouped = useMemo(
    () =>
      columns.map((column) => ({
        column,
        cards: cards
          .filter((c) => effectiveColumnId(c) === column.id)
          .sort((a, b) => (b.aiScore ?? b.score) - (a.aiScore ?? a.score)),
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={toggleSelectMode}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
            selectMode ? 'border-accent bg-accent-soft text-accent' : 'border-neutral-300 text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          {selectMode ? 'Annuler la sélection' : '☑ Sélectionner'}
        </button>
        <div className="flex rounded-lg border border-neutral-300 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`rounded px-2.5 py-1 font-medium ${viewMode === 'kanban' ? 'bg-accent text-white' : 'text-neutral-600'}`}
          >
            Kanban
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`rounded px-2.5 py-1 font-medium ${viewMode === 'list' ? 'bg-accent text-white' : 'text-neutral-600'}`}
          >
            Liste
          </button>
        </div>
      </div>

      {selectMode && (
        <BulkActionBar
          selectedIds={[...selected]}
          members={members}
          onDone={clearSelection}
        />
      )}

      <div className={viewMode === 'kanban' ? 'flex gap-4 overflow-x-auto pb-2' : 'flex flex-col gap-4'}>
        {grouped.map(({ column, cards: colCards }) => (
          <ColumnBlock
            key={column.id}
            column={column}
            cards={colCards}
            boardType={boardType}
            wide={viewMode === 'list'}
            onDrop={(leadId) => handleDrop(leadId, column.id)}
            selectMode={selectMode}
            selected={selected}
            onToggleSelect={toggleSelected}
          />
        ))}
        <AddColumnForm boardType={boardType} />
      </div>
    </div>
  )
}

function BulkActionBar({
  selectedIds,
  members,
  onDone,
}: {
  selectedIds: string[]
  members: BoardMember[]
  onDone: () => void
}) {
  const [, startTransition] = useTransition()
  const [pending, setPending] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [assignTo, setAssignTo] = useState('')
  const count = selectedIds.length

  function runDelete() {
    setPending(true)
    startTransition(async () => {
      await bulkDeleteLeads(selectedIds)
      setPending(false)
      setConfirmingDelete(false)
      onDone()
    })
  }

  function runAssign() {
    if (!assignTo) return
    setPending(true)
    startTransition(async () => {
      await bulkAssignLeads(selectedIds, assignTo)
      setPending(false)
      onDone()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-accent bg-accent-soft px-3 py-2 text-xs">
      <span className="font-medium text-neutral-700">
        {count} prospect{count > 1 ? 's' : ''} sélectionné{count > 1 ? 's' : ''}
      </span>

      {members.length > 0 && (
        <div className="flex items-center gap-1.5">
          <select
            value={assignTo}
            onChange={(e) => setAssignTo(e.target.value)}
            disabled={!count || pending}
            className="rounded-lg border border-neutral-300 bg-surface px-2 py-1 text-xs outline-none focus:border-accent disabled:opacity-50"
          >
            <option value="">Assigner à…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!count || !assignTo || pending}
            onClick={runAssign}
            className="rounded-lg border border-neutral-300 bg-surface px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
          >
            Appliquer
          </button>
        </div>
      )}

      {!confirmingDelete ? (
        <button
          type="button"
          disabled={!count || pending}
          onClick={() => setConfirmingDelete(true)}
          className="rounded-lg border border-danger px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger-soft disabled:opacity-50"
        >
          Supprimer
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="text-neutral-500">Supprimer {count} prospect{count > 1 ? 's' : ''} ?</span>
          <button
            type="button"
            disabled={pending}
            onClick={runDelete}
            className="rounded bg-danger px-2 py-1 font-medium text-white disabled:opacity-50"
          >
            Confirmer
          </button>
          <button type="button" onClick={() => setConfirmingDelete(false)} className="text-neutral-500 hover:underline">
            Annuler
          </button>
        </div>
      )}
    </div>
  )
}

function ColumnBlock({
  column,
  cards,
  boardType,
  wide,
  onDrop,
  selectMode,
  selected,
  onToggleSelect,
}: {
  column: PipelineColumn
  cards: PipelineCard[]
  boardType: BoardType
  wide: boolean
  onDrop: (leadId: string) => void
  selectMode?: boolean
  selected?: Set<string>
  onToggleSelect?: (id: string) => void
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
      } ${dragOver ? 'border-accent ring-1 ring-accent' : 'border-neutral-200'}`}
    >
      <ColumnHeader column={column} boardType={boardType} count={cards.length} />

      <div className="flex flex-col gap-2">
        {cards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            selectMode={selectMode}
            selected={selected?.has(card.id)}
            onToggleSelect={() => onToggleSelect?.(card.id)}
          />
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
          <div className="absolute left-0 top-4 z-10 flex gap-1 rounded-lg border border-neutral-200 bg-surface p-1.5 shadow-md">
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

      {column.is_default ? (
        <span className="shrink-0 text-xs text-neutral-300" title="Étape par défaut — non supprimable">
          🔒
        </span>
      ) : !confirmingDelete ? (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="shrink-0 text-xs text-neutral-300 hover:text-danger"
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
          className="shrink-0 rounded bg-danger px-1.5 py-0.5 text-xs text-white"
        >
          Confirmer ?
        </button>
      )}
      {deleteError && <span className="absolute right-0 top-6 text-xs text-danger">{deleteError}</span>}
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
      className="flex h-fit shrink-0 flex-col gap-2 rounded-2xl border border-neutral-200 bg-surface p-3"
    >
      <input
        name="name"
        autoFocus
        placeholder="Nom de l'étape"
        className="w-56 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-accent"
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      <button type="submit" className="w-fit rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white">
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
        className="w-full rounded-lg border border-transparent bg-surface px-2.5 py-1.5 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-300"
      />
    </form>
  )
}

// Tronque la raison IA pour qu'elle tienne sur une ligne de carte — le texte
// complet reste lisible au survol via l'attribut title.
function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function CardItem({
  card,
  selectMode,
  selected,
  onToggleSelect,
}: {
  card: PipelineCard
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}) {
  const effectiveScore = card.aiScore ?? card.score
  const tier = priorityTier(effectiveScore)

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-neutral-900">{card.name}</span>
        <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_TIER_CLASS[tier]}`}>
          {PRIORITY_TIER_LABEL[tier]}
        </span>
      </div>
      {card.category && <span className="text-xs text-neutral-500">{CATEGORY_LABEL[card.category]}</span>}
      {card.critere_lieu && <span className="text-xs text-neutral-500">📍 {card.critere_lieu}</span>}
      {card.budget ? <span className="text-xs text-neutral-500">💰 {formatBudget(card.budget)}</span> : null}
      {card.created_at && <span className="text-xs text-neutral-400">🕓 {formatLeadAge(card.created_at)}</span>}
      {card.aiReasoning && (
        <span className="text-xs text-neutral-500" title={card.aiReasoning}>
          🤖 {truncate(card.aiReasoning, 70)}
        </span>
      )}
    </>
  )

  // En mode sélection, la case à cocher doit rester cliquable sans déclencher
  // la navigation — on sort le lien de la carte au lieu de l'englober dedans,
  // et on désactive le glisser-déposer (les deux interactions se gênent).
  if (selectMode) {
    return (
      <div
        className={`flex items-start gap-2 rounded-xl border p-3 text-sm shadow-sm ${
          selected ? 'border-accent bg-accent-soft' : 'border-neutral-200 bg-surface'
        }`}
      >
        <input
          type="checkbox"
          checked={!!selected}
          onChange={onToggleSelect}
          className="mt-1 h-4 w-4 shrink-0"
          aria-label={`Sélectionner ${card.name}`}
        />
        <Link href={`/dashboard/prospects/${card.id}`} className="flex min-w-0 flex-1 flex-col gap-1.5">
          {content}
        </Link>
      </div>
    )
  }

  return (
    <Link
      href={`/dashboard/prospects/${card.id}`}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', card.id)}
      className="flex cursor-grab flex-col gap-1.5 rounded-xl border border-neutral-200 bg-surface p-3 text-sm shadow-sm active:cursor-grabbing"
    >
      {content}
    </Link>
  )
}