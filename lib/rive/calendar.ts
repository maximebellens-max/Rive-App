// Aides de date pour la grille mensuelle de l'Agenda — repris à l'identique
// de la logique du prototype (semaine commençant le lundi).

export const MONTH_FULL_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]

export const DOW_LABELS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

// 0 = lundi ... 6 = dimanche (JS renvoie 0 = dimanche par défaut).
export function firstWeekdayMonday0(year: number, month: number): number {
  const jsDay = new Date(year, month, 1).getDay()
  return (jsDay + 6) % 7
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function dateStrOf(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}
