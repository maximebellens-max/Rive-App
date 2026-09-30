// Paliers d'abonnement — la STRUCTURE (3 paliers + palier interne) est
// posée maintenant, mais les CHIFFRES (limites, prix) sont volontairement
// provisoires : Maxime a choisi de ne pas les figer avant d'avoir échangé
// avec quelques agents indépendants sur ce qu'ils paient/paieraient
// aujourd'hui (voir deploy-notes/rive-commercialisation-prix-facturation.md
// pour l'analyse concurrentielle qui a mené à cette fourchette). Ajuster
// les valeurs ci-dessous n'a besoin d'aucune migration ni redéploiement de
// logique — un seul fichier à modifier.
//
// 'interne' est réservé aux agences fondatrices (Hevrest) : jamais
// limitées, jamais facturées via ce mécanisme.
export type PlanKey = 'solo' | 'equipe' | 'agence' | 'interne'

export type Plan = {
  label: string
  // null = pas de plafond sur ce palier.
  seatLimit: number | null
  aiMonthlyLimit: number | null
  // Provisoire (voir en-tête) : pas encore affiché nulle part dans
  // l'interface, juste posé ici pour ne pas avoir à retoucher la structure
  // plus tard.
  priceCentsPerSeat: number | null
}

export const PLANS: Record<PlanKey, Plan> = {
  solo: { label: 'Solo', seatLimit: 1, aiMonthlyLimit: 50, priceCentsPerSeat: null },
  equipe: { label: 'Équipe', seatLimit: 5, aiMonthlyLimit: 400, priceCentsPerSeat: null },
  agence: { label: 'Agence', seatLimit: null, aiMonthlyLimit: null, priceCentsPerSeat: null },
  interne: { label: 'Interne', seatLimit: null, aiMonthlyLimit: null, priceCentsPerSeat: null },
}

export function planFor(planKey: string | null | undefined): Plan {
  return PLANS[(planKey as PlanKey) ?? 'interne'] ?? PLANS.interne
}