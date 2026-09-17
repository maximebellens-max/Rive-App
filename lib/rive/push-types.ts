// Catalogue des types de notification push — 16 types au total, un par
// événement métier existant (mêmes déclencheurs que les alertes WhatsApp,
// voir lib/rive/whatsapp-notify.ts), avec les 3 tableaux de suivi chantier
// (Ameublement/Cuisine/Travaux) gardés séparés plutôt que groupés sous un
// seul "Chantiers" — chaque agent doit pouvoir suivre un chantier sans
// s'abonner aux deux autres. Fichier sans dépendance serveur (pas de
// Supabase, pas de 'web-push') : importable tel quel depuis un composant
// client (Réglages) comme depuis le serveur (lib/rive/push-notify.ts).
export const PUSH_TYPES = [
  'nouveau_prospect',
  'rdv_jour',
  'echeance_mandat',
  'priorites_jour',
  'rapprochement',
  'relance_sans_reponse',
  'relance_anniversaire_vente',
  'relance_anniversaire_client',
  'relance_avis_google',
  'relance_estimation',
  'relance_vendeur_bloque',
  'voeux_fin_annee',
  'rapport_hebdo',
  'chantier_ameublement',
  'chantier_cuisine',
  'chantier_travaux',
] as const

export type PushType = (typeof PUSH_TYPES)[number]

export const PUSH_TYPE_LABELS: Record<PushType, string> = {
  nouveau_prospect: 'Nouveau prospect',
  rdv_jour: 'Rendez-vous du jour',
  echeance_mandat: 'Échéance de mandat',
  priorites_jour: 'Priorités du jour',
  rapprochement: 'Rapprochement acheteur / bien',
  relance_sans_reponse: 'Relance — prospect sans réponse',
  relance_anniversaire_vente: 'Relance — anniversaire de vente/achat',
  relance_anniversaire_client: 'Relance — anniversaire du client',
  relance_avis_google: "Relance — demande d'avis Google",
  relance_estimation: 'Relance — estimation sans suite',
  relance_vendeur_bloque: 'Relance — vendeur bloqué',
  voeux_fin_annee: "Vœux de fin d'année",
  rapport_hebdo: 'Rapport hebdomadaire',
  chantier_ameublement: 'Chantier — Ameublement',
  chantier_cuisine: 'Chantier — Cuisine',
  chantier_travaux: 'Chantier — Travaux',
}

// Purement pour l'affichage dans Réglages (regrouper les 16 cases sous des
// en-têtes plutôt qu'une liste plate) — sans effet sur l'envoi.
export const PUSH_TYPE_GROUPS: { label: string; types: PushType[] }[] = [
  {
    label: 'Prospects & mandats',
    types: ['nouveau_prospect', 'rdv_jour', 'echeance_mandat', 'priorites_jour', 'rapprochement'],
  },
  {
    label: 'Relances automatiques',
    types: [
      'relance_sans_reponse',
      'relance_anniversaire_vente',
      'relance_anniversaire_client',
      'relance_avis_google',
      'relance_estimation',
      'relance_vendeur_bloque',
    ],
  },
  {
    label: 'Suivi chantiers',
    types: ['chantier_ameublement', 'chantier_cuisine', 'chantier_travaux'],
  },
  {
    label: 'Synthèses d’équipe',
    types: ['voeux_fin_annee', 'rapport_hebdo'],
  },
]

// Absence d'une clé dans push_prefs = notification activée — c'est ce qui
// permet "tout activé par défaut à l'installation" (voir migration 051)
// sans avoir à initialiser 16 clés pour chaque agent existant.
export function isPushTypeEnabled(prefs: Record<string, unknown> | null | undefined, type: PushType): boolean {
  if (!prefs) return true
  return prefs[type] !== false
}