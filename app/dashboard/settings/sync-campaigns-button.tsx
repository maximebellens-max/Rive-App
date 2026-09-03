'use client'

import { useActionState } from 'react'
import { syncMetaCampaigns, type MetaSyncState } from '@/app/actions/meta'

export default function SyncCampaignsButton() {
  const [state, action, pending] = useActionState<MetaSyncState, FormData>(syncMetaCampaigns, undefined)

  return (
    <form action={action} className="flex items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
      >
        {pending ? 'Actualisation…' : 'Actualiser les campagnes'}
      </button>
      {state?.error && <span className="text-xs text-danger">{state.error}</span>}
      {state?.success && <span className="text-xs text-good">Campagnes à jour.</span>}
    </form>
  )
}