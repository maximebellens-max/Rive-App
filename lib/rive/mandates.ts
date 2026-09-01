// Logique métier des mandats, reprise à l'identique du prototype Rive
// (barème d'honoraires, échéance de renouvellement, moteur d'estimation).

export const CONDITION_LEVELS = [
  { value: 'a_rafraichir', label: 'À rafraîchir', coeff: -0.08 },
  { value: 'bon_etat', label: 'Bon état', coeff: 0 },
  { value: 'renove', label: 'Rénové', coeff: 0.05 },
  { value: 'neuf', label: 'Neuf', coeff: 0.1 },
] as const

export const DPE_LEVELS = [
  { value: 'A', coeff: 0.03 },
  { value: 'B', coeff: 0.02 },
  { value: 'C', coeff: 0 },
  { value: 'D', coeff: 0 },
  { value: 'E', coeff: -0.02 },
  { value: 'F', coeff: -0.05 },
  { value: 'G', coeff: -0.08 },
] as const

export const PROPERTY_TYPES = [
  'Appartement',
  'Maison',
  'Terrain',
  'Immeuble',
  'Local commercial',
  'Parking / Box',
  'Autre',
] as const

export const FEATURE_KEYS = [
  { key: 'balcon', label: 'Balcon' },
  { key: 'terrasse', label: 'Terrasse' },
  { key: 'jardin', label: 'Jardin' },
  { key: 'cave', label: 'Cave' },
  { key: 'garage', label: 'Garage' },
  { key: 'box', label: 'Box' },
  { key: 'dependance', label: 'Dépendance' },
] as const

export type Features = Partial<Record<(typeof FEATURE_KEYS)[number]['key'], boolean>>

// Barème d'honoraires : 5% jusqu'à 800k€, 4% au-delà, plancher 10 000€.
export function feeForPrice(price: number | null | undefined): number {
  if (!price) return 0
  const rate = price <= 800000 ? 0.05 : 0.04
  return Math.max(price * rate, 10000)
}

export function netVendeur(price: number | null | undefined, remainingLoan: number | null | undefined): number | null {
  if (!price) return null
  return price - feeForPrice(price) - (remainingLoan || 0)
}

export function exclusivityLabel(v: string | null | undefined): string {
  if (v === 'exclusif') return 'Exclusif'
  if (v === 'simple') return 'Simple'
  return ''
}

// Date de fin de mandat = date de signature + durée en mois.
export function mandateEndDate(signedDate: string | null, durationMonths: number | null): Date | null {
  if (!signedDate || !durationMonths) return null
  const d = new Date(signedDate)
  d.setMonth(d.getMonth() + durationMonths)
  return d
}

// Date à laquelle se positionner pour ne pas subir la reconduction tacite
// (par défaut 15 jours avant l'échéance si non renseigné, 0 accepté explicitement).
export function mandateNoticeDate(
  signedDate: string | null,
  durationMonths: number | null,
  renewalNoticeDays: number | null
): Date | null {
  const end = mandateEndDate(signedDate, durationMonths)
  if (!end) return null
  const days = renewalNoticeDays || renewalNoticeDays === 0 ? renewalNoticeDays : 15
  const d = new Date(end)
  d.setDate(d.getDate() - (days ?? 15))
  return d
}

export type Urgency = 'overdue' | 'soon' | 'ok' | 'none'

export function dateUrgency(date: Date | null): Urgency {
  if (!date) return 'none'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 3) return 'soon'
  return 'ok'
}

export function mandateIsActive(stage: string | null | undefined): boolean {
  return stage !== 'vendu'
}

export type DvfComparable = { address: string; sale_date: string | null; surface: number | null; price: number | null }

export function dvfComparableStats(list: DvfComparable[]) {
  // Une même vente ne doit compter qu'une fois : deux entrées avec la même
  // adresse, la même date, le même prix et la même surface sont
  // très probablement la même transaction saisie deux fois (double ajout, ou
  // plusieurs lots DVF d'une même mutation ajoutés séparément) — les compter
  // chacune fausserait la moyenne exactement comme les doublons déjà
  // filtrés à la source côté recherche DVF automatique.
  const seen = new Set<string>()
  const deduped = list.filter((c) => {
    const key = `${c.address}|${c.sale_date}|${c.price}|${c.surface}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const priced = deduped.filter((c) => c.surface && c.price)
  if (!priced.length) return null
  const pricesPerM2 = priced.map((c) => (c.price as number) / (c.surface as number))
  const avg = pricesPerM2.reduce((a, b) => a + b, 0) / pricesPerM2.length
  return {
    count: priced.length,
    avg: Math.round(avg),
    min: Math.round(Math.min(...pricesPerM2)),
    max: Math.round(Math.max(...pricesPerM2)),
  }
}

export type EstimationInput = {
  dvfComparables: DvfComparable[]
  surface: number | null
  condition: string | null
  dpe: string | null
  floor: number | null
  hasElevator: boolean | null
  features: Features | null
  manualAdjustmentPct?: number | null
  manualAdjustmentNote?: string | null
}

export type EstimationCoefficientLine = { label: string; coeff: number }

export type EstimationResult = {
  baseM2: number
  comparableCount: number
  lines: EstimationCoefficientLine[]
  totalCoeff: number
  adjustedM2: number
  mid: number
  low: number
  high: number
}

export function estimationEngine(input: EstimationInput): EstimationResult | null {
  const stats = dvfComparableStats(input.dvfComparables)
  if (!stats || !input.surface) return null

  const lines: EstimationCoefficientLine[] = []

  const conditionLevel = CONDITION_LEVELS.find((c) => c.value === input.condition)
  if (conditionLevel) lines.push({ label: `État : ${conditionLevel.label}`, coeff: conditionLevel.coeff })

  const dpeLevel = DPE_LEVELS.find((d) => d.value === input.dpe)
  if (dpeLevel) lines.push({ label: `DPE ${dpeLevel.value}`, coeff: dpeLevel.coeff })

  if (input.floor !== null && input.floor >= 3 && !input.hasElevator) {
    lines.push({ label: 'Étage élevé sans ascenseur', coeff: -0.03 })
  }

  const featureCount = FEATURE_KEYS.filter((f) => input.features?.[f.key]).length
  if (featureCount > 0) {
    const coeff = Math.min(featureCount * 0.01, 0.06)
    lines.push({ label: `Prestations (${featureCount})`, coeff })
  }

  // Correction manuelle de l'agent (ex. terrain nettement plus grand que les
  // comparables, vue dégagée, nuisance...) — vient s'ajouter aux coefficients
  // automatiques plutôt que les remplacer, pour rester traçable.
  if (input.manualAdjustmentPct) {
    lines.push({
      label: input.manualAdjustmentNote ? `Ajustement manuel : ${input.manualAdjustmentNote}` : 'Ajustement manuel',
      coeff: input.manualAdjustmentPct / 100,
    })
  }

  const totalCoeff = lines.reduce((sum, l) => sum + l.coeff, 0)
  const adjustedM2 = Math.round(stats.avg * (1 + totalCoeff))
  const mid = Math.round(adjustedM2 * input.surface)

  return {
    baseM2: stats.avg,
    comparableCount: stats.count,
    lines,
    totalCoeff,
    adjustedM2,
    mid,
    low: Math.round(mid * 0.95),
    high: Math.round(mid * 1.05),
  }
}

export function rentalYield(estimatedRent: number | null, price: number | null): number | null {
  if (!estimatedRent || !price) return null
  return Math.round(((estimatedRent * 12) / price) * 1000) / 10
}

export function formatEURCompact(n: number): string {
  if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)} k€`
  return `${Math.round(n)} €`
}

export function formatEUR(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export function formatDate(d: Date | string | null): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
}