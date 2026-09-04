-- Permet de trier les campagnes par ordre chronologique (les plus récentes
-- en premier) en plus de mettre les campagnes actives en priorité — Meta
-- fournit cette date via le champ "created_time" de l'API Marketing.
alter table meta_campaigns add column if not exists created_time timestamptz;