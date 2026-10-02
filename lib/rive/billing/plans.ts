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
  // applicable à ce palier. Facturé automatiquement par Stripe via une
  // ligne d'abonnement séparée, maintenue à jour par
  // lib/rive/billing/seats.ts (voir billableExtraSeats ci-dessous).
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

// Nombre de postes facturables en supplément pour ce palier, étant donné un
// effectif réel (nombre de profils rattachés à l'agence, propriétaire
// inclus) — 0 si le palier n'a pas de notion de postes inclus (solo,
// interne) ou si l'effectif ne dépasse pas le nombre inclus dans le prix de
// base. Pure fonction de calcul : la synchronisation avec Stripe (créer/
// ajuster/retirer la ligne d'abonnement correspondante) est dans
// lib/rive/billing/seats.ts, qui s'appuie sur cette fonction plutôt que de
// dupliquer la règle.
export function billableExtraSeats(planKey: string | null | undefined, seatCount: number): number {
  const plan = planFor(planKey)
  if (plan.baseSeats === null || plan.extraSeatPriceCents === null) return 0
  return Math.max(0, seatCount - plan.baseSeats)
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