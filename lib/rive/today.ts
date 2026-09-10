// Logique de la vue "Aujourd'hui" (tableau de bord quotidien), reprise à
// l'identique du prototype Rive.

export type ActionBucket = 'overdue' | 'today' | 'upcoming' | null

// Fenêtre "à venir" utilisée par toutes les cartes d'échéances de la vue
// Aujourd'hui (prospects + tableaux de suivi Ameublement/Cuisine/Travaux).
export const UPCOMING_WINDOW_DAYS = 7

// overdue si passé, today si aujourd'hui, upcoming si dans les UPCOMING_WINDOW_DAYS prochains jours.
export function actionBucket(dateStr: string | null): ActionBucket {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'today'
  if (diffDays <= UPCOMING_WINDOW_DAYS) return 'upcoming'
  return null
}

// Pour les tableaux de suivi (Ameublement, Cuisine, Travaux) : un dossier a
// plusieurs dates clés possibles (livraison, pose, échéance de travaux...).
// Retourne la plus proche parmi celles tombant dans les UPCOMING_WINDOW_DAYS
// prochains jours (même fenêtre que le widget "À venir" des prospects), avec
// le libellé de l'étape correspondante — ou null si aucune n'est dans cette fenêtre.
export function nearestUpcomingMilestone(
  candidates: { label: string; date: string | null }[]
): { label: string; date: string } | null {
  let best: { label: string; date: string } | null = null
  for (const c of candidates) {
    if (!c.date || actionBucket(c.date) !== 'upcoming') continue
    if (!best || c.date < best.date) best = { label: c.label, date: c.date }
  }
  return best
}

export const RECONTACT_THRESHOLD_DAYS = 300
export const STALE_BIEN_THRESHOLD_DAYS = 60

// Seuils utilisés par l'agent de relance automatique (voir
// lib/rive/relance-agent.ts) : paliers de la séquence "nouveau prospect
// sans retour", et délai avant de proposer un avis Google ou de relancer
// une estimation restée sans suite.
export const RELANCE_STEPS = { j3: 3, j7: 7, j14: 14 } as const
export const GOOGLE_REVIEW_DELAY_DAYS = 7
export const ESTIMATION_FOLLOWUP_DELAY_DAYS = 7

// Paliers de la relance "vendeur bloqué en RDV 2 finalisé" (colonne juste
// avant "Mandat signé" sur le tableau Vendeurs) : J+7, J+15, J+30 sans
// mandat signé depuis l'entrée dans cette colonne.
export const VENDEUR_STALL_STEPS = { j7: 7, j15: 15, j30: 30 } as const

export function daysAgo(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((today.getTime() - d.getTime()) / 86400000)
}