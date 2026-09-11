'use client'

import { useState } from 'react'
import StageKanban, { type StageCard } from '../_components/stage-kanban'
import { moveLocationStage } from '@/app/actions/locations'
import SegmentedControl from '../_components/segmented-control'

const STAGE_COLUMNS = [
  { value: 'annonce', label: 'Annonce', color: 'slate' },
  { value: 'visites', label: 'Visites', color: 'gold' },
  { value: 'en_place', label: 'En place', color: 'teal' },
  { value: 'finalise', label: 'Finalisé', color: 'success' },
]

export default function LocationsView({ table, cards }: { table: React.ReactNode; cards: StageCard[] }) {
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
        <StageKanban columns={STAGE_COLUMNS} cards={cards} onMove={(id, stage) => moveLocationStage(id, stage)} />
      ) : (
        table
      )}
    </div>
  )
}