import { notFound } from 'next/navigation'
import { getAccessContext } from '@/lib/rive/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLANS } from '@/lib/rive/billing/plans'
import { AGENCY_MODULES, MODULE_LABELS } from '@/lib/rive/billing/modules'
import { formatDate } from '@/lib/rive/mandates'
import ModuleToggle from './module-toggle'

// Vue d'ensemble de toutes les agences clientes (toutes agences confondues,
// via le client admin — voir lib/supabase/admin.ts) et interrupteur par
// module optionnel. Réservé à un seul profil (voir migration 058 et
// lib/rive/access.ts) : ni les autres membres de Hevrest, ni un owner d'une
// agence cliente ne peuvent l'atteindre, même en tapant l'URL directement.
export default async function AdminPage() {
  const { isPlatformAdmin } = await getAccessContext()
  if (!isPlatformAdmin) notFound()

  const admin = createAdminClient()
  const { data: agencies } = await admin
    .from('agencies')
    .select('id, name, plan, subscription_status, trial_ends_at, enabled_modules, created_at')
    .order('created_at', { ascending: false })

  const rows = agencies ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Agences clientes</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Toutes les agences utilisant Rive, tous paliers confondus — active ou désactive un module optionnel pour
          chacune.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-surface shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3">Agence</th>
              <th className="px-4 py-3">Palier</th>
              <th className="px-4 py-3">Abonnement</th>
              {AGENCY_MODULES.map((m) => (
                <th key={m} className="px-4 py-3">
                  {MODULE_LABELS[m]}
                </th>
              ))}
              <th className="px-4 py-3">Créée le</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((agency) => {
              const isInterne = agency.plan === 'interne'
              const enabledModules = new Set((agency.enabled_modules ?? []) as string[])
              return (
                <tr key={agency.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-neutral-900">{agency.name}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {agency.plan ? (PLANS as Record<string, { label: string }>)[agency.plan]?.label ?? agency.plan : '—'}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {isInterne
                      ? 'Interne'
                      : agency.subscription_status === 'trialing' && agency.trial_ends_at
                        ? `Essai jusqu'au ${formatDate(agency.trial_ends_at)}`
                        : (agency.subscription_status ?? '—')}
                  </td>
                  {AGENCY_MODULES.map((m) => (
                    <td key={m} className="px-4 py-3">
                      {isInterne ? (
                        <span className="text-xs text-neutral-400">Inclus (interne)</span>
                      ) : (
                        <ModuleToggle agencyId={agency.id} moduleKey={m} enabled={enabledModules.has(m)} />
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-neutral-500">{formatDate(agency.created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-4 py-6 text-sm text-neutral-500">Aucune agence pour l’instant.</p>}
      </div>
    </div>
  )
}