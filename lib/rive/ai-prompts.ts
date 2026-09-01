// Assistant IA : génère un prompt structuré à copier-coller dans l'IA de ton
// choix ; sa réponse se colle ensuite dans le champ prévu, qui reste attaché
// à la fiche. Repris à l'identique du prototype Rive (3 usages).
import { CONDITION_LEVELS, FEATURE_KEYS, formatDate, formatEUR, rentalYield, type EstimationResult } from './mandates'

type MandateForBrief = {
  address: string
  property_type: string
  surface: number | null
  land_surface: number | null
  pieces: number | null
  condition: string
  dpe: string
  floor: number | null
  has_elevator: boolean
  features: Record<string, boolean> | null
  year_built: number | null
  recent_works: string
  estimated_rent: number | null
}

type Comparable = { address: string; sale_date: string | null; surface: number | null; price: number | null }

export function generateEstimationBrief(
  mandate: MandateForBrief,
  comparables: Comparable[],
  estimation: EstimationResult | null,
  matchingBuyersCount: number
): string {
  const conditionLabel = CONDITION_LEVELS.find((c) => c.value === mandate.condition)?.label || 'non renseigné'
  const featuresList = FEATURE_KEYS.filter((f) => mandate.features?.[f.key])
    .map((f) => f.label)
    .join(', ')
  const yieldPct = rentalYield(mandate.estimated_rent, estimation?.mid ?? null)

  const lines = [
    `Rédige un avis de valeur argumenté pour le bien suivant, à destination d'un propriétaire vendeur.`,
    ``,
    `Bien : ${mandate.property_type || 'non renseigné'}, ${mandate.address || 'adresse non renseignée'}`,
    `Surface : ${mandate.surface ?? '—'} m²${mandate.land_surface ? ` · Terrain : ${mandate.land_surface} m²` : ''} · Pièces : ${mandate.pieces ?? '—'}`,
    `État : ${conditionLabel} · DPE : ${mandate.dpe || '—'}`,
    `Étage : ${mandate.floor ?? '—'} ${mandate.has_elevator ? '(avec ascenseur)' : '(sans ascenseur)'}`,
    featuresList ? `Prestations : ${featuresList}` : null,
    mandate.year_built ? `Année de construction : ${mandate.year_built}` : null,
    mandate.recent_works ? `Travaux récents : ${mandate.recent_works}` : null,
    ``,
    estimation
      ? `Estimation calculée : ${formatEUR(estimation.mid)} (fourchette ${formatEUR(estimation.low)} — ${formatEUR(estimation.high)}), basée sur ${estimation.comparableCount} comparable(s) DVF.`
      : `Pas encore assez de données pour une estimation chiffrée.`,
    comparables.length
      ? `Comparables DVF :\n${comparables
          .map((c) => `- ${c.address || 'adresse non renseignée'} : ${formatEUR(c.price)} (${c.surface ?? '—'} m², vendu le ${formatDate(c.sale_date)})`)
          .join('\n')}`
      : null,
    yieldPct !== null ? `Rendement locatif estimé : ${yieldPct.toFixed(1)} %` : null,
    matchingBuyersCount > 0 ? `${matchingBuyersCount} acheteur(s) déjà en portefeuille correspondent à ce bien.` : null,
  ]

  return lines.filter(Boolean).join('\n')
}

type LeadForBriefing = {
  name: string
  category: string | null
  critere_lieu: string
  critere_type: string
  budget: number | null
  financement: string
  notes: string
  action_label: string
  action_date: string | null
}

type HistoryEntry = { entry_date: string; text: string }

export function generateBriefingBrief(lead: LeadForBriefing, history: HistoryEntry[]): string {
  const lastFive = history.slice(0, 5)
  const lines = [
    `Prépare un briefing court (5-6 lignes) et 1-2 questions utiles à poser avant mon prochain rendez-vous avec ce prospect.`,
    ``,
    `Nom : ${lead.name} (${lead.category || 'catégorie non renseignée'})`,
    `Secteur recherché : ${lead.critere_lieu || '—'} · Type : ${lead.critere_type || '—'}`,
    `Budget : ${lead.budget ? formatEUR(lead.budget) : '—'} · Financement : ${lead.financement || '—'}`,
    lead.notes ? `Notes : ${lead.notes}` : null,
    lastFive.length
      ? `Derniers échanges :\n${lastFive.map((h) => `- ${formatDate(h.entry_date)} : ${h.text}`).join('\n')}`
      : `Aucun échange enregistré pour l'instant.`,
    lead.action_label ? `Prochaine action prévue : ${lead.action_label} (${formatDate(lead.action_date)})` : null,
  ]

  return lines.filter(Boolean).join('\n')
}

export function generateRelanceBrief(leadName: string, address: string, daysSinceSale: number): string {
  return [
    `Rédige un court message (SMS ou email, chaleureux, pas commercial ni pressant) pour reprendre contact avec un ancien client.`,
    ``,
    `Nom : ${leadName}`,
    `Bien vendu : ${address || 'non renseigné'}`,
    `Vente conclue il y a ${daysSinceSale} jours, sans nouvelles depuis.`,
  ].join('\n')
}