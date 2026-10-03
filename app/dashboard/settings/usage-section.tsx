// Affichage en lecture seule de l'usage IA/WhatsApp du mois en cours. Les
// compteurs ne remontent que depuis le déploiement de cette fonctionnalité
// (pas d'historique rétroactif) : le mois en cours peut donc démarrer à 0
// même sur une agence déjà active.
//
// 2 compteurs IA distincts (voir lib/rive/billing/usage.ts) : aiCount est
// l'usage déclenché par l'agent (bouton "Générer", assistant) — celui
// comparé à la limite du palier et affiché avec une barre de progression.
// aiBackgroundCount est l'usage des automatisations (scoring de priorité,
// relances, rapport hebdomadaire) — purement informatif, jamais limité,
// affiché sans barre pour ne pas laisser croire qu'il compte dans le quota.
import { planFor, billableExtraSeats, type PlanKey } from '@/lib/rive/billing/plans'
import BillingActions from './billing-actions'
import type { PurchasablePlan } from '@/lib/rive/billing/stripe'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const STATUS_LABEL: Record<string, { text: string; tone: 'neutral' | 'danger' }> = {
  trialing: { text: 'Période d’essai', tone: 'neutral' },
  active: { text: 'Actif', tone: 'neutral' },
  past_due: { text: 'Paiement en retard', tone: 'danger' },
  canceled: { text: 'Résilié', tone: 'danger' },
}

function euros(cents: number): string {
  return `${Math.round(cents / 100)} €`
}

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
  aiBackgroundCount,
  whatsappCount,
  seatCount,
  isOwner,
  subscriptionStatus,
  trialEndsAt,
  stripeCustomerId,
  checkoutAvailable,
  hasWhatsapp,
}: {
  planKey: string | null
  month: string
  aiCount: number
  aiBackgroundCount: number
  whatsappCount: number
  seatCount: number
  isOwner: boolean
  subscriptionStatus: string | null
  trialEndsAt: string | null
  stripeCustomerId: string | null
  checkoutAvailable: Record<PurchasablePlan, boolean>
  hasWhatsapp: boolean
}) {
  const plan = planFor(planKey)
  const isUnlimited = plan.aiMonthlyLimit === null && plan.seatLimit === null
  const extraSeats = billableExtraSeats(planKey, seatCount)
  const resolvedPlanKey: PlanKey = (planKey as PlanKey) ?? 'interne'
  const isInternal = resolvedPlanKey === 'interne'
  const status = subscriptionStatus ? STATUS_LABEL[subscriptionStatus] : null

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-neutral-200 bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Palier actuel</h2>
          <div className="flex items-center gap-2">
            {status && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  status.tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-neutral-100 text-neutral-700'
                }`}
              >
                {status.text}
              </span>
            )}
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
              {plan.label}
            </span>
          </div>
        </div>
        <p className="mt-1.5 text-xs text-neutral-500">
          {isUnlimited && isInternal
            ? 'Agence fondatrice — aucune limite appliquée, quels que soient les chiffres ci-dessous.'
            : 'Les limites indiquées sont provisoires, le temps de valider les paliers définitifs.'}
        </p>
        {subscriptionStatus === 'trialing' && trialEndsAt && (
          <p className="mt-1.5 text-xs text-neutral-500">Essai gratuit jusqu’au {formatDate(trialEndsAt)}.</p>
        )}
      </div>

      {!isInternal && (
        <div className="rounded-2xl border border-neutral-200 bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Abonnement</h2>
          <p className="mt-1 text-xs text-neutral-500">
            {stripeCustomerId
              ? 'Gère ton palier, ton moyen de paiement et tes factures depuis le portail Stripe.'
              : 'Passe à un palier payant pour lever les limites ci-dessus.'}
          </p>
          <div className="mt-3">
            <BillingActions
              isOwner={isOwner}
              currentPlan={resolvedPlanKey}
              hasStripeCustomer={!!stripeCustomerId}
              checkoutAvailable={checkoutAvailable}
            />
          </div>
        </div>
      )}

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

          {aiBackgroundCount > 0 && (
            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-neutral-700">
                  Dont automatisations (scoring, relances, rapport)
                </span>
                <span className="font-medium text-neutral-900 tabular-nums">{aiBackgroundCount}</span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                Généré sans action de ta part — jamais compté dans la limite ci-dessus.
              </p>
            </div>
          )}

          {hasWhatsapp && (
            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-neutral-700">Messages WhatsApp envoyés</span>
                <span className="font-medium text-neutral-900 tabular-nums">{whatsappCount}</span>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-neutral-700">Membres de l’équipe</span>
              <span className="font-medium text-neutral-900 tabular-nums">
                {seatCount}
                {plan.seatLimit !== null && <span className="text-neutral-400"> / {plan.seatLimit}</span>}
              </span>
            </div>
            {extraSeats > 0 && plan.extraSeatPriceCents !== null && (
              <p className="mt-1 text-xs text-neutral-500">
                Dont {extraSeats} poste{extraSeats > 1 ? 's' : ''} au-delà des {plan.baseSeats} inclus, facturé
                {extraSeats > 1 ? 's' : ''} {euros(plan.extraSeatPriceCents)}/mois chacun (
                {euros(extraSeats * plan.extraSeatPriceCents)}/mois au total).
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}