'use client'

import { useState, useTransition } from 'react'
import { updateMetaCampaignMapping } from '@/app/actions/meta'

const selectClass =
  'rounded-lg border border-neutral-300 px-2 py-1.5 text-xs outline-none focus:border-accent focus:ring-1 focus:ring-accent'

type Campaign = {
  id: string
  campaign_name: string
  status: string
  owner_id: string | null
  target_category: string | null
}

// Valeurs possibles du champ effective_status de Meta (statut réel de
// diffusion, pas juste le statut configuré) — cf. commentaire dans
// lib/rive/meta.ts. Liste non exhaustive mais couvre les cas courants ;
// une valeur absente de cette table s'affiche telle quelle en repli.
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  PAUSED: 'En pause',
  CAMPAIGN_PAUSED: 'En pause',
  ADSET_PAUSED: 'En pause',
  ARCHIVED: 'Archivée',
  DELETED: 'Supprimée',
  IN_PROCESS: 'En traitement',
  WITH_ISSUES: 'Problème de diffusion',
  PENDING_REVIEW: 'En cours de vérification',
  DISAPPROVED: 'Refusée par Meta',
  PREAPPROVED: 'Pré-approuvée',
  PENDING_BILLING_INFO: 'Infos de facturation requises',
}

export default function CampaignMappingRow({
  campaign,
  members,
}: {
  campaign: Campaign
  members: { id: string; full_name: string }[]
}) {
  // Menus déroulants pleinement contrôlés par React (value + onChange), et
  // appel direct de la Server Action au lieu de la déclencher via un <form>.
  // Avant, ces <select> étaient "non contrôlés" (defaultValue) dans un
  // <form action={...}> : React réinitialise automatiquement ce type de
  // champ après le succès d'une Server Action déclenchée par un formulaire
  // (requestFormReset, React 19) — le champ revenait donc systématiquement
  // à sa valeur du tout premier chargement de la page, quel que soit le
  // résultat de l'enregistrement (qui, lui, fonctionnait très bien). C'était
  // la vraie cause de "ma sélection s'enlève toute seule". En pilotant la
  // valeur nous-mêmes, ce réflexe de React ne s'applique plus.
  const [ownerId, setOwnerId] = useState(campaign.owner_id ?? '')
  const [targetCategory, setTargetCategory] = useState(campaign.target_category ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save(nextOwnerId: string, nextTargetCategory: string) {
    const formData = new FormData()
    formData.set('owner_id', nextOwnerId)
    formData.set('target_category', nextTargetCategory)
    startTransition(async () => {
      const result = await updateMetaCampaignMapping(campaign.id, undefined, formData)
      setError(result?.error ?? null)
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium text-neutral-800">{campaign.campaign_name || '—'}</span>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
            {STATUS_LABELS[campaign.status] || campaign.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={ownerId}
            disabled={pending}
            onChange={(e) => {
              setOwnerId(e.target.value)
              save(e.target.value, targetCategory)
            }}
            className={selectClass}
          >
            <option value="">— Propriétaire —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name || 'Sans nom'}
              </option>
            ))}
          </select>
          <select
            value={targetCategory}
            disabled={pending}
            onChange={(e) => {
              setTargetCategory(e.target.value)
              save(ownerId, e.target.value)
            }}
            className={selectClass}
          >
            <option value="">— Tableau —</option>
            <option value="acheteur">Acheteurs</option>
            <option value="vendeur">Vendeurs</option>
            <option value="investisseur_france">Investisseurs France</option>
            <option value="investisseur_dubai">Investisseurs Dubaï</option>
            <option value="investisseur_georgie">Investisseurs Géorgie</option>
          </select>
        </div>
      </div>
      {error && <p className="rounded-lg bg-danger-soft px-2 py-1.5 text-xs text-danger">{error}</p>}
    </div>
  )
}