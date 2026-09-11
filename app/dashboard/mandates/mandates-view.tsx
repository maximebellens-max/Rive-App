'use client'

import { useState } from 'react'
import StageKanban, { type StageCard } from '../_components/stage-kanban'
import { moveMandateStage } from '@/app/actions/mandates'
import SegmentedControl from '../_components/segmented-control'

const STAGE_COLUMNS = [
  { value: 'en_cours', label: 'En cours', color: 'slate' },
  { value: 'compromis_signe', label: 'Compromis signé', color: 'gold' },
  { value: 'vendu', label: 'Vendu', color: 'success' },
]

export default function MandatesView({ table, cards }: { table: React.ReactNode; cards: StageCard[] }) {
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
        <StageKanban
          columns={STAGE_COLUMNS}
          cards={cards}
          onMove={(id, stage) => moveMandateStage(id, stage)}
        />
      ) : (
        table
      )}
    </div>
  )
}