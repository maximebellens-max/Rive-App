-- Alertes internes à l'équipe par WhatsApp (nouveau lead, rendez-vous du
-- jour, mandat proche de son échéance de préavis). Chaque membre de
-- l'agence renseigne son propre numéro et active/désactive les alertes
-- depuis Réglages — rien n'est envoyé à un client ici, uniquement en
-- interne (l'envoi de relances automatiques aux clients demande un
-- mécanisme de consentement RGPD séparé, pas encore construit).

alter table profiles add column if not exists whatsapp_number text not null default '';
alter table profiles add column if not exists whatsapp_alerts_enabled boolean not null default false;

-- Empêche un double envoi si le digest quotidien (cron Vercel) est
-- redéclenché le même jour : un même événement (rendez-vous ou mandat) n'est
-- notifié par WhatsApp qu'une seule fois par jour civil. Table interne, gérée
-- uniquement par la route /api/cron/daily-whatsapp avec le jeton de service
-- (aucune policy nécessaire côté client).
create table if not exists whatsapp_daily_alerts_sent (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  kind text not null check (kind in ('appointment', 'mandate_renewal')),
  entity_id uuid not null,
  alert_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (agency_id, kind, entity_id, alert_date)
);

alter table whatsapp_daily_alerts_sent enable row level security;