'use client'

import { useState } from 'react'
import CampaignMappingRow from './campaign-mapping-row'

type Campaign = {
  id: string
  campaign_name: string
  status: string
  owner_id: string | null
  target_category: string | null
}

type Member = { id: string; full_name: string }

// Repliée par défaut dès qu'il y a des campagnes à afficher : la liste peut
// vite s'allonger, et l'essentiel (le compteur + l'alerte "non configurées")
// reste visible même repliée.
export default function CampaignList({ campaigns, members }: { campaigns: Campaign[]; members: Member[] }) {
  const [open, setOpen] = useState(campaigns.length === 0)
  const unconfigured = campaigns.filter((c) => !c.owner_id || !c.target_category).length

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900"
          aria-expanded={open}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Campagnes ({campaigns.length})
        </button>
        {unconfigured > 0 && (
          <p className="text-xs text-warn">
            {unconfigured} campagne{unconfigured > 1 ? 's' : ''} sans propriétaire ou tableau assigné
          </p>
        )}
      </div>
      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {campaigns.length === 0 ? (
            <p className="text-sm text-neutral-400">
              Aucune campagne récupérée pour l&apos;instant — clique sur &quot;Actualiser les campagnes&quot;.
            </p>
          ) : (
            campaigns.map((c) => <CampaignMappingRow key={c.id} campaign={c} members={members} />)
          )}
        </div>
      )}
    </div>
  )
}