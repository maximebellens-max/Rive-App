'use client'

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

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  PAUSED: 'En pause',
  ARCHIVED: 'Archivée',
  DELETED: 'Supprimée',
}

export default function CampaignMappingRow({
  campaign,
  members,
}: {
  campaign: Campaign
  members: { id: string; full_name: string }[]
}) {
  const updateWithId = updateMetaCampaignMapping.bind(null, campaign.id)

  return (
    <form
      action={updateWithId}
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
    >
      <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium text-neutral-800">{campaign.campaign_name || '—'}</span>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
          {STATUS_LABELS[campaign.status] || campaign.status}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          name="owner_id"
          defaultValue={campaign.owner_id ?? ''}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
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
          name="target_category"
          defaultValue={campaign.target_category ?? ''}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className={selectClass}
        >
          <option value="">— Tableau —</option>
          <option value="acheteur">Acheteurs</option>
          <option value="vendeur">Vendeurs</option>
          <option value="investisseur">Investisseurs</option>
        </select>
      </div>
    </form>
  )
}