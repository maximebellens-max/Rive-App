-- Suivi des rapprochements acheteur ↔ bien déjà vus, pour que le widget
-- "Nouveaux rapprochements" de la vue Aujourd'hui ne réaffiche que les
-- correspondances jamais consultées.
create table if not exists seen_match_pairs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  mandate_id uuid not null references mandates(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (lead_id, mandate_id)
);

create index if not exists seen_match_pairs_agency_idx on seen_match_pairs (agency_id);

alter table seen_match_pairs enable row level security;

drop policy if exists "seen_match_pairs: select own agency" on seen_match_pairs;
drop policy if exists "seen_match_pairs: insert own agency" on seen_match_pairs;
drop policy if exists "seen_match_pairs: delete own agency" on seen_match_pairs;

create policy "seen_match_pairs: select own agency" on seen_match_pairs for select using (agency_id = current_agency_id());
create policy "seen_match_pairs: insert own agency" on seen_match_pairs for insert with check (agency_id = current_agency_id());
create policy "seen_match_pairs: delete own agency" on seen_match_pairs for delete using (agency_id = current_agency_id());
