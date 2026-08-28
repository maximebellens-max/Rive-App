// Statistiques du tableau Commissions (repris à l'identique du prototype) :
// répartition mensuelle des mandats signés + taux de conversion.

export const MONTH_NAMES_FR = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
]

export type MonthBar = { month: string; label: string; count: number }

// Regroupe les mandats signés par mois (YYYY-MM de signed_date, ou created_at
// à défaut), sur les 6 derniers mois glissants.
export function monthlySignedCounts(mandates: { signed_date: string | null; created_at: string }[]): MonthBar[] {
  const counts: Record<string, number> = {}
  for (const m of mandates) {
    const d = m.signed_date || m.created_at
    if (!d) continue
    const key = d.slice(0, 7)
    counts[key] = (counts[key] || 0) + 1
  }

  const months: MonthBar[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push({
      month: key,
      label: `${MONTH_NAMES_FR[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      count: counts[key] || 0,
    })
  }
  return months
}

export function conversionRate(mandatesSignedCount: number, totalLeadsCount: number): number {
  if (!totalLeadsCount) return 0
  return Math.round((mandatesSignedCount / totalLeadsCount) * 100)
}
