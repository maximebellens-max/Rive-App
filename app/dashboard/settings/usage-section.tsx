// Affichage en lecture seule de l'usage IA/WhatsApp du mois en cours — pas
// encore de limite réellement appliquée (voir lib/rive/billing/), mais
// Maxime voulait pouvoir suivre ces chiffres dès maintenant plutôt que
// d'attendre qu'un palier limité existe. Les compteurs ne remontent que
// depuis le déploiement de cette fonctionnalité (pas d'historique
// rétroactif) : le mois en cours peut donc démarrer à 0 même sur une
// agence déjà active.
import { planFor } from '@/lib/rive/billing/plans'

function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, m - 1, 1))
  const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function UsageBar({ used, limit }: { used: number; limit: number | null }) {
  if (limit === null) return null
  const pct = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100))
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
      <div
        className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-accent'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function UsageSection({
  planKey,
  month,
  aiCount,
  whatsappCount,
  seatCount,
}: {
  planKey: string | null
  month: string
  aiCount: number
  whatsappCount: number
  seatCount: number
}) {
  const plan = planFor(planKey)
  const isUnlimited = plan.aiMonthlyLimit === null && plan.seatLimit === null

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-neutral-200 bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Palier actuel</h2>
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
            {plan.label}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-neutral-500">
          {isUnlimited
            ? 'Agence fondatrice — aucune limite appliquée, quels que soient les chiffres ci-dessous.'
            : 'Les limites indiquées sont provisoires, le temps de valider les paliers définitifs.'}
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-900">Usage — {monthLabel(month)}</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Compté depuis la mise en place du suivi — pas d’historique avant cette date.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-neutral-700">Textes générés par l’IA</span>
              <span className="font-medium text-neutral-900 tabular-nums">
                {aiCount}
                {plan.aiMonthlyLimit !== null && <span className="text-neutral-400"> / {plan.aiMonthlyLimit}</span>}
              </span>
            </div>
            <UsageBar used={aiCount} limit={plan.aiMonthlyLimit} />
          </div>

          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-neutral-700">Messages WhatsApp envoyés</span>
              <span className="font-medium text-neutral-900 tabular-nums">{whatsappCount}</span>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-neutral-700">Membres de l’équipe</span>
              <span className="font-medium text-neutral-900 tabular-nums">
                {seatCount}
                {plan.seatLimit !== null && <span className="text-neutral-400"> / {plan.seatLimit}</span>}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}