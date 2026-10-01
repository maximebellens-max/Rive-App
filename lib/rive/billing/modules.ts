// Modules optionnels, vendus en plus d'un palier plutôt qu'inclus dedans
// (voir migration 058). Pour l'instant un seul : le volet investissement
// (tableau Investisseurs France + /dashboard/investments), à 50 €/mois,
// activé au cas par cas depuis /dashboard/admin après une vente — pas de
// parcours d'achat en libre-service pour l'instant (voir
// deploy-notes/rive-commercialisation-grille-tarifaire.md).
export const AGENCY_MODULES = ['investissement'] as const
export type AgencyModule = (typeof AGENCY_MODULES)[number]

export const MODULE_LABELS: Record<AgencyModule, string> = {
  investissement: 'Investissement',
}

export function isAgencyModule(value: string): value is AgencyModule {
  return (AGENCY_MODULES as readonly string[]).includes(value)
}