-- Index de performance manquants, repérés en investiguant la latence
-- ressentie sur l'app : lead_history_entries n'avait qu'un index sur
-- lead_id, alors que la RLS filtre systématiquement par agency_id (et la
-- page "Aujourd'hui" charge la table entière sans autre filtre) — ce qui
-- forçait un balayage complet de la table à chaque chargement.

create index if not exists lead_history_entries_agency_id_idx on lead_history_entries (agency_id);
create index if not exists boards_agency_kind_idx on boards (agency_id, kind, position);
create index if not exists agency_invites_agency_email_idx on agency_invites (agency_id, email);
