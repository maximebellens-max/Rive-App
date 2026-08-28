// Logique des tableaux Kanban (colonnes personnalisables, score de priorité des
// leads), reprise à l'identique du prototype Rive.

export const COLUMN_COLORS = ['slate', 'teal', 'sage', 'gold', 'success', 'brick', 'plum', 'sand'] as const
export type ColumnColor = (typeof COLUMN_COLORS)[number]

export const COLUMN_COLOR_HEX: Record<string, string> = {
  slate: '#64748b',
  teal: '#0f9b8e',
  sage: '#7c9a7e',
  gold: '#c99a3b',
  success: '#3f9142',
  brick: '#b8552f',
  plum: '#8a5a9e',
  sand: '#b79d75',
}

export const BOARD_TYPES = ['prospects', 'vendeur', 'acheteur', 'investisseur'] as const
export type BoardType = (typeof BOARD_TYPES)[number]

export const BOARD_LABELS: Record<BoardType, string> = {
  prospects: 'Prospects',
  vendeur: 'Vendeurs',
  acheteur: 'Acheteurs',
  investisseur: 'Investisseurs',
}

export const CATEGORY_LABEL: Record<string, string> = {
  acheteur: 'Acheteur',
  vendeur: 'Vendeur',
  investisseur: 'Investisseur',
}

export function nextColumnColor(usedCount: number): ColumnColor {
  return COLUMN_COLORS[usedCount % COLUMN_COLORS.length]
}

export type LeadScoreInput = {
  budget: number | null
  financement: string | null
  critere_lieu: string | null
  phone: string | null
  action_date: string | null
  created_at: string
  last_history_date: string | null
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((today.getTime() - d.getTime()) / 86400000)
}

// Score pondéré 0-100 : "qui appeler en premier" — repris à l'identique du prototype.
export function leadPriorityScore(lead: LeadScoreInput): number {
  let score = 0
  if (lead.budget) score += 15
  if (lead.financement === 'Validé') score += 20
  else if (lead.financement === 'En cours') score += 8
  if (lead.critere_lieu) score += 10
  if (lead.phone) score += 5

  if (lead.action_date) {
    const diff = daysSince(lead.action_date)
    if (diff > 0) score += 25 // en retard
    else if (diff >= -3) score += 15 // dans les 3 jours
  }

  const createdDays = daysSince(lead.created_at)
  if (createdDays <= 2) score += 15
  else if (createdDays <= 7) score += 8

  if (lead.last_history_date) {
    const histDays = daysSince(lead.last_history_date)
    if (histDays <= 2) score += 10
  }

  return Math.max(0, Math.min(100, score))
}

export type PriorityTier = 'chaud' | 'tiede' | 'froid'

export function priorityTier(score: number): PriorityTier {
  if (score >= 70) return 'chaud'
  if (score >= 40) return 'tiede'
  return 'froid'
}

export const PRIORITY_TIER_LABEL: Record<PriorityTier, string> = {
  chaud: '🔥 Chaud',
  tiede: '🌤 Tiède',
  froid: '❄️ Froid',
}

export const PRIORITY_TIER_CLASS: Record<PriorityTier, string> = {
  chaud: 'bg-red-50 text-red-700 border-red-200',
  tiede: 'bg-amber-50 text-amber-700 border-amber-200',
  froid: 'bg-sky-50 text-sky-700 border-sky-200',
}

// Une colonne dont le nom évoque un rendez-vous ("rdv", "rendez-vous", "visite")
// déclenche l'ouverture automatique de la fiche du prospect quand une carte y est
// déposée, pour inciter à saisir une date tout de suite.
export function columnSuggestsAppointment(name: string): boolean {
  const n = name.toLowerCase()
  return n.includes('rdv') || n.includes('rendez-vous') || n.includes('visite')
}
