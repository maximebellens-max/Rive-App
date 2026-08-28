// Sauvegarde / restauration complète des données d'une agence, au format
// JSON — équivalent du "Exporter mes données" / "Importer une sauvegarde"
// du prototype (qui dumpait tout le state en mémoire). Ici les tables sont
// de vraies tables Postgres isolées par agence via RLS.
//
// Ordre important : INSERT_ORDER va des tables parentes vers les tables
// enfants (respecte les clés étrangères) ; DELETE_ORDER est l'inverse.

export const BACKUP_VERSION = 1

export const INSERT_ORDER = [
  'leads',
  'lead_history_entries',
  'mandates',
  'dvf_comparables',
  'mandate_parties',
  'commissions',
  'pipeline_columns',
  'partners',
  'message_templates',
  'mandate_visits',
  'mandate_offers',
  'seen_match_pairs',
] as const

export const DELETE_ORDER = [...INSERT_ORDER].reverse()

export type BackupTableName = (typeof INSERT_ORDER)[number]

export type RiveBackup = {
  version: number
  exportedAt: string
  agency: Record<string, unknown> | null
  tables: Partial<Record<BackupTableName, Record<string, unknown>[]>>
}

export function isRiveBackup(value: unknown): value is RiveBackup {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.version === 'number' && typeof v.tables === 'object' && v.tables !== null
}
