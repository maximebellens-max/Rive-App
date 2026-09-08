-- Tableaux de suivi de prestations (Ameublement, Cuisine, Travaux), sur le
-- modèle des tableaux monday.com fournis par l'agence. Chaque ligne est
-- rattachée à un prospect/client existant (lead_id) plutôt que d'être une
-- entrée indépendante — on retrouve l'historique complet du client au même
-- endroit. Affichage prévu : tableau dense, édition en ligne (pas de fiche
-- détail séparée), d'où des colonnes à choix limité (check constraints)
-- plutôt que des statuts libres.

create table furnishing_projects (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  statut text not null default 'en_cours' check (statut in ('en_cours', 'termine')),
  paiement_client text not null default 'non_paye' check (paiement_client in ('non_paye', 'paye')),
  monteur text not null default '',
  marge_ht numeric,
  avant_projet text not null default 'a_faire' check (avant_projet in ('a_faire', 'valide')),
  architecte_paiement text not null default 'non_paye' check (architecte_paiement in ('non_paye', 'paye')),
  commentaire text not null default '',
  commande_ikea text not null default 'en_attente' check (commande_ikea in ('en_attente', 'commande', 'recu')),
  commande_ed text not null default 'en_attente' check (commande_ed in ('en_attente', 'commande', 'recu')),
  poseur text not null default '',
  date_livraison_ikea date,
  date_livraison_ed date,
  date_pose date,
  created_at timestamptz not null default now()
);

create index furnishing_projects_agency_id_idx on furnishing_projects (agency_id);
create index furnishing_projects_lead_id_idx on furnishing_projects (lead_id);

create table kitchen_projects (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  statut text not null default 'en_cours' check (statut in ('en_cours', 'termine')),
  paiement text not null default 'non_paye' check (paiement in ('non_paye', 'paye')),
  marge_ht numeric,
  conception text not null default 'a_faire' check (conception in ('a_faire', 'valide')),
  commentaire text not null default '',
  metre text not null default 'a_faire' check (metre in ('a_faire', 'realise')),
  commande_ikea text not null default 'en_attente' check (commande_ikea in ('en_attente', 'commande', 'recu')),
  poseur text not null default '',
  date_livraison date,
  date_pose_debut date,
  date_pose_fin date,
  finitions text not null default '',
  created_at timestamptz not null default now()
);

create index kitchen_projects_agency_id_idx on kitchen_projects (agency_id);
create index kitchen_projects_lead_id_idx on kitchen_projects (lead_id);

create table works_projects (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  conseiller uuid references profiles(id) on delete set null,
  adresse text not null default '',
  devis numeric,
  marge_ht numeric,
  commission text not null default 'non_paye' check (commission in ('non_paye', 'paye')),
  dossier_drive_url text not null default '',
  echeance_debut date,
  echeance_fin date,
  statut text not null default 'acompte_demande' check (statut in ('acompte_demande', 'en_cours', 'termine')),
  chk_demolition boolean not null default false,
  chk_electricite boolean not null default false,
  chk_plomberie boolean not null default false,
  chk_technique_cuisine boolean not null default false,
  chk_sdb_wc boolean not null default false,
  chk_peinture boolean not null default false,
  chk_sol boolean not null default false,
  chk_finitions boolean not null default false,
  created_at timestamptz not null default now()
);

create index works_projects_agency_id_idx on works_projects (agency_id);
create index works_projects_lead_id_idx on works_projects (lead_id);

alter table furnishing_projects enable row level security;
alter table kitchen_projects enable row level security;
alter table works_projects enable row level security;

drop policy if exists "furnishing_projects: select own agency" on furnishing_projects;
drop policy if exists "furnishing_projects: insert own agency" on furnishing_projects;
drop policy if exists "furnishing_projects: update own agency" on furnishing_projects;
drop policy if exists "furnishing_projects: delete own agency" on furnishing_projects;
create policy "furnishing_projects: select own agency" on furnishing_projects for select using (agency_id = current_agency_id());
create policy "furnishing_projects: insert own agency" on furnishing_projects for insert with check (agency_id = current_agency_id());
create policy "furnishing_projects: update own agency" on furnishing_projects for update using (agency_id = current_agency_id());
create policy "furnishing_projects: delete own agency" on furnishing_projects for delete using (agency_id = current_agency_id());

drop policy if exists "kitchen_projects: select own agency" on kitchen_projects;
drop policy if exists "kitchen_projects: insert own agency" on kitchen_projects;
drop policy if exists "kitchen_projects: update own agency" on kitchen_projects;
drop policy if exists "kitchen_projects: delete own agency" on kitchen_projects;
create policy "kitchen_projects: select own agency" on kitchen_projects for select using (agency_id = current_agency_id());
create policy "kitchen_projects: insert own agency" on kitchen_projects for insert with check (agency_id = current_agency_id());
create policy "kitchen_projects: update own agency" on kitchen_projects for update using (agency_id = current_agency_id());
create policy "kitchen_projects: delete own agency" on kitchen_projects for delete using (agency_id = current_agency_id());

drop policy if exists "works_projects: select own agency" on works_projects;
drop policy if exists "works_projects: insert own agency" on works_projects;
drop policy if exists "works_projects: update own agency" on works_projects;
drop policy if exists "works_projects: delete own agency" on works_projects;
create policy "works_projects: select own agency" on works_projects for select using (agency_id = current_agency_id());
create policy "works_projects: insert own agency" on works_projects for insert with check (agency_id = current_agency_id());
create policy "works_projects: update own agency" on works_projects for update using (agency_id = current_agency_id());
create policy "works_projects: delete own agency" on works_projects for delete using (agency_id = current_agency_id());