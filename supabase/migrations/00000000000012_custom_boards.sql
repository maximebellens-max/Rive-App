-- Tableaux personnalisés : en plus des 4 tableaux fixes (prospects, vendeur,
-- acheteur, investisseur), une agence peut créer ses propres tableaux Kanban
-- de prospects, repris à l'identique du prototype Rive ("Tableaux
-- personnalisés"). Les 4 tableaux fixes deviennent des lignes "core" de
-- cette même table `boards`, avec leur identifiant historique (= l'ancienne
-- valeur de board_type), pour rester pleinement compatibles avec les
-- données existantes (leads.positions, pipeline_columns.board_type).

create table if not exists boards (
  id text not null default gen_random_uuid()::text,
  agency_id uuid not null references agencies (id) on delete cascade,
  name text not null,
  kind text not null default 'custom' check (kind in ('core', 'custom')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (agency_id, id)
);

create index if not exists boards_agency_id_idx on boards (agency_id);

alter table boards enable row level security;

drop policy if exists "boards: select own agency" on boards;
create policy "boards: select own agency" on boards for select using (agency_id = current_agency_id());

drop policy if exists "boards: insert own agency" on boards;
create policy "boards: insert own agency" on boards for insert with check (agency_id = current_agency_id());

drop policy if exists "boards: update own agency" on boards;
create policy "boards: update own agency" on boards for update using (agency_id = current_agency_id());

drop policy if exists "boards: delete own agency" on boards;
create policy "boards: delete own agency" on boards for delete using (agency_id = current_agency_id());

create or replace function seed_default_boards(p_agency_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into boards (id, agency_id, name, kind, position)
  values
    ('prospects', p_agency_id, 'Prospects', 'core', 0),
    ('vendeur', p_agency_id, 'Vendeurs', 'core', 1),
    ('acheteur', p_agency_id, 'Acheteurs', 'core', 2),
    ('investisseur', p_agency_id, 'Investisseurs', 'core', 3)
  on conflict (agency_id, id) do nothing;
end;
$$;

-- Backfill pour les agences existantes, avant de brancher la contrainte
-- ci-dessous (qui exige que chaque pipeline_columns.board_type existant
-- pointe déjà vers une ligne boards).
do $$
declare
  a record;
begin
  for a in select id from agencies loop
    perform seed_default_boards(a.id);
  end loop;
end $$;

-- Remplace l'ancienne contrainte "board_type in (4 valeurs figées)" par une
-- vraie clé étrangère vers boards : un tableau personnalisé supprimé
-- entraîne la suppression en cascade de ses colonnes.
do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'pipeline_columns'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%board_type%'
  loop
    execute format('alter table pipeline_columns drop constraint %I', con.conname);
  end loop;
end $$;

alter table pipeline_columns
  add constraint pipeline_columns_board_fkey
  foreign key (agency_id, board_type) references boards (agency_id, id) on delete cascade;

-- Supprime un tableau personnalisé (jamais un tableau "core") : retire sa clé
-- des positions de tous les prospects, puis supprime le tableau (ses colonnes
-- suivent automatiquement via la clé étrangère ci-dessus).
create or replace function delete_board(p_board_id text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_agency_id uuid := current_agency_id();
begin
  if v_agency_id is null then
    raise exception 'unauthorized';
  end if;

  if not exists (
    select 1 from boards where agency_id = v_agency_id and id = p_board_id and kind = 'custom'
  ) then
    raise exception 'board introuvable ou non supprimable';
  end if;

  update leads set positions = positions - p_board_id
  where agency_id = v_agency_id and positions ? p_board_id;

  delete from boards where agency_id = v_agency_id and id = p_board_id and kind = 'custom';
end;
$$;

grant execute on function delete_board(text) to authenticated;

-- Met à jour le trigger de création de compte pour aussi semer les 4
-- tableaux "core" d'une nouvelle agence (aucun changement sur la branche
-- invitation, ajoutée en migration 11).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency_id uuid;
  v_invite_token uuid;
  v_invite_id uuid;
  v_full_name text;
  v_agency_name text;
begin
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', '');
  v_invite_token := nullif(new.raw_user_meta_data->>'invite_token', '')::uuid;

  if v_invite_token is not null then
    select id, agency_id into v_invite_id, v_agency_id
    from public.agency_invites
    where token = v_invite_token
      and accepted_at is null
      and lower(email) = lower(new.email)
    limit 1;
  end if;

  if v_agency_id is not null then
    insert into public.profiles (id, agency_id, full_name, role)
    values (new.id, v_agency_id, v_full_name, 'agent');

    update public.agency_invites set accepted_at = now() where id = v_invite_id;

    return new;
  end if;

  v_agency_name := coalesce(new.raw_user_meta_data->>'agency_name', 'Mon agence');

  insert into public.agencies (name) values (v_agency_name) returning id into v_agency_id;

  insert into public.profiles (id, agency_id, full_name, role)
  values (new.id, v_agency_id, v_full_name, 'owner');

  perform public.seed_default_boards(v_agency_id);
  perform public.seed_default_pipeline_columns(v_agency_id);
  perform public.seed_default_templates(v_agency_id);

  return new;
end;
$$;
