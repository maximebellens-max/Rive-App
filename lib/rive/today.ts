// Logique de la vue "Aujourd'hui" (tableau de bord quotidien), reprise à
// l'identique du prototype Rive.

export type ActionBucket = 'overdue' | 'today' | 'upcoming' | null

// overdue si passé, today si aujourd'hui, upcoming si dans les 3 prochains jours.
export function actionBucket(dateStr: string | null): ActionBucket {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'today'
  if (diffDays <= 3) return 'upcoming'
  return null
}

export const RECONTACT_THRESHOLD_DAYS = 300
export const STALE_BIEN_THRESHOLD_DAYS = 60

export function daysAgo(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((today.getTime() - d.getTime()) / 86400000)
}
