// Paliers d'abonnement — chiffres validés par Maxime (voir
// deploy-notes/rive-commercialisation-prix-facturation.md pour l'analyse
// concurrentielle qui a mené à ces montants). Les 3 paliers payants ont un
// accès IDENTIQUE au produit (CRM complet, assistant IA, marketing, leads
// Meta Ads, alertes, relances automatiques, estimations) — ils ne diffèrent
// QUE par le nombre d'agents inclus et le quota IA mensuel. La génération de
// mandats/documents juridiques n'est vendue à personne pour l'instant,
// réservée à Hevrest (voir lib/rive/access.ts, canGenerateMandates) — elle
// n'apparaît donc pas ici. Seules les limites IA restent indicatives (pas
// encore confrontées à un usage réel) : un seul fichier à modifier le jour
// où elles doivent bouger, aucune migration ni redéploiement de logique.
//
// 'interne' est réservé aux agences fondatrices (Hevrest) : jamais
// limitées, jamais facturées via ce mécanisme.
export type PlanKey = 'solo' | 'equipe' | 'agence' | 'interne'

export type Plan = {
  label: string
  // null = pas de plafond sur ce palier.
  seatLimit: number | null
  aiMonthlyLimit: number | null
  // Prix mensuel de base, en centimes — null pour 'interne' (jamais facturée).
  priceCents: number | null
  // Nombre d'agents inclus dans le prix de base avant facturation à l'agent
  // supplémentaire — null pour 'solo' (toujours 1 seul agent, pas de notion
  // de siège supplémentaire) et 'interne'.
  baseSeats: number | null
  // Prix d'un agent au-delà de baseSeats, en centimes — null si non
  // applicable à ce palier. Pas encore facturé automatiquement par Stripe
  // (quantité fixe à 1 sur la session Checkout, voir lib/rive/billing/
  // stripe.ts) : à construire quand la facturation par siège sera prête,
  // cette valeur sert déjà de référence à l'affichage (landing page, etc.).
  extraSeatPriceCents: number | null
}

export const PLANS: Record<PlanKey, Plan> = {
  solo: { label: 'Solo', seatLimit: 1, aiMonthlyLimit: 50, priceCents: 9000, baseSeats: null, extraSeatPriceCents: null },
  equipe: {
    label: 'Équipe',
    seatLimit: null,
    aiMonthlyLimit: 400,
    priceCents: 15000,
    baseSeats: 3,
    extraSeatPriceCents: 4500,
  },
  agence: {
    label: 'Agence',
    seatLimit: null,
    aiMonthlyLimit: null,
    priceCents: 30000,
    baseSeats: 8,
    extraSeatPriceCents: 4500,
  },
  interne: {
    label: 'Interne',
    seatLimit: null,
    aiMonthlyLimit: null,
    priceCents: null,
    baseSeats: null,
    extraSeatPriceCents: null,
  },
}

export function planFor(planKey: string | null | undefined): Plan {
  return PLANS[(planKey as PlanKey) ?? 'interne'] ?? PLANS.interne
}

// Durée de l'essai gratuit proposé aux nouvelles agences — doit rester
// alignée avec le default de agencies.trial_ends_at (voir migration
// 00000000000059_trial_15_days.sql) : cette constante sert uniquement à
// l'affichage (landing page, etc.), le vrai calcul de date reste fait côté
// base de données.
export const TRIAL_DAYS = 15

// Offre de lancement (-30% les 3 premiers mois, sur les 3 paliers payants) —
// doit rester alignée avec le coupon Stripe réellement configuré (voir
// STRIPE_LAUNCH_COUPON_ID, lib/rive/billing/stripe.ts). Sert à l'affichage
// du prix barré/réduit sur la landing page sans dupliquer le calcul partout.
export const LAUNCH_DISCOUNT_PERCENT = 30
export const LAUNCH_DISCOUNT_MONTHS = 3

export function launchPriceCents(priceCents: number): number {
  return Math.round((priceCents * (100 - LAUNCH_DISCOUNT_PERCENT)) / 100)
}