'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import StageKanban, { type StageCard } from '../_components/stage-kanban'
import { moveCommissionStage } from '@/app/actions/commissions'
import SegmentedControl from '../_components/segmented-control'
import SortHeader from '../_components/sort-header'
import { toCSV, downloadCSV } from '@/lib/rive/csv'

const STAGE_COLUMNS = [
  { value: 'attente', label: 'En attente de paiement', color: 'gold' },
  { value: 'paye', label: 'Payé', color: 'success' },
]

// Mise en forme déjà faite côté serveur (commissions/page.tsx) — ce
// composant ne fait que trier/filtrer/exporter.
export type CommissionRow = {
  id: string
  href: string
  title: string
  searchText: string
  amount: number | null
  amountLabel: string
  statusLabel: string
  paidDate: string | null
  paidDateLabel: string | null
}

type SortKey = 'title' | 'amount' | 'statusLabel' | 'paidDate'

export default function CommissionsView({ rows, cards }: { rows: CommissionRow[]; cards: StageCard[] }) {
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
      ['Mandat', 'Montant', 'Statut', 'Date de paiement'],
      filtered.map((r) => [r.title, r.amount, r.statusLabel, r.paidDateLabel])
    )
    downloadCSV(`commissions-${new Date().toISOString().slice(0, 10)}.csv`, csv)
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
              placeholder="🔎 Rechercher un mandat…"
              aria-label="Rechercher dans les commissions"
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
        <StageKanban columns={STAGE_COLUMNS} cards={cards} onMove={(id, stage) => moveCommissionStage(id, stage)} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-neutral-500">
              <tr>
                <th className="sticky left-0 z-20 whitespace-nowrap border-r border-neutral-200 bg-surface px-4 py-3">
                  <SortHeader label="Mandat" active={sortKey === 'title'} direction={sortDir} onClick={() => toggleSort('title')} />
                </th>
                <th className="px-4 py-3">
                  <SortHeader label="Montant" active={sortKey === 'amount'} direction={sortDir} onClick={() => toggleSort('amount')} />
                </th>
                <th className="px-4 py-3">
                  <SortHeader
                    label="Statut"
                    active={sortKey === 'statusLabel'}
                    direction={sortDir}
                    onClick={() => toggleSort('statusLabel')}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortHeader
                    label="Date de paiement"
                    active={sortKey === 'paidDate'}
                    direction={sortDir}
                    onClick={() => toggleSort('paidDate')}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {!filtered.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                    {search ? 'Aucun résultat.' : "Aucune commission pour l'instant."}
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
                  <td className="px-4 py-3 tabular-nums text-neutral-600">{r.amount !== null ? r.amountLabel : '—'}</td>
                  <td className="px-4 py-3 text-neutral-600">{r.statusLabel}</td>
                  <td className="px-4 py-3 text-neutral-600">{r.paidDateLabel || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}