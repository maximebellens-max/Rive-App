-- Jeton opaque par agence pour le flux ICS public abonnable (voir
-- app/api/ics/[token]/route.ts) — un calendrier externe (app Calendrier
-- iPhone, Google Agenda...) ne peut porter aucun en-tête d'authentification,
-- le jeton dans l'URL est le seul mécanisme de protection possible pour ce
-- type de flux. Généré automatiquement pour chaque agence existante.
alter table agencies add column if not exists ics_token uuid not null default gen_random_uuid();
create unique index if not exists agencies_ics_token_idx on agencies(ics_token);