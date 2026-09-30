-- Fondations pour la commercialisation à d'autres agences : identité de
-- l'abonnement sur `agencies` (paliers, statut, lien Stripe à venir) et un
-- compteur d'usage mensuel par agence pour les 2 ressources les plus
-- coûteuses/partagées aujourd'hui (appels IA Claude, envois WhatsApp) — voir
-- lib/rive/billing/. Aucun paiement réel n'est branché à ce stade : c'est
-- la mécanique (paliers + compteurs) qui est posée, pas les chiffres
-- (prix, limites exactes), volontairement provisoires dans le code tant
-- qu'ils n'ont pas été validés avec de premiers agents indépendants.

alter table agencies add column if not exists plan text not null default 'solo'
  check (plan in ('solo', 'equipe', 'agence', 'interne'));
alter table agencies add column if not exists subscription_status text not null default 'trialing'
  check (subscription_status in ('trialing', 'active', 'past_due', 'canceled', 'internal'));
alter table agencies add column if not exists trial_ends_at timestamptz default (now() + interval '30 days');
alter table agencies add column if not exists stripe_customer_id text;
alter table agencies add column if not exists stripe_subscription_id text;

comment on column agencies.plan is 'Palier d''abonnement — voir lib/rive/billing/plans.ts pour ce que chaque palier autorise. ''interne'' = agence fondatrice (Hevrest), jamais limitée.';
comment on column agencies.subscription_status is 'Statut Stripe simplifié. ''internal'' = agence fondatrice, hors cycle de facturation.';

-- Les agences déjà existantes à ce jour (Hevrest) sont les fondatrices du
-- produit, pas des clientes payantes : jamais limitées, pas de compte à
-- rebours d'essai. Toute NOUVELLE agence créée après cette migration part
-- en revanche sur les valeurs par défaut ci-dessus (palier 'solo', essai de
-- 30 jours) — voir le trigger handle_new_user (migration 00000000000011).
update agencies set plan = 'interne', subscription_status = 'internal', trial_ends_at = null;

-- ---------- compteur d'usage mensuel ----------
create table if not exists usage_counters (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  -- Format 'YYYY-MM' plutôt qu'une vraie date : un compteur par mois civil,
  -- jamais de bornes d'heure/fuseau à gérer pour l'incrémenter.
  month text not null,
  ai_generations_count integer not null default 0,
  whatsapp_messages_count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (agency_id, month)
);

create index if not exists usage_counters_agency_idx on usage_counters (agency_id);

alter table usage_counters enable row level security;

-- Lecture seule pour l'agence elle-même (utile le jour où on affiche l'usage
-- du mois dans Réglages) — l'écriture reste réservée au client admin
-- (service role), voir lib/rive/billing/usage.ts, même principe que
-- whatsapp_daily_alerts_sent / lead_relance_state (migrations 20 et 27).
drop policy if exists "usage_counters: select own agency" on usage_counters;
create policy "usage_counters: select own agency" on usage_counters for select using (agency_id = current_agency_id());