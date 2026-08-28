// Suivi de diffusion (portails + campagnes pub) et statuts d'offre, repris à
// l'identique du prototype Rive.
export const DIFFUSION_PORTALS = ['Leboncoin', 'Bienici', 'SeLoger', 'Logic-Immo', 'PAP', 'Site web agence'] as const
export const AD_PLATFORMS = ['Meta Ads', 'Google Ads', 'Meta Ads + Google Ads'] as const

export const OFFER_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Acceptée',
  rejected: 'Refusée',
}

// Date de mise en avant la plus ancienne (première diffusion portail ou
// lancement de campagne), avec repli sur la date de signature si aucune
// diffusion n'est encore renseignée.
export function earliestPromotionDate(
  diffusion: Record<string, string> | null,
  adDate: string | null,
  signedDate: string | null
): string | null {
  const dates = [...(diffusion ? Object.values(diffusion).filter(Boolean) : []), adDate].filter(Boolean) as string[]
  if (dates.length) return dates.sort()[0]
  return signedDate
}
