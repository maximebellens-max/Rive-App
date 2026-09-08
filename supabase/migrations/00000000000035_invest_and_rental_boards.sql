-- Deux nouveaux pipelines Kanban (glisser-déposer par étape, sur le modèle
-- de Mandats/Commissions) : "Projets en cours" côté Investisseur, et
-- "Location" pour le suivi des mises en location. Chaque ligne est rattachée
-- à un prospect/client existant (lead_id).

create table invest_projects (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  stage text not null default 'mandat' check (stage in ('mandat', 'compromis_signe', 'acte', 'travaux')),
  capacite_emprunt numeric,
  date_mandat date,
  echeance_notaire_debut date,
  echeance_notaire_fin date,
  date_compromis date,
  date_acte date,
  apporteur text not null default '',
  ca_ht numeric,
  commission_apporteur_pct numeric,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index invest_projects_agency_id_idx on invest_projects (agency_id);
create index invest_projects_lead_id_idx on invest_projects (lead_id);

-- locataires : tableau JSON [{ "nom": "...", "statut": "en_attente" | "en_place" | "edl" | "signature_bail" }, ...]
-- — le nombre de locataires varie (location seule, colocation à plusieurs
-- chambres), une colonne par locataire façon tableur n'a pas de sens ici.
create table rental_listings (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  assigned_to uuid references profiles(id) on delete set null,
  type_location text not null default 'longue_duree' check (type_location in ('longue_duree', 'colocation')),
  stage text not null default 'annonce' check (stage in ('annonce', 'visites', 'en_place', 'finalise')),
  honoraires_bailleur numeric,
  honoraires_locataire numeric,
  locataires jsonb not null default '[]'::jsonb,
  dossier_url text not null default '',
  commentaire text not null default '',
  created_at timestamptz not null default now()
);

create index rental_listings_agency_id_idx on rental_listings (agency_id);
create index rental_listings_lead_id_idx on rental_listings (lead_id);

alter table invest_projects enable row level security;
alter table rental_listings enable row level security;

drop policy if exists "invest_projects: select own agency" on invest_projects;
drop policy if exists "invest_projects: insert own agency" on invest_projects;
drop policy if exists "invest_projects: update own agency" on invest_projects;
drop policy if exists "invest_projects: delete own agency" on invest_projects;
create policy "invest_projects: select own agency" on invest_projects for select using (agency_id = current_agency_id());
create policy "invest_projects: insert own agency" on invest_projects for insert with check (agency_id = current_agency_id());
create policy "invest_projects: update own agency" on invest_projects for update using (agency_id = current_agency_id());
create policy "invest_projects: delete own agency" on invest_projects for delete using (agency_id = current_agency_id());

drop policy if exists "rental_listings: select own agency" on rental_listings;
drop policy if exists "rental_listings: insert own agency" on rental_listings;
drop policy if exists "rental_listings: update own agency" on rental_listings;
drop policy if exists "rental_listings: delete own agency" on rental_listings;
create policy "rental_listings: select own agency" on rental_listings for select using (agency_id = current_agency_id());
create policy "rental_listings: insert own agency" on rental_listings for insert with check (agency_id = current_agency_id());
create policy "rental_listings: update own agency" on rental_listings for update using (agency_id = current_agency_id());
create policy "rental_listings: delete own agency" on rental_listings for delete using (agency_id = current_agency_id());