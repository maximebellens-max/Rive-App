'use client'

// Boutons d'action de la carte "Abonnement" (usage-section.tsx) : passer à
// un palier payant (Stripe Checkout) ou gérer un abonnement existant
// (portail Stripe). Composant client séparé car useActionState a besoin
// d'interactivité — usage-section.tsx, qui l'englobe, reste lui un simple
// composant serveur d'affichage.
import { useActionState } from 'react'
import { startCheckoutAction, openBillingPortalAction, type BillingState } from '@/app/actions/billing'
import { PLANS, type PlanKey } from '@/lib/rive/billing/plans'
import type { PurchasablePlan } from '@/lib/rive/billing/stripe'

const PURCHASABLE: PurchasablePlan[] = ['solo', 'equipe', 'agence']

function UpgradeButton({ plan }: { plan: PurchasablePlan }) {
  const [state, action, pending] = useActionState<BillingState, FormData>(startCheckoutAction, undefined)
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="plan" value={plan} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
      >
        {pending ? 'Redirection…' : `Passer au palier ${PLANS[plan].label}`}
      </button>
      {state?.error && <p className="text-xs text-danger">{state.error}</p>}
    </form>
  )
}

function ManageSubscriptionButton() {
  const [state, action, pending] = useActionState<BillingState, FormData>(openBillingPortalAction, undefined)
  return (
    <form action={action} className="flex flex-col gap-1">
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? 'Redirection…' : 'Gérer mon abonnement'}
      </button>
      {state?.error && <p className="text-xs text-danger">{state.error}</p>}
    </form>
  )
}

export default function BillingActions({
  isOwner,
  currentPlan,
  hasStripeCustomer,
  checkoutAvailable,
}: {
  isOwner: boolean
  currentPlan: PlanKey
  hasStripeCustomer: boolean
  checkoutAvailable: Record<PurchasablePlan, boolean>
}) {
  if (!isOwner) {
    return <p className="text-xs text-neutral-500">Seul le ou la propriétaire de l’agence peut gérer l’abonnement.</p>
  }

  // Une fois un client Stripe associé à l'agence, tout changement de palier
  // (y compris revenir à un palier moins cher) passe par le portail Stripe
  // plutôt que par un nouveau Checkout.
  if (hasStripeCustomer) {
    return <ManageSubscriptionButton />
  }

  const upgradablePlans = PURCHASABLE.filter((p) => p !== currentPlan && checkoutAvailable[p])
  if (!upgradablePlans.length) {
    return <p className="text-xs text-neutral-500">Paiement en ligne bientôt disponible — configuration en cours.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {upgradablePlans.map((plan) => (
        <UpgradeButton key={plan} plan={plan} />
      ))}
    </div>
  )
}