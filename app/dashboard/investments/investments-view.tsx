'use client'

import { useState } from 'react'
import StageKanban, { type StageCard } from '../_components/stage-kanban'
import { moveInvestmentStage } from '@/app/actions/investments'
import SegmentedControl from '../_components/segmented-control'

const STAGE_COLUMNS = [
  { value: 'mandat', label: 'Mandat', color: 'slate' },
  { value: 'compromis_signe', label: 'Compromis signé', color: 'gold' },
  { value: 'acte', label: 'Acte signé', color: 'teal' },
  { value: 'travaux', label: 'Travaux', color: 'success' },
  { value: 'cuisine', label: 'Cuisine', color: 'sage' },
  { value: 'ameublement', label: 'Ameublement', color: 'brick' },
  { value: 'location', label: 'Location', color: 'plum' },
]

export default function InvestmentsView({ table, cards }: { table: React.ReactNode; cards: StageCard[] }) {
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
        <StageKanban columns={STAGE_COLUMNS} cards={cards} onMove={(id, stage) => moveInvestmentStage(id, stage)} />
      ) : (
        table
      )}
    </div>
  )
}