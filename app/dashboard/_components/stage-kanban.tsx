'use client'

// Kanban à colonnes fixes (non personnalisables), pour les tableaux dont
// l'étape est un champ métier structurant (mandats: en_cours/compromis_signe/
// vendu ; commissions: attente/payé) plutôt qu'une liste de colonnes libres.
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { COLUMN_COLOR_HEX } from '@/lib/rive/pipelines'
import Avatar from './avatar'

export type StageColumn = { value: string; label: string; color: string }
export type StageCard = {
  id: string
  title: string
  subtitle?: string
  meta?: string
  href: string
  assignedName?: string
  assignedAvatarUrl?: string
  /** false pour une carte qui n'appartient pas à la table `mandates` (ex. un
   * projet investisseur) : `onMove` appelle `moveMandateStage(id, ...)`, qui
   * ne trouverait pas cet id et échouerait silencieusement — on désactive
   * simplement le glisser-déposer plutôt que de le laisser échouer sans le
   * dire. Par défaut true (comportement inchangé pour les cartes existantes). */
  draggable?: boolean
}

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
            {/* Titre de colonne figé (sticky) en haut du viewport pendant le
                défilement vertical — une colonne bien remplie peut vite
                dépasser la hauteur d'écran, sans ça on perd de vue son nom en
                scrollant. */}
            <div className="sticky top-0 z-10 flex items-center gap-2 bg-neutral-50 px-1 py-1">
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
                  draggable={card.draggable !== false}
                  onDragStart={
                    card.draggable !== false ? (e) => e.dataTransfer.setData('text/plain', card.id) : undefined
                  }
                  className={`flex flex-col gap-1 rounded-xl border border-neutral-200 bg-surface p-3 text-sm shadow-sm ${
                    card.draggable === false ? '' : 'cursor-grab active:cursor-grabbing'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 truncate font-medium text-neutral-900">{card.title}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      {card.assignedName && (
                        <Avatar name={card.assignedName} avatarUrl={card.assignedAvatarUrl} size={18} />
                      )}
                      {/* Le glisser-déposer HTML5 natif (draggable/onDragStart ci-dessus) ne se
                          déclenche pas au doigt sur mobile/tactile — sans ce menu, il n'existait
                          aucun moyen de faire avancer un mandat ou une commission d'étape depuis
                          un téléphone. Masqué pour les cartes non-draggable (ex. projet
                          investisseur) : `onMove` appellerait une mutation qui ne trouverait pas
                          leur id et échouerait en silence (voir StageCard.draggable ci-dessus). */}
                      {card.draggable !== false && (
                        <StageMoveMenu
                          columns={columns}
                          currentValue={override[card.id] ?? card.meta}
                          onMove={(stage) => {
                            setOverride((prev) => ({ ...prev, [card.id]: stage }))
                            startTransition(() => {
                              onMove(card.id, stage)
                            })
                          }}
                        />
                      )}
                    </div>
                  </div>
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
        dragOver ? 'border-accent ring-1 ring-accent' : 'border-neutral-200'
      }`}
    >
      {children}
    </div>
  )
}

// Menu "⇄ Déplacer vers" — équivalent tactile du glisser-déposer, sur le
// même principe que MoveMenu dans pipelines/kanban-board.tsx (colonnes
// libres, `id`/`name`) mais adapté aux colonnes fixes de StageKanban
// (`value`/`label`). La carte entière est un <Link> : preventDefault +
// stopPropagation empêchent un clic sur ce bouton de déclencher la
// navigation vers la fiche.
function StageMoveMenu({
  columns,
  currentValue,
  onMove,
}: {
  columns: StageColumn[]
  currentValue: string | undefined
  onMove: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const targets = columns.filter((c) => c.value !== currentValue)

  if (!targets.length) return null

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false)
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label="Déplacer vers une autre étape"
        aria-expanded={open}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm leading-none text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
      >
        ⇄
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-20 w-44 rounded-lg border border-neutral-200 bg-surface p-1 shadow-md">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
            Déplacer vers
          </p>
          {targets.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setOpen(false)
                onMove(c.value)
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: COLUMN_COLOR_HEX[c.color] ?? '#64748b' }}
              />
              <span className="truncate">{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}