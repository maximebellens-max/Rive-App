import { disconnectMeta } from '@/app/actions/meta'
import SyncCampaignsButton from './sync-campaigns-button'
import CampaignMappingRow from './campaign-mapping-row'

type Connection = { ad_account_name: string; page_name: string } | null

type Campaign = {
  id: string
  campaign_name: string
  status: string
  owner_id: string | null
  target_category: string | null
}

type Member = { id: string; full_name: string }

export default function MetaSection({
  connection,
  campaigns,
  members,
  successMessage,
  errorMessage,
}: {
  connection: Connection
  campaigns: Campaign[]
  members: Member[]
  successMessage?: string
  errorMessage?: string
}) {
  const unconfigured = campaigns.filter((c) => !c.owner_id || !c.target_category).length

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Meta Ads — Leads automatiques</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Connecte ton compte publicitaire Meta pour que chaque prospect qui remplit un formulaire publicitaire
          (Facebook/Instagram) arrive automatiquement dans Rive, sur le bon tableau — avec toute l&apos;agence
          prévenue par email.
        </p>
      </div>

      {successMessage && (
        <p className="rounded-lg bg-good-soft px-3 py-2 text-xs text-good">Compte Meta connecté avec succès.</p>
      )}
      {errorMessage && <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{errorMessage}</p>}

      {!connection ? (
        <a
          href="/api/auth/meta/connect"
          className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover"
        >
          Connecter mon compte Meta
        </a>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-sm text-neutral-700">
              Connecté au compte <span className="font-medium">{connection.ad_account_name}</span> · Page{' '}
              <span className="font-medium">{connection.page_name}</span>
            </p>
            <div className="flex items-center gap-2">
              <SyncCampaignsButton />
              <form action={disconnectMeta}>
                <button
                  type="submit"
                  className="rounded-lg border border-danger px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger-soft"
                >
                  Déconnecter
                </button>
              </form>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-neutral-700">Campagnes ({campaigns.length})</p>
              {unconfigured > 0 && (
                <p className="text-xs text-warn">
                  {unconfigured} campagne{unconfigured > 1 ? 's' : ''} sans propriétaire ou tableau assigné
                </p>
              )}
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {campaigns.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  Aucune campagne récupérée pour l&apos;instant — clique sur &quot;Actualiser les campagnes&quot;.
                </p>
              ) : (
                campaigns.map((c) => <CampaignMappingRow key={c.id} campaign={c} members={members} />)
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}