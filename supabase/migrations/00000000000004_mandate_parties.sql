-- Les mandants (client(s) signataires) d'un mandat, avec leur état civil complet
-- tel qu'exigé sur l'acte (un mandat peut avoir plusieurs mandants, ex. un couple).

create table mandate_parties (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  mandate_id uuid not null references mandates(id) on delete cascade,
  position integer not null default 0,
  civility text not null default 'Monsieur',
  first_name text not null default '',
  last_name text not null default '',
  address text not null default '',
  birth_date date,
  birth_place text not null default '',
  nationality text not null default '',
  marital_status text not null default '',
  phone text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

create index mandate_parties_mandate_id_idx on mandate_parties (mandate_id);

alter table mandate_parties enable row level security;

create policy "mandate_parties: select own agency" on mandate_parties for select using (agency_id = current_agency_id());
create policy "mandate_parties: insert own agency" on mandate_parties for insert with check (agency_id = current_agency_id());
create policy "mandate_parties: update own agency" on mandate_parties for update using (agency_id = current_agency_id());
create policy "mandate_parties: delete own agency" on mandate_parties for delete using (agency_id = current_agency_id());
