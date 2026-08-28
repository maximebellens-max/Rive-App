-- Tableaux Kanban pour les prospects : colonnes personnalisables par agence,
-- et position de chaque prospect dans chaque tableau. Un prospect peut être
-- simultanément positionné sur "Prospects" et sur son tableau de catégorie
-- (vendeur / acheteur / investisseur) — les deux évoluent indépendamment.
create table if not exists pipeline_columns (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  board_type text not null check (board_type in ('prospects', 'vendeur', 'acheteur', 'investisseur')),
  name text not null,
  color text not null default 'slate',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists pipeline_columns_agency_board_idx on pipeline_columns (agency_id, board_type, position);

alter table leads add column if not exists positions jsonb not null default '{}'::jsonb;

alter table pipeline_columns enable row level security;

drop policy if exists "pipeline_columns: select own agency" on pipeline_columns;
drop policy if exists "pipeline_columns: insert own agency" on pipeline_columns;
drop policy if exists "pipeline_columns: update own agency" on pipeline_columns;
drop policy if exists "pipeline_columns: delete own agency" on pipeline_columns;

create policy "pipeline_columns: select own agency" on pipeline_columns for select using (agency_id = current_agency_id());
create policy "pipeline_columns: insert own agency" on pipeline_columns for insert with check (agency_id = current_agency_id());
create policy "pipeline_columns: update own agency" on pipeline_columns for update using (agency_id = current_agency_id());
create policy "pipeline_columns: delete own agency" on pipeline_columns for delete using (agency_id = current_agency_id());

-- ---------- seed des colonnes par défaut ----------
create or replace function seed_default_pipeline_columns(p_agency_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into pipeline_columns (agency_id, board_type, name, color, position) values
    (p_agency_id, 'prospects', 'Nouveau lead', 'slate', 0),
    (p_agency_id, 'prospects', 'Contacté', 'teal', 1),
    (p_agency_id, 'prospects', 'Qualifié', 'gold', 2),
    (p_agency_id, 'prospects', 'Sans suite', 'sand', 3),
    (p_agency_id, 'vendeur', 'Nouveau lead', 'slate', 0),
    (p_agency_id, 'vendeur', 'Contacté', 'teal', 1),
    (p_agency_id, 'vendeur', 'RDV 1 planifié', 'sage', 2),
    (p_agency_id, 'vendeur', 'RDV 2 planifié (estimation)', 'gold', 3),
    (p_agency_id, 'vendeur', 'Mandat signé', 'success', 4),
    (p_agency_id, 'acheteur', 'Nouveau lead', 'slate', 0),
    (p_agency_id, 'acheteur', 'Contacté', 'teal', 1),
    (p_agency_id, 'acheteur', 'RDV de visite', 'sage', 2),
    (p_agency_id, 'investisseur', 'Nouveau lead', 'slate', 0),
    (p_agency_id, 'investisseur', 'Qualifié', 'teal', 1),
    (p_agency_id, 'investisseur', 'RDV 1', 'sage', 2),
    (p_agency_id, 'investisseur', 'Validation de financement', 'gold', 3),
    (p_agency_id, 'investisseur', 'Mandat de recherche', 'success', 4);
end;
$$;

-- Backfill : les agences déjà créées avant cette migration n'ont pas encore de colonnes.
do $$
declare
  a record;
begin
  for a in select id from agencies loop
    if not exists (select 1 from pipeline_columns where agency_id = a.id) then
      perform seed_default_pipeline_columns(a.id);
    end if;
  end loop;
end $$;

-- Chaque prospect existant doit avoir une position sur le tableau Prospects
-- (première colonne) s'il n'en a pas déjà une.
do $$
declare
  l record;
  first_col uuid;
begin
  for l in select id, agency_id, category, positions from leads loop
    if l.positions->>'prospects' is null then
      select id into first_col from pipeline_columns
        where agency_id = l.agency_id and board_type = 'prospects'
        order by position asc limit 1;
      if first_col is not null then
        update leads set positions = positions || jsonb_build_object('prospects', first_col::text) where id = l.id;
      end if;
    end if;
    if l.category is not null and l.positions->>l.category is null then
      select id into first_col from pipeline_columns
        where agency_id = l.agency_id and board_type = l.category
        order by position asc limit 1;
      if first_col is not null then
        update leads set positions = positions || jsonb_build_object(l.category, first_col::text) where id = l.id;
      end if;
    end if;
  end loop;
end $$;

-- Étend le trigger de création de compte pour semer les colonnes par défaut
-- de la nouvelle agence en même temps que l'agence et le profil.
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
  perform seed_default_pipeline_columns(new_agency_id);
  return new;
end;
$$;
