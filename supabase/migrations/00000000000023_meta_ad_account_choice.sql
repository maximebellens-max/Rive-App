-- Le code supposait qu'une agence n'a qu'un seul compte publicitaire Meta
-- et prenait automatiquement le premier renvoyé par l'API, sans possibilité
-- de choisir — problème découvert avec Mandin, qui a accès à plusieurs
-- comptes publicitaires : Rive s'était connecté au mauvais, d'où "aucune
-- campagne trouvée" alors qu'une campagne active existe bien ailleurs.
-- On stocke désormais la liste complète des comptes disponibles à la
-- connexion, pour permettre de choisir le bon depuis Réglages sans avoir à
-- se reconnecter.
alter table meta_connections add column if not exists available_ad_accounts jsonb not null default '[]'::jsonb;