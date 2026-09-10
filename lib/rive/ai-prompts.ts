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

type MandateForListing = MandateForBrief & { price: number | null }

// Annonce prête à publier (portails + réseaux sociaux), à partir des mêmes
// données déjà saisies pour l'avis de valeur — pas de ressaisie.
export function generateListingBrief(mandate: MandateForListing): string {
  const conditionLabel = CONDITION_LEVELS.find((c) => c.value === mandate.condition)?.label || 'non renseigné'
  const featuresList = FEATURE_KEYS.filter((f) => mandate.features?.[f.key])
    .map((f) => f.label)
    .join(', ')

  const lines = [
    `Rédige 3 versions d'annonce immobilière pour ce bien, prêtes à publier :`,
    `1. Une version courte (environ 400 caractères, titre + texte percutant) pour les portails (SeLoger, LeBonCoin, PAP).`,
    `2. Une version longue et détaillée, mettant en avant tous les atouts réels du bien sans exagération.`,
    `3. Une accroche très courte (1-2 phrases) pour une story ou un post réseau social.`,
    ``,
    `Bien : ${mandate.property_type || 'non renseigné'}, ${mandate.address || 'adresse non renseignée'}`,
    mandate.price ? `Prix : ${formatEUR(mandate.price)}` : null,
    `Surface : ${mandate.surface ?? '—'} m²${mandate.land_surface ? ` · Terrain : ${mandate.land_surface} m²` : ''} · Pièces : ${mandate.pieces ?? '—'}`,
    `État : ${conditionLabel} · DPE : ${mandate.dpe || '—'}`,
    `Étage : ${mandate.floor ?? '—'} ${mandate.has_elevator ? '(avec ascenseur)' : '(sans ascenseur)'}`,
    featuresList ? `Prestations : ${featuresList}` : null,
    mandate.year_built ? `Année de construction : ${mandate.year_built}` : null,
    mandate.recent_works ? `Travaux récents : ${mandate.recent_works}` : null,
    ``,
    `Ton chaleureux et vendeur mais honnête, sans superlatifs excessifs ni promesses non vérifiables, en français.`,
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

// Structure la dernière note brute de l'historique (prise à la volée après
// un RDV/appel) en compte-rendu clair + un message de suivi suggéré —
// n'écrase jamais la note brute d'origine, s'enregistre à part.
export function generateVisitReportBrief(leadName: string, rawNote: string, noteDate: string): string {
  return [
    `Voici une note brute prise après un rendez-vous ou un appel avec un prospect. Transforme-la en :`,
    `1. Un compte-rendu structuré et clair (points forts relevés, points de vigilance, niveau d'intérêt perçu).`,
    `2. Un message de suivi court à envoyer ensuite au prospect (chaleureux, pas commercial).`,
    ``,
    `Nom : ${leadName}`,
    `Date de la note : ${formatDate(noteDate)}`,
    `Note brute : ${rawNote}`,
  ].join('\n')
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

// Les 4 fonctions ci-dessous alimentent l'agent de relance automatique (voir
// lib/rive/relance-agent.ts) : chacune génère un brouillon prêt à envoyer,
// jamais envoyé directement au client — toujours relayé à l'agent par
// WhatsApp pour validation manuelle (voir la note RGPD dans relance-agent.ts).

const RELANCE_STEP_LABEL: Record<'j3' | 'j7' | 'j14', string> = {
  j3: '3 jours',
  j7: '1 semaine',
  j14: '2 semaines',
}

export function generateNoResponseRelanceBrief(leadName: string, step: 'j3' | 'j7' | 'j14', daysSince: number): string {
  return [
    `Rédige un très court message (SMS, ton pro et chaleureux, jamais insistant) pour relancer un prospect qui n'a donné aucun signe depuis sa demande initiale.`,
    ``,
    `Nom : ${leadName}`,
    `Sans nouvelles depuis ${daysSince} jours (${RELANCE_STEP_LABEL[step]} depuis le dernier point de contact).`,
    step === 'j14'
      ? `C'est la 3e et dernière relance de cette séquence : reste léger, propose une dernière fois un échange rapide sans donner l'impression d'insister.`
      : null,
  ]
    .filter(Boolean)
    .join('\n')
}

const VENDEUR_STALL_STEP_LABEL: Record<'j7' | 'j15' | 'j30', string> = {
  j7: '1 semaine',
  j15: '2 semaines',
  j30: '1 mois',
}

// Vendeur dont le 2e RDV (estimation) a eu lieu mais qui n'a toujours pas
// signé de mandat — étape "RDV 2 finalisé" du tableau Vendeurs.
export function generateVendeurStallBrief(leadName: string, step: 'j7' | 'j15' | 'j30', daysSince: number): string {
  return [
    `Rédige un court message professionnel, pas pressant, pour relancer un propriétaire dont le rendez-vous d'estimation a eu lieu mais qui n'a toujours pas signé de mandat de vente, en proposant un échange pour faire le point.`,
    ``,
    `Nom : ${leadName}`,
    `RDV d'estimation terminé depuis ${daysSince} jours (${VENDEUR_STALL_STEP_LABEL[step]}), toujours sans mandat signé.`,
    step === 'j30'
      ? `Ça fait un mois : reste factuel et propose franchement de faire le point, sans donner l'impression d'insister.`
      : null,
  ]
    .filter(Boolean)
    .join('\n')
}

export function generateAnniversaryBrief(leadName: string, address: string, years: number, category: string | null): string {
  const isVendeur = category === 'vendeur'
  return [
    `Rédige un court message chaleureux (SMS ou email, pas commercial) pour marquer l'anniversaire d'une transaction immobilière avec un ancien client.`,
    ``,
    `Nom : ${leadName}`,
    `Bien ${isVendeur ? 'vendu' : 'acheté'} : ${address || 'non renseigné'}`,
    `Il y a ${years} an${years > 1 ? 's' : ''} jour pour jour.`,
  ].join('\n')
}

export function generateBirthdayBrief(leadName: string): string {
  return [
    `Rédige un très court message d'anniversaire, chaleureux et personnel, sans aucun ton commercial, pour un client de l'agence.`,
    ``,
    `Nom : ${leadName}`,
  ].join('\n')
}

export function generateYearEndWishesBrief(): string {
  return [
    `Rédige un message de vœux de fin d'année, chaleureux et professionnel, à envoyer à l'ensemble des prospects et clients d'une agence immobilière (Hevrest, bassin genevois / Annecy).`,
    `Assez court pour un SMS ou WhatsApp, sans mention de nom spécifique (il sera envoyé tel quel à toute la liste de diffusion).`,
  ].join('\n')
}

export function generateGoogleReviewBrief(leadName: string, address: string, daysSince: number): string {
  return [
    `Rédige un court message chaleureux pour demander un avis Google (ou une recommandation) à un client dont la transaction vient d'être conclue, sans être insistant.`,
    ``,
    `Nom : ${leadName}`,
    `Bien : ${address || 'non renseigné'}`,
    `Transaction conclue il y a ${daysSince} jours.`,
  ].join('\n')
}

export function generateEstimationFollowupBrief(leadName: string, address: string, daysSince: number): string {
  return [
    `Rédige un court message professionnel, pas pressant, pour relancer un propriétaire qui a reçu une estimation mais n'a pas encore donné suite (pas de mandat signé), en proposant un échange pour en discuter.`,
    ``,
    `Nom : ${leadName}`,
    `Bien estimé : ${address || 'non renseigné'}`,
    `Estimation réalisée il y a ${daysSince} jours, sans suite depuis.`,
  ].join('\n')
}

// Rapport hebdomadaire automatique (voir lib/rive/weekly-report.ts) : synthèse
// factuelle envoyée par WhatsApp à l'équipe chaque lundi matin.
export function generateWeeklyReportBrief(stats: {
  weekLabel: string
  newLeadsCount: number
  newLeadsByCategory: Record<string, number>
  mandatesSignedCount: number
  mandatesSoldCount: number
  soldVolume: number
}): string {
  const categoryLines = Object.entries(stats.newLeadsByCategory)
    .map(([label, count]) => `${label} : ${count}`)
    .join(', ')
  return [
    `Rédige un court message WhatsApp de synthèse hebdomadaire pour une agence immobilière (Hevrest, bassin genevois / Annecy), à destination de l'équipe (2 agents, ce sont des frères). Ton professionnel, factuel, chaleureux sans excès, en français. Reste sobre et honnête, pas de superlatifs si les chiffres sont faibles.`,
    ``,
    `Semaine du ${stats.weekLabel}.`,
    `Nouveaux prospects : ${stats.newLeadsCount}${categoryLines ? ` (${categoryLines})` : ''}`,
    `Mandats signés : ${stats.mandatesSignedCount}`,
    `Ventes conclues : ${stats.mandatesSoldCount}${stats.soldVolume ? ` pour un volume total de ${formatEUR(stats.soldVolume)}` : ''}`,
  ].join('\n')
}