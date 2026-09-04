-- Branche le moteur de rapprochement acheteur ↔ bien (lib/rive/matching.ts)
-- sur les notifications : jusqu'ici un nouveau rapprochement n'était visible
-- que passivement, en allant consulter la vue Aujourd'hui. Désormais, dès
-- qu'un lead ou un mandat est créé/modifié et qu'un NOUVEAU rapprochement
-- apparaît, toute l'agence est prévenue (cloche + email).

-- Permet de lier une notification à un mandat (rapprochement vu depuis la
-- fiche bien) en plus d'un lead — les alertes Meta existantes n'utilisaient
-- que lead_id.
alter table notifications add column if not exists mandate_id uuid references mandates(id) on delete set null;

-- Les notifications de rapprochement sont créées depuis les Server Actions
-- (session utilisateur normale), contrairement aux alertes Meta créées par
-- le webhook avec le jeton de service : il faut donc une policy d'insertion,
-- absente jusqu'ici puisqu'inutile.
drop policy if exists "notifications: insert own agency" on notifications;
create policy "notifications: insert own agency" on notifications for insert with check (agency_id = current_agency_id());

-- Suivi des rapprochements déjà notifiés, pour ne jamais alerter deux fois la
-- même paire lead/bien. Séparé de seen_match_pairs (qui suit ce qui a été
-- *consulté* sur la vue Aujourd'hui — un état différent : une paire peut être
-- notifiée puis seulement vue plus tard sur cette vue, ou jamais).
create table if not exists notified_match_pairs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  mandate_id uuid not null references mandates(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (lead_id, mandate_id)
);

create index if not exists notified_match_pairs_agency_idx on notified_match_pairs (agency_id);

alter table notified_match_pairs enable row level security;

drop policy if exists "notified_match_pairs: select own agency" on notified_match_pairs;
drop policy if exists "notified_match_pairs: insert own agency" on notified_match_pairs;
drop policy if exists "notified_match_pairs: delete own agency" on notified_match_pairs;

create policy "notified_match_pairs: select own agency" on notified_match_pairs for select using (agency_id = current_agency_id());
create policy "notified_match_pairs: insert own agency" on notified_match_pairs for insert with check (agency_id = current_agency_id());
create policy "notified_match_pairs: delete own agency" on notified_match_pairs for delete using (agency_id = current_agency_id());