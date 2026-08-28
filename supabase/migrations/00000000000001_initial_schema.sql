-- Rive : schéma initial multi-agences
-- Chaque agence (agency) est un tenant complètement isolé des autres via Row Level Security (RLS).
-- Un utilisateur authentifié appartient à une seule agence (via la table profiles) et ne peut
-- jamais lire ou écrire les données d'une autre agence, quel que soit le point d'entrée (API, SQL direct, etc.)
-- car l'isolation est appliquée par PostgreSQL lui-même, pas seulement par le code de l'application.

create extension if not exists "pgcrypto";

-- ---------- agences (tenants) ----------
create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

comment on table agencies is 'Une agence immobilière cliente de Rive. Chaque agence est un tenant isolé.';

-- ---------- profils utilisateurs (1 ligne par utilisateur Supabase Auth) ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  agency_id uuid not null references agencies(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'agent' check (role in ('owner', 'agent')),
  created_at timestamptz not null default now()
);

comment on table profiles is 'Profil applicatif de chaque utilisateur, rattaché à une agence. owner = a créé l''agence.';

create index profiles_agency_id_idx on profiles (agency_id);

-- ---------- prospects (leads) ----------
create table leads (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  assigned_to uuid references profiles(id) on delete set null,
  name text not null,
  phone text not null default '',
  email text not null default '',
  category text check (category in ('acheteur', 'vendeur', 'investisseur')),
  source text not null default '',
  campaign text not null default '',
  critere_type text not null default '',
  critere_lieu text not null default '',
  budget numeric,
  pieces_min integer,
  surface_min numeric,
  financement text not null default '',
  rendement_vise numeric,
  action_label text not null default '',
  action_date date,
  notes text not null default '',
  ai_relance_draft text not null default '',
  ai_briefing text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_agency_id_idx on leads (agency_id);
create index leads_category_idx on leads (agency_id, category);

-- ---------- historique des échanges avec un prospect ----------
create table lead_history_entries (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  entry_date date not null default current_date,
  text text not null,
  created_at timestamptz not null default now()
);

create index lead_history_lead_id_idx on lead_history_entries (lead_id);

-- ---------- mandats / dossiers bien ----------
create table mandates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  assigned_to uuid references profiles(id) on delete set null,
  type text not null default 'vente' check (type in ('vente', 'recherche')),
  address text not null default '',
  property_type text not null default '',
  surface numeric,
  pieces integer,
  price numeric,
  signed_date date,
  sold_date date,
  exclusivity text not null default '',
  duration_months integer,
  tacit_renewal boolean not null default false,
  renewal_notice_days integer not null default 15,
  condition text not null default '',
  dpe text not null default '',
  floor integer,
  has_elevator boolean not null default false,
  features jsonb not null default '{}'::jsonb,
  year_built integer,
  recent_works text not null default '',
  estimated_rent numeric,
  ai_summary text not null default '',
  notes text not null default '',
  stage text not null default 'en_cours',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mandates_agency_id_idx on mandates (agency_id);
create index mandates_lead_id_idx on mandates (lead_id);

-- ---------- comparables DVF saisis manuellement ----------
create table dvf_comparables (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  mandate_id uuid not null references mandates(id) on delete cascade,
  address text not null default '',
  sale_date date,
  surface numeric,
  price numeric,
  created_at timestamptz not null default now()
);

create index dvf_comparables_mandate_id_idx on dvf_comparables (mandate_id);

-- ---------- commissions ----------
create table commissions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  mandate_id uuid references mandates(id) on delete set null,
  amount numeric,
  paid_date date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index commissions_agency_id_idx on commissions (agency_id);
create index commissions_mandate_id_idx on commissions (mandate_id);

-- ---------- fonction utilitaire : l'agence de l'utilisateur courant ----------
create or replace function current_agency_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select agency_id from profiles where id = auth.uid()
$$;

-- ---------- activation de Row Level Security sur toutes les tables ----------
alter table agencies enable row level security;
alter table profiles enable row level security;
alter table leads enable row level security;
alter table lead_history_entries enable row level security;
alter table mandates enable row level security;
alter table dvf_comparables enable row level security;
alter table commissions enable row level security;

-- agencies : un utilisateur ne voit que sa propre agence
create policy "agency: select own" on agencies
  for select using (id = current_agency_id());
create policy "agency: update own (owner only)" on agencies
  for update using (
    id = current_agency_id()
    and exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- profiles : visibles par les membres de la même agence
create policy "profiles: select same agency" on profiles
  for select using (agency_id = current_agency_id());
create policy "profiles: update own row" on profiles
  for update using (id = auth.uid());

-- helper macro appliquée à chaque table métier : select/insert/update/delete
-- limités aux lignes dont agency_id correspond à l'agence de l'utilisateur connecté.
create policy "leads: select own agency" on leads for select using (agency_id = current_agency_id());
create policy "leads: insert own agency" on leads for insert with check (agency_id = current_agency_id());
create policy "leads: update own agency" on leads for update using (agency_id = current_agency_id());
create policy "leads: delete own agency" on leads for delete using (agency_id = current_agency_id());

create policy "lead_history: select own agency" on lead_history_entries for select using (agency_id = current_agency_id());
create policy "lead_history: insert own agency" on lead_history_entries for insert with check (agency_id = current_agency_id());
create policy "lead_history: update own agency" on lead_history_entries for update using (agency_id = current_agency_id());
create policy "lead_history: delete own agency" on lead_history_entries for delete using (agency_id = current_agency_id());

create policy "mandates: select own agency" on mandates for select using (agency_id = current_agency_id());
create policy "mandates: insert own agency" on mandates for insert with check (agency_id = current_agency_id());
create policy "mandates: update own agency" on mandates for update using (agency_id = current_agency_id());
create policy "mandates: delete own agency" on mandates for delete using (agency_id = current_agency_id());

create policy "dvf_comparables: select own agency" on dvf_comparables for select using (agency_id = current_agency_id());
create policy "dvf_comparables: insert own agency" on dvf_comparables for insert with check (agency_id = current_agency_id());
create policy "dvf_comparables: update own agency" on dvf_comparables for update using (agency_id = current_agency_id());
create policy "dvf_comparables: delete own agency" on dvf_comparables for delete using (agency_id = current_agency_id());

create policy "commissions: select own agency" on commissions for select using (agency_id = current_agency_id());
create policy "commissions: insert own agency" on commissions for insert with check (agency_id = current_agency_id());
create policy "commissions: update own agency" on commissions for update using (agency_id = current_agency_id());
create policy "commissions: delete own agency" on commissions for delete using (agency_id = current_agency_id());

-- ---------- création automatique de l'agence + profil à l'inscription ----------
-- Le nom de l'agence est transmis via les métadonnées du signup (voir app/onboarding).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_agency_id uuid;
  agency_name text;
begin
  agency_name := coalesce(new.raw_user_meta_data->>'agency_name', 'Mon agence');
  insert into agencies (name) values (agency_name) returning id into new_agency_id;
  insert into profiles (id, agency_id, full_name, role)
    values (new.id, new_agency_id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'owner');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
