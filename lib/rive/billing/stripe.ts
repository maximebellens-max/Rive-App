// Intégration Stripe (paiement des paliers payants). Même principe de
// dégradation propre que generateWithClaude/sendLeadAlertEmail : tant que
// STRIPE_SECRET_KEY n'est pas configurée sur ce déploiement, getStripeClient
// renvoie null et les fonctionnalités de paiement restent simplement
// invisibles côté interface plutôt que de planter (voir usage-section.tsx).
//
// Les ID de prix Stripe (un par palier payant) sont lus depuis les variables
// d'environnement plutôt que figés ici : les tarifs définitifs n'ont pas
// encore été validés (voir lib/rive/billing/plans.ts et
// deploy-notes/rive-commercialisation-prix-facturation.md) — il suffira de
// créer/ajuster les prix côté Stripe et de mettre à jour les variables,
// sans toucher au code.
import Stripe from 'stripe'

let cachedClient: Stripe | null | undefined

export function getStripeClient(): Stripe | null {
  if (cachedClient !== undefined) return cachedClient
  const key = process.env.STRIPE_SECRET_KEY
  cachedClient = key ? new Stripe(key) : null
  return cachedClient
}

// Seuls les paliers payants peuvent être achetés — 'interne' (agences
// fondatrices comme Hevrest) n'est jamais proposé à l'achat.
const PURCHASABLE_PLANS = ['solo', 'equipe', 'agence'] as const
export type PurchasablePlan = (typeof PURCHASABLE_PLANS)[number]

export function isPurchasablePlan(plan: string): plan is PurchasablePlan {
  return (PURCHASABLE_PLANS as readonly string[]).includes(plan)
}

const PRICE_ENV_BY_PLAN: Record<PurchasablePlan, string> = {
  solo: 'STRIPE_PRICE_SOLO',
  equipe: 'STRIPE_PRICE_EQUIPE',
  agence: 'STRIPE_PRICE_AGENCE',
}

export function priceIdForPlan(plan: PurchasablePlan): string | null {
  return process.env[PRICE_ENV_BY_PLAN[plan]] || null
}

// Sens inverse (utilisé par le webhook pour déduire le palier à partir du
// prix Stripe réellement souscrit, plus fiable que de faire confiance à une
// métadonnée qui peut devenir périmée après un changement de palier fait
// depuis le portail Stripe plutôt que depuis Rive).
export function planForPriceId(priceId: string): PurchasablePlan | null {
  for (const plan of PURCHASABLE_PLANS) {
    if (priceIdForPlan(plan) === priceId) return plan
  }
  return null
}

// true seulement si Stripe est réellement utilisable pour CE palier précis
// (clé API + prix configurés) — sert à n'afficher le bouton d'achat que
// quand il fonctionnera vraiment, plutôt que de le montrer dans le vide.
export function isCheckoutAvailable(plan: PurchasablePlan): boolean {
  return Boolean(getStripeClient() && priceIdForPlan(plan))
}

export async function createCheckoutSession(params: {
  agencyId: string
  plan: PurchasablePlan
  customerEmail: string
  existingCustomerId: string | null
  successUrl: string
  cancelUrl: string
}): Promise<string> {
  const stripe = getStripeClient()
  if (!stripe) throw new Error("Stripe n'est pas configuré sur ce déploiement (STRIPE_SECRET_KEY manquante).")
  const priceId = priceIdForPlan(params.plan)
  if (!priceId) throw new Error(`Aucun prix Stripe configuré pour le palier "${params.plan}".`)

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.agencyId,
    // Réutilise le client Stripe existant s'il y en a déjà un (ex. agence
    // qui avait résilié puis se réabonne) plutôt que d'en recréer un nouveau
    // à chaque passage par Checkout.
    ...(params.existingCustomerId
      ? { customer: params.existingCustomerId }
      : { customer_email: params.customerEmail }),
    // Dupliqué sur la session ET sur l'abonnement créé : le webhook
    // checkout.session.completed lit le premier, un futur
    // customer.subscription.updated pourra lire le second sans avoir à
    // rappeler Stripe pour retrouver la session d'origine.
    metadata: { agency_id: params.agencyId, plan: params.plan },
    subscription_data: { metadata: { agency_id: params.agencyId, plan: params.plan } },
  })

  if (!session.url) throw new Error("Stripe n'a pas renvoyé d'URL de paiement.")
  return session.url
}

export async function createPortalSession(params: { customerId: string; returnUrl: string }): Promise<string> {
  const stripe = getStripeClient()
  if (!stripe) throw new Error("Stripe n'est pas configuré sur ce déploiement (STRIPE_SECRET_KEY manquante).")
  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  })
  return session.url
}