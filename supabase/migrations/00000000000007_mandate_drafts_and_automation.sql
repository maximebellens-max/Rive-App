-- Brouillons de mandat : créés automatiquement quand un lead vendeur/investisseur
-- atteint l'étape "estimation" de son pipeline, invisibles du tableau des mandats
-- tant qu'ils ne sont pas activés (signature).
alter table mandates add column if not exists is_draft boolean not null default false;
create index if not exists mandates_lead_id_draft_idx on mandates (lead_id, is_draft);
