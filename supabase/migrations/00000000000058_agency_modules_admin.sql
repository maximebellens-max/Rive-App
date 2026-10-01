-- Modules optionnels par agence (ex. "investissement") + accès
-- administrateur plateforme (toi seul, pas Mandin).
--
-- Contexte : décision commerciale du 2026-10 — tous les paliers payants
-- donnent un accès identique au cœur du produit, sauf deux choses qui
-- restent volontairement hors de ce qui est vendu : la génération de
-- mandats/documents juridiques (verrouillée ailleurs sur `agencies.plan =
-- 'interne'`, donc aucune colonne nécessaire ici) et le module
-- investissement, vendu en option (50 €/mois) plutôt qu'inclus d'office.
-- enabled_modules porte cette 2e liste, activée/désactivée agence par
-- agence depuis la page admin plutôt que liée à un palier Stripe.

alter table agencies
  add column enabled_modules text[] not null default '{}';

comment on column agencies.enabled_modules is
  'Modules optionnels activés pour cette agence (ex. investissement). Une agence interne (Hevrest) a de toute façon accès à tout — ce champ ne sert qu''aux agences clientes.';

alter table profiles
  add column is_platform_admin boolean not null default false;

comment on column profiles.is_platform_admin is
  'Accès à /dashboard/admin (gestion des modules par agence). Réservé à un seul profil (Maxime) — volontairement pas lié au rôle owner, qui existe aussi pour Mandin sur la même agence Hevrest.';

-- Active l'accès admin pour le seul profil concerné. Sans effet (0 ligne
-- mise à jour) si ce compte n'existe pas encore sur cet environnement —
-- à réappliquer manuellement le cas échéant plutôt que de bloquer la
-- migration.
update profiles
set is_platform_admin = true
where id = (select id from auth.users where email = 'maxime.bellens@hevrest.com');