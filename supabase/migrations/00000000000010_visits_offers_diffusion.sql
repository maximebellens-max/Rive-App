-- Suivi des visites et des offres sur un mandat, et suivi de la diffusion
-- (portails + campagnes publicitaires), repris à l'identique du prototype.
alter table mandates add column if not exists diffusion jsonb not null default '{}'::jsonb;
alter table mandates add column if not exists ad_platform text not null default '';
alter table mandates add column if not exists ad_campaign text not null default '';
alter table mandates add column if not exists ad_date date;

create table if not exists mandate_visits (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  mandate_id uuid not null references mandates(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  buyer_name text not null default '',
  visit_date date,
  feedback text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists mandate_visits_mandate_id_idx on mandate_visits (mandate_id);
create index if not exists mandate_visits_lead_id_idx on mandate_visits (lead_id);

create table if not exists mandate_offers (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  mandate_id uuid not null references mandates(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  buyer_name text not null default '',
  amount numeric,
  offer_date date,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists mandate_offers_mandate_id_idx on mandate_offers (mandate_id);

alter table mandate_visits enable row level security;
alter table mandate_offers enable row level security;

drop policy if exists "mandate_visits: select own agency" on mandate_visits;
drop policy if exists "mandate_visits: insert own agency" on mandate_visits;
drop policy if exists "mandate_visits: update own agency" on mandate_visits;
drop policy if exists "mandate_visits: delete own agency" on mandate_visits;
create policy "mandate_visits: select own agency" on mandate_visits for select using (agency_id = current_agency_id());
create policy "mandate_visits: insert own agency" on mandate_visits for insert with check (agency_id = current_agency_id());
create policy "mandate_visits: update own agency" on mandate_visits for update using (agency_id = current_agency_id());
create policy "mandate_visits: delete own agency" on mandate_visits for delete using (agency_id = current_agency_id());

drop policy if exists "mandate_offers: select own agency" on mandate_offers;
drop policy if exists "mandate_offers: insert own agency" on mandate_offers;
drop policy if exists "mandate_offers: update own agency" on mandate_offers;
drop policy if exists "mandate_offers: delete own agency" on mandate_offers;
create policy "mandate_offers: select own agency" on mandate_offers for select using (agency_id = current_agency_id());
create policy "mandate_offers: insert own agency" on mandate_offers for insert with check (agency_id = current_agency_id());
create policy "mandate_offers: update own agency" on mandate_offers for update using (agency_id = current_agency_id());
create policy "mandate_offers: delete own agency" on mandate_offers for delete using (agency_id = current_agency_id());
