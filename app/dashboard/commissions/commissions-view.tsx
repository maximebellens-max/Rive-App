'use client'

import { useState } from 'react'
import StageKanban, { type StageCard } from '../_components/stage-kanban'
import { moveCommissionStage } from '@/app/actions/commissions'

const STAGE_COLUMNS = [
  { value: 'attente', label: 'En attente de paiement', color: 'gold' },
  { value: 'paye', label: 'Payé', color: 'success' },
]

export default function CommissionsView({ table, cards }: { table: React.ReactNode; cards: StageCard[] }) {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
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

      {viewMode === 'kanban' ? (
        <StageKanban columns={STAGE_COLUMNS} cards={cards} onMove={(id, stage) => moveCommissionStage(id, stage)} />
      ) : (
        table
      )}
    </div>
  )
}
