'use client'

import { useState } from 'react'
import StageKanban, { type StageCard } from '../_components/stage-kanban'
import { moveCommissionStage } from '@/app/actions/commissions'
import SegmentedControl from '../_components/segmented-control'

const STAGE_COLUMNS = [
  { value: 'attente', label: 'En attente de paiement', color: 'gold' },
  { value: 'paye', label: 'Payé', color: 'success' },
]

export default function CommissionsView({ table, cards }: { table: React.ReactNode; cards: StageCard[] }) {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
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
        table
      )}
    </div>
  )
}