-- Chaque agent a désormais son propre lien d'agenda abonnable (voir
-- app/api/ics/agent/[token]/route.ts), distinct du lien partagé de l'agence
-- (agencies.ics_token, qui reste en place pour la route existante mais
-- n'est plus proposé dans Réglages) — pour que le calendrier iPhone de
-- chacun n'affiche que ses propres rendez-vous, pas ceux de toute l'équipe.
alter table profiles add column if not exists ics_token uuid not null default gen_random_uuid();
create unique index if not exists profiles_ics_token_idx on profiles (ics_token);