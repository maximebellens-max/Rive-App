-- Notifications push (Web Push API), partie 2 de l'appli installable (PWA)
-- — voir public/sw.js et app/dashboard/_components/install-prompt.tsx pour
-- la partie 1 (installabilité seule). Deux ajouts :
--
-- 1. push_subscriptions : un agent peut avoir plusieurs abonnements (un par
--    appareil/navigateur où il a cliqué "Activer les notifications" dans
--    Réglages, voir app/actions/push.ts). Chaque ligne correspond à un
--    "PushSubscription" du navigateur (endpoint + clés de chiffrement).
--    Données personnelles à cet agent : RLS restreint chaque agent à ses
--    propres abonnements, contrairement aux tableaux partagés de l'agence.
-- 2. profiles.push_prefs : préférences d'activation par type de
--    notification (16 types, voir lib/rive/push-types.ts). Absence d'une
--    clé = activée (permet "tout activé par défaut" sans avoir à écrire 16
--    lignes en base pour chaque agent existant à chaque nouveau type ajouté
--    plus tard).
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions: select own" on push_subscriptions
  for select using (profile_id = auth.uid());
create policy "push_subscriptions: insert own" on push_subscriptions
  for insert with check (profile_id = auth.uid() and agency_id = current_agency_id());
-- Utile pour le upsert onConflict('endpoint') de subscribeToPush (voir
-- app/actions/push.ts) : réactiver l'app sur un appareil déjà abonné (même
-- endpoint) met juste à jour la ligne existante au lieu d'échouer.
create policy "push_subscriptions: update own" on push_subscriptions
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "push_subscriptions: delete own" on push_subscriptions
  for delete using (profile_id = auth.uid());

alter table profiles add column if not exists push_prefs jsonb not null default '{}'::jsonb;