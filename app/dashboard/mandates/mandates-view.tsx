'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import StageKanban, { type StageCard } from '../_components/stage-kanban'
import { moveMandateStage } from '@/app/actions/mandates'
import SegmentedControl from '../_components/segmented-control'
import Avatar from '../_components/avatar'
import EmptyState from '../_components/empty-state'
import SortHeader from '../_components/sort-header'
import { toCSV, downloadCSV } from '@/lib/rive/csv'

const STAGE_COLUMNS = [
  { value: 'en_cours', label: 'En cours', color: 'slate' },
  { value: 'compromis_signe', label: 'Compromis signé', color: 'gold' },
  { value: 'vendu', label: 'Vendu', color: 'success' },
  // Projets investisseur "en mandat" (table invest_projects, pas mandates) —
  // colonne à part car ils n'ont pas ce même cheminement en_cours/compromis/
  // vendu (voir app/dashboard/mandates/page.tsx). Cartes non déplaçables.
  { value: 'investisseur', label: 'Investisseurs', color: 'plum' },
]

const URGENCY_CLASS: Record<string, string> = {
  overdue: 'bg-danger-soft text-danger',
  soon: 'bg-warn-soft text-warn',
  ok: 'bg-neutral-100 text-neutral-600',
  none: 'bg-neutral-100 text-neutral-400',
}

// Une ligne par mandat ET par projet investisseur "en mandat" — mêmes 7
// colonnes pour les deux (certaines valeurs restent nulles côté investisseur,
// comme dans l'ancien tableau statique). Toute la mise en forme (libellés,
// devise) est déjà faite côté serveur (mandates/page.tsx) : ce composant ne
// fait que trier/filtrer/exporter des chaînes et des nombres déjà prêts.
export type MandateRow = {
  id: string
  href: string
  title: string
  searchText: string
  agentName: string | null
  agentAvatarUrl: string | null
  typeLabel: string
  price: number | null
  priceLabel: string
  exclusivityLabel: string | null
  stageLabel: string
  noticeDate: string | null
  noticeLabel: string | null
  urgency: string
}

type SortKey = 'title' | 'agentName' | 'typeLabel' | 'price' | 'exclusivityLabel' | 'stageLabel' | 'noticeDate'

export default function MandatesView({ rows, cards }: { rows: MandateRow[]; cards: StageCard[] }) {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('title')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = q ? rows.filter((r) => r.searchText.includes(q)) : rows
    const sorted = [...base].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [rows, search, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const exportCSV = () => {
    const csv = toCSV(
      ['Bien / Client', 'Agent', 'Type', 'Prix', 'Exclusivité', 'Étape', 'Renouvellement'],
      filtered.map((r) => [r.title, r.agentName, r.typeLabel, r.price, r.exclusivityLabel, r.stageLabel, r.noticeLabel])
    )
    downloadCSV(`mandats-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {viewMode === 'list' ? (
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔎 Rechercher un bien, un client, un agent…"
              aria-label="Rechercher dans les mandats"
              className="w-full max-w-xs rounded-lg border border-neutral-300 bg-surface px-2 py-1.5 text-base text-neutral-600 outline-none placeholder:text-neutral-400 focus:border-accent sm:text-xs"
            />
            <button
              type="button"
              onClick={exportCSV}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
            >
              ⬇ Export CSV
            </button>
          </div>
        ) : (
          <div />
        )}
        <SegmentedControl
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: 'kanban', label: 'Kanban' },
            { value: 'list', label: 'Liste' },
          ]}
        />
      </div>

      {viewMode === 'kanban' ? (
        <StageKanban columns={STAGE_COLUMNS} cards={cards} onMove={(id, stage) => moveMandateStage(id, stage)} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-neutral-500">
              <tr>
                <th className="sticky left-0 z-20 whitespace-nowrap border-r border-neutral-200 bg-surface px-4 py-3">
                  <SortHeader label="Bien / Client" active={sortKey === 'title'} direction={sortDir} onClick={() => toggleSort('title')} />
                </th>
                <th className="px-4 py-3">
                  <SortHeader label="Agent" active={sortKey === 'agentName'} direction={sortDir} onClick={() => toggleSort('agentName')} />
                </th>
                <th className="px-4 py-3">
                  <SortHeader label="Type" active={sortKey === 'typeLabel'} direction={sortDir} onClick={() => toggleSort('typeLabel')} />
                </th>
                <th className="px-4 py-3">
                  <SortHeader label="Prix" active={sortKey === 'price'} direction={sortDir} onClick={() => toggleSort('price')} />
                </th>
                <th className="px-4 py-3">
                  <SortHeader
                    label="Exclusivité"
                    active={sortKey === 'exclusivityLabel'}
                    direction={sortDir}
                    onClick={() => toggleSort('exclusivityLabel')}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortHeader label="Étape" active={sortKey === 'stageLabel'} direction={sortDir} onClick={() => toggleSort('stageLabel')} />
                </th>
                <th className="px-4 py-3">
                  <SortHeader
                    label="Renouvellement"
                    active={sortKey === 'noticeDate'}
                    direction={sortDir}
                    onClick={() => toggleSort('noticeDate')}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {!filtered.length && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon="📄"
                      title={search ? 'Aucun résultat' : "Aucun mandat pour l'instant"}
                      subtitle={
                        search
                          ? 'Essaie un autre nom, une autre adresse ou un autre agent.'
                          : 'Les mandats de vente et de recherche signés apparaîtront ici.'
                      }
                    />
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="group border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="sticky left-0 z-10 whitespace-nowrap border-r border-neutral-200 bg-surface px-4 py-3 group-hover:bg-neutral-50">
                    <Link href={r.href} className="font-medium text-neutral-900 hover:underline">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {r.agentName ? (
                      <Avatar name={r.agentName} avatarUrl={r.agentAvatarUrl} size={22} />
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{r.typeLabel}</td>
                  <td className="px-4 py-3 tabular-nums text-neutral-600">
                    {r.price !== null ? r.priceLabel : <span className="text-neutral-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{r.exclusivityLabel || <span className="text-neutral-300">—</span>}</td>
                  <td className="px-4 py-3 text-neutral-600">{r.stageLabel}</td>
                  <td className="px-4 py-3">
                    {r.noticeLabel ? (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${URGENCY_CLASS[r.urgency]}`}>
                        {r.noticeLabel}
                      </span>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}