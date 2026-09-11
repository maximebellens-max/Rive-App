import Link from 'next/link'
import { getAuthedProfile } from '@/lib/supabase/session'
import { fetchCampaigns, fetchCampaignInsights, type MetaDatePreset } from '@/lib/rive/meta'
import { CATEGORY_LABEL } from '@/lib/rive/pipelines'

type RangeKey = 'yesterday' | '7d' | '30d'

const RANGE_OPTIONS: { key: RangeKey; label: string; preset: MetaDatePreset }[] = [
  { key: 'yesterday', label: 'Hier', preset: 'yesterday' },
  { key: '7d', label: '7 derniers jours', preset: 'last_7d' },
  { key: '30d', label: '30 derniers jours', preset: 'last_30d' },
]

// Bornes de date (jours calendaires, pas de fenêtre glissante à l'heure
// près) pour compter les vrais leads Rive sur la même période que celle
// affichée côté Meta. "Hier" = hier minuit à aujourd'hui minuit ; "7/30
// derniers jours" = les N derniers jours calendaires, aujourd'hui inclus.
function rangeBounds(key: RangeKey): { start: Date; end: Date | null } {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  if (key === 'yesterday') {
    const start = new Date(startOfToday)
    start.setDate(start.getDate() - 1)
    return { start, end: startOfToday }
  }

  const daysBack = key === '7d' ? 6 : 29
  const start = new Date(startOfToday)
  start.setDate(start.getDate() - daysBack)
  return { start, end: null }
}

// Dépense affichée avec centimes (contrairement à formatEUR, arrondie à
// l'euro) : à l'échelle d'une seule campagne sur 24h, l'arrondi masquerait
// des écarts qui comptent pour vérifier un budget.
function formatSpend(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n)
}

export default async function CampaignsPage({ searchParams }: PageProps<'/dashboard/campaigns'>) {
  const params = await searchParams
  const rangeParam = typeof params.range === 'string' ? params.range : '30d'
  const range = RANGE_OPTIONS.find((r) => r.key === rangeParam) ?? RANGE_OPTIONS[2]

  const { supabase, profile } = await getAuthedProfile()
  const agencyId = profile?.agency_id

  const { data: connection } = agencyId
    ? await supabase
        .from('meta_connections')
        .select('ad_account_id, ad_account_name, access_token, user_access_token')
        .eq('agency_id', agencyId)
        .maybeSingle()
    : { data: null }

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Campagnes</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Performance des campagnes Meta Ads actives, croisée avec les vrais leads reçus dans Rive.
        </p>
      </div>
      <div className="flex rounded-lg border border-neutral-300 p-0.5 text-xs">
        {RANGE_OPTIONS.map((r) => (
          <Link
            key={r.key}
            href={`/dashboard/campaigns?range=${r.key}`}
            className={`rounded px-2.5 py-1 font-medium ${
              r.key === range.key ? 'bg-accent text-accent-ink' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>
    </div>
  )

  if (!agencyId || !connection) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-surface py-16 text-center shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Aucun compte Meta connecté</h2>
          <p className="max-w-sm text-sm text-neutral-500">
            Connecte ton compte publicitaire Meta pour voir apparaître ici la performance de tes campagnes.
          </p>
          <Link
            href="/dashboard/settings"
            className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover"
          >
            Aller dans Réglages
          </Link>
        </div>
      </div>
    )
  }

  const campaignToken = connection.user_access_token || connection.access_token

  let campaignsRaw: Awaited<ReturnType<typeof fetchCampaigns>> = []
  let insightsRaw: Awaited<ReturnType<typeof fetchCampaignInsights>> = []
  let fetchError: string | null = null

  try {
    ;[campaignsRaw, insightsRaw] = await Promise.all([
      fetchCampaigns(connection.ad_account_id, campaignToken),
      fetchCampaignInsights(connection.ad_account_id, campaignToken, range.preset),
    ])
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Impossible de récupérer les données depuis Meta.'
  }

  if (fetchError) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-surface py-16 text-center shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Impossible de charger les campagnes</h2>
          <p className="max-w-sm text-sm text-neutral-500">{fetchError}</p>
          <Link
            href="/dashboard/settings"
            className="mt-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Vérifier la connexion Meta dans Réglages
          </Link>
        </div>
      </div>
    )
  }

  const activeCampaigns = campaignsRaw.filter((c) => c.effective_status === 'ACTIVE')
  const insightByCampaignId = new Map(insightsRaw.map((i) => [i.campaignId, i]))
  const activeIds = activeCampaigns.map((c) => c.id)

  // Mapping propriétaire/tableau déjà configuré dans Réglages, pour donner du
  // contexte à chaque campagne sans avoir à ré-ouvrir Réglages.
  const { data: mappingsRaw } = activeIds.length
    ? await supabase
        .from('meta_campaigns')
        .select('campaign_id, owner_id, target_category')
        .eq('agency_id', agencyId)
        .in('campaign_id', activeIds)
    : { data: [] as { campaign_id: string; owner_id: string | null; target_category: string | null }[] }

  const ownerIds = [...new Set((mappingsRaw ?? []).map((m) => m.owner_id).filter((id): id is string => !!id))]
  const { data: owners } = ownerIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', ownerIds)
    : { data: [] as { id: string; full_name: string }[] }
  const ownerNameById = new Map((owners ?? []).map((o) => [o.id, o.full_name]))
  const mappingByCampaignId = new Map((mappingsRaw ?? []).map((m) => [m.campaign_id, m]))

  // Nombre de vrais leads reçus dans Rive pour ces campagnes, sur la même
  // fenêtre — plus fiable que le nombre de leads renvoyé par Meta lui-même
  // (peut inclure doublons/soumissions bidon jamais retenues côté CRM).
  const { start: rangeStart, end: rangeEnd } = rangeBounds(range.key)

  let leadsQuery = activeIds.length
    ? supabase
        .from('leads')
        .select('meta_campaign_id')
        .eq('agency_id', agencyId)
        .in('meta_campaign_id', activeIds)
        .gte('created_at', rangeStart.toISOString())
    : null
  if (leadsQuery && rangeEnd) leadsQuery = leadsQuery.lt('created_at', rangeEnd.toISOString())
  const { data: recentLeads } = leadsQuery ? await leadsQuery : { data: [] as { meta_campaign_id: string | null }[] }

  const leadCountByCampaignId = new Map<string, number>()
  for (const l of recentLeads ?? []) {
    if (!l.meta_campaign_id) continue
    leadCountByCampaignId.set(l.meta_campaign_id, (leadCountByCampaignId.get(l.meta_campaign_id) ?? 0) + 1)
  }

  const rows = activeCampaigns
    .map((c) => {
      const insight = insightByCampaignId.get(c.id)
      const leads = leadCountByCampaignId.get(c.id) ?? 0
      const mapping = mappingByCampaignId.get(c.id)
      return {
        id: c.id,
        name: c.name,
        ownerName: mapping?.owner_id ? ownerNameById.get(mapping.owner_id) : null,
        targetCategory: mapping?.target_category ? CATEGORY_LABEL[mapping.target_category] : null,
        spend: insight?.spend ?? 0,
        impressions: insight?.impressions ?? 0,
        clicks: insight?.clicks ?? 0,
        ctr: insight?.ctr ?? 0,
        cpc: insight?.cpc ?? 0,
        leads,
        costPerLead: leads > 0 ? (insight?.spend ?? 0) / leads : null,
      }
    })
    .sort((a, b) => b.spend - a.spend)

  const totals = rows.reduce(
    (acc, r) => ({
      spend: acc.spend + r.spend,
      clicks: acc.clicks + r.clicks,
      impressions: acc.impressions + r.impressions,
      leads: acc.leads + r.leads,
    }),
    { spend: 0, clicks: 0, impressions: 0, leads: 0 }
  )
  const avgCostPerLead = totals.leads > 0 ? totals.spend / totals.leads : null

  return (
    <div className="flex flex-col gap-6">
      {header}

      {!rows.length ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-surface py-16 text-center shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Aucune campagne active</h2>
          <p className="max-w-sm text-sm text-neutral-500">
            Aucune campagne n&apos;est actuellement en diffusion sur {connection.ad_account_name}.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-neutral-200 bg-surface p-4 shadow-sm">
              <p className="text-xs text-neutral-500">Dépense totale</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{formatSpend(totals.spend)}</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-surface p-4 shadow-sm">
              <p className="text-xs text-neutral-500">Clics</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{formatNumber(totals.clicks)}</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-surface p-4 shadow-sm">
              <p className="text-xs text-neutral-500">Leads reçus dans Rive</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{formatNumber(totals.leads)}</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-surface p-4 shadow-sm">
              <p className="text-xs text-neutral-500">Coût par lead moyen</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {avgCostPerLead !== null ? formatSpend(avgCostPerLead) : '—'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-surface shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Campagne</th>
                  <th className="px-4 py-3 font-medium">Dépense</th>
                  <th className="px-4 py-3 font-medium">Impressions</th>
                  <th className="px-4 py-3 font-medium">Clics</th>
                  <th className="px-4 py-3 font-medium">CTR</th>
                  <th className="px-4 py-3 font-medium">Coût/clic</th>
                  <th className="px-4 py-3 font-medium">Leads Rive</th>
                  <th className="px-4 py-3 font-medium">Coût/lead</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-100 last:border-0 align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900">{r.name}</p>
                      {(r.ownerName || r.targetCategory) && (
                        <p className="mt-0.5 text-xs text-neutral-400">
                          {[r.targetCategory, r.ownerName].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-neutral-600">{formatSpend(r.spend)}</td>
                    <td className="px-4 py-3 tabular-nums text-neutral-600">{formatNumber(r.impressions)}</td>
                    <td className="px-4 py-3 tabular-nums text-neutral-600">{formatNumber(r.clicks)}</td>
                    <td className="px-4 py-3 tabular-nums text-neutral-600">{r.ctr.toFixed(2)}%</td>
                    <td className="px-4 py-3 tabular-nums text-neutral-600">{formatSpend(r.cpc)}</td>
                    <td className="px-4 py-3 tabular-nums text-neutral-600">{formatNumber(r.leads)}</td>
                    <td className="px-4 py-3 tabular-nums text-neutral-600">
                      {r.costPerLead !== null ? formatSpend(r.costPerLead) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-neutral-400">
            Noms/statuts et dépense en direct depuis Meta · &quot;Leads Rive&quot; compte les prospects réellement
            créés dans Rive sur cette période, pas le chiffre &quot;leads&quot; de Meta.
          </p>
        </>
      )}
    </div>
  )
}