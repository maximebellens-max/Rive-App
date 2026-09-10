-- Deux nouveaux champs texte pour deux nouveaux assistants IA :
-- - mandates.ai_listing : annonce immobilière rédigée par l'assistant IA
--   sur la fiche mandat (3 versions : courte, longue, réseau social).
-- - leads.ai_visit_report : compte-rendu structuré + message de suivi
--   suggéré, généré à partir de la dernière note brute de l'historique.
alter table mandates add column if not exists ai_listing text not null default '';
alter table leads add column if not exists ai_visit_report text not null default '';