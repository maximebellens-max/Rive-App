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

// Prix Stripe d'un poste supplémentaire au-delà de ceux inclus dans le
// palier (voir PLANS.*.extraSeatPriceCents) — un seul prix, partagé entre
// Équipe et Agence puisqu'il est identique sur les deux (45€/mois). Ajouté
// comme ligne séparée sur l'abonnement plutôt que reflété dans le prix de
// base, pour que Stripe proratise automatiquement chaque variation
// d'effectif (voir lib/rive/billing/seats.ts).
export function extraSeatPriceId(): string | null {
  return process.env.STRIPE_PRICE_EXTRA_SEAT || null
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
  // Postes déjà facturables en supplément au moment de la souscription (ex.
  // une agence qui a grandi pendant son essai, avant de passer sur un
  // palier payant) — voir billableExtraSeats dans plans.ts. 0 si aucun, ou
  // si le palier n'a pas de notion de poste supplémentaire (solo).
  extraSeats: number
}): Promise<string> {
  const stripe = getStripeClient()
  if (!stripe) throw new Error("Stripe n'est pas configuré sur ce déploiement (STRIPE_SECRET_KEY manquante).")
  const priceId = priceIdForPlan(params.plan)
  if (!priceId) throw new Error(`Aucun prix Stripe configuré pour le palier "${params.plan}".`)

  const extraPriceId = extraSeatPriceId()
  const extraSeatLineItem =
    params.extraSeats > 0 && extraPriceId ? [{ price: extraPriceId, quantity: params.extraSeats }] : []

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }, ...extraSeatLineItem],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.agencyId,
    // Réutilise le client Stripe existant s'il y en a déjà un (ex. agence
    // qui avait résilié puis se réabonne) plutôt que d'en recréer un nouveau
    // à chaque passage par Checkout.
    ...(params.existingCustomerId
      ? { customer: params.existingCustomerId }
      : { customer_email: params.customerEmail }),
          // Offre de lancement (-30% les 3 premiers mois, sur les 3 paliers) : un
    // coupon Stripe existant (créé une fois côté dashboard, durée
    // "repeating" 3 mois), identifié par variable d'environnement plutôt que
    // figé ici — Stripe arrête de l'appliquer tout seul après 3 mois, aucun
    // code à toucher le jour où l'offre de lancement s'arrête (il suffit de
    // retirer la variable). Voir deploy-notes/guide-depot-O-modules-admin-juridique.md
    ...(process.env.STRIPE_LAUNCH_COUPON_ID
      ? { discounts: [{ coupon: process.env.STRIPE_LAUNCH_COUPON_ID }] }
      : {}),
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

// Recale la ligne "poste supplémentaire" d'un abonnement existant sur un
// nombre de postes facturables donné — crée la ligne si elle n'existe pas
// encore et qu'il en faut une, ajuste sa quantité si elle existe déjà avec
// un nombre différent, ou la supprime si l'agence ne doit plus rien payer en
// supplément (effectif redescendu sous le nombre de postes inclus, ou
// changement de palier vers un palier sans notion de poste supplémentaire).
// Stripe proratise automatiquement la différence sur la facture suivante.
// Appelée par lib/rive/billing/seats.ts, qui calcule le nombre de postes
// facturables à partir de l'effectif réel — jamais directement avec un
// nombre "à la main".
export async function updateSubscriptionExtraSeats(subscriptionId: string, extraSeats: number): Promise<void> {
  const stripe = getStripeClient()
  const priceId = extraSeatPriceId()
  if (!stripe || !priceId) return

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const existingItem = subscription.items.data.find((item) => item.price.id === priceId)

  if (extraSeats > 0) {
    if (existingItem) {
      if (existingItem.quantity !== extraSeats) {
        await stripe.subscriptionItems.update(existingItem.id, { quantity: extraSeats })
      }
    } else {
      await stripe.subscriptionItems.create({ subscription: subscriptionId, price: priceId, quantity: extraSeats })
    }
  } else if (existingItem) {
    await stripe.subscriptionItems.del(existingItem.id)
  }
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